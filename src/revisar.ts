// Corrida diaria: revisa todas las fuentes, guarda el informe del día en
// datos/informes/, rearma la página (salida/index.html) y actualiza
// datos/estado.json. Si ya corrió ese día, suma lo nuevo al mismo informe.
//
//   npm run revisar                         -> Boletín Oficial de hoy + novedades del BCRA y de Rentas Córdoba
//   npm run revisar -- --fecha 2026-10-02   -> Boletín Oficial de ese día
//   npm run revisar -- --bcra-desde A=8480  -> relee el BCRA desde ese número (para probar)
//
// Una fuente que falla no frena a las demás: queda anotada en el informe,
// porque un "hoy no hubo nada" falso es el peor error posible.

import { writeFile } from 'node:fs/promises';
import { avisosDelDia } from './fuentes/boletinOficial.js';
import { recorrerBoletin } from './boletin.js';
import { listarRentas } from './fuentes/rentasCordoba.js';
import { leerNoticia, listarNoticias } from './fuentes/bcraPrensa.js';
import { buscarUltimo, existe, leerComunicacion, nuevasDesde, type TipoCom } from './fuentes/bcraComunicaciones.js';
import { leerEncabezado, TEXTOS_ORDENADOS } from './fuentes/bcraTextosOrdenados.js';
import { dejarAviso } from './aviso.js';
import { guardarEstado, leerEstado } from './estado.js';
import { explicarTextoOrdenado } from './explicar.js';
import { armarMarkdown } from './informe.js';
import { completarDiaAnterior, diasEntre, guardarDia, hoyEnArgentina, limpiarDiasAnteriores, Lote } from './procesar.js';
import { escribirSitio } from './sitio.js';

function argumento(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const manual = argumento('fecha');
const fecha = manual ?? hoyEnArgentina();
const estado = await leerEstado();
const lote = new Lote();
const revisado: string[] = [];
const errores: string[] = [];

// 1. Boletín Oficial (detalle en boletin.ts). Lo ya informado no se repite.
// Lo de días anteriores (que fallaron, o ayer vuelto a mirar) va al informe de su día.
const diasAnteriores = new Map<string, { lote: Lote; normas: number }>();
const bo = await recorrerBoletin('Boletín Oficial', estado, fecha, Boolean(manual), (dia) => avisosDelDia(dia.replaceAll('-', '')), (avisos, dia) => {
  if (dia === fecha) return lote.avisosBO(avisos, dia);
  const delDia = new Lote();
  delDia.avisosBO(avisos, dia);
  diasAnteriores.set(dia, { lote: delDia, normas: avisos.length });
});
revisado.push(...bo.revisado);
errores.push(...bo.errores);

// 2. Comunicaciones del BCRA
const forzado = argumento('bcra-desde');
if (forzado) {
  const [t, n] = forzado.split('=');
  estado.ultimaComunicacion[t as TipoCom] = Number(n) - 1;
}
const DIAS_PENDIENTE = 30;
type Pendiente = { numero: number; desde: string };
estado.pendientes ??= {};
for (const tipo of ['A', 'B', 'C'] as TipoCom[]) {
  try {
    const ultimo = estado.ultimaComunicacion[tipo];
    if (ultimo === undefined) {
      // Primera corrida: se fija el punto de partida sin informar el histórico.
      estado.ultimaComunicacion[tipo] = await buscarUltimo(tipo);
      revisado.push(`BCRA "${tipo}": primera corrida, se arranca desde la ${tipo} ${estado.ultimaComunicacion[tipo]}.`);
      continue;
    }
    // Control: la última leída tiene que seguir en su lugar. Si no está, el
    // BCRA cambió dónde publica y "0 nuevas" sería falso.
    if (!forzado && !(await existe(tipo, ultimo))) {
      throw new Error(`no se encuentra la ${tipo} ${ultimo}, que ya se había leído: el BCRA puede haber cambiado la dirección de sus PDF`);
    }
    // Números salteados en corridas anteriores: ¿se publicaron ahora?
    const pendientes: Pendiente[] = estado.pendientes[tipo] ?? [];
    const siguen: Pendiente[] = [];
    for (const p of pendientes) {
      const c = await leerComunicacion(tipo, p.numero);
      if (c) {
        lote.comunicacion(c);
        revisado.push(`BCRA: apareció la ${tipo} ${p.numero}, que estaba salteada desde el ${p.desde}.`);
      } else if (diasEntre(p.desde, fecha).length < DIAS_PENDIENTE) {
        siguen.push(p);
      }
    }
    const { nuevas, salteados } = await nuevasDesde(tipo, ultimo);
    for (const c of nuevas) {
      lote.comunicacion(c);
      estado.ultimaComunicacion[tipo] = c.numero;
    }
    siguen.push(...salteados.map((numero) => ({ numero, desde: fecha })));
    estado.pendientes[tipo] = siguen;
    revisado.push(
      `BCRA "${tipo}": ${nuevas.length} nuevas (última leída: ${tipo} ${estado.ultimaComunicacion[tipo]})` +
        (siguen.length ? `; se siguen buscando ${siguen.map((p) => `${tipo} ${p.numero}`).join(', ')}, salteadas.` : '.'),
    );
  } catch (e) {
    errores.push(`BCRA "${tipo}": ${(e as Error).message}`);
  }
}

// 3. Textos ordenados del BCRA
let cambiados = 0;
for (const { archivo, tema, temaSys } of TEXTOS_ORDENADOS) {
  try {
    const t = await leerEncabezado(archivo, tema);
    if (!t || !t.ultimaComunicacion) {
      errores.push(`Texto ordenado "${tema}": no se pudo leer la carátula.`);
      continue;
    }
    const antes = estado.textosOrdenados[archivo];
    if (antes && antes !== t.ultimaComunicacion) {
      cambiados++;
      lote.agregar(explicarTextoOrdenado({ ...t, temaSys }, antes, t.ultimaComunicacion));
    }
    estado.textosOrdenados[archivo] = t.ultimaComunicacion;
  } catch (e) {
    errores.push(`Texto ordenado "${tema}": ${(e as Error).message}`);
  }
}
revisado.push(`Textos ordenados del BCRA: ${TEXTOS_ORDENADOS.length} temas, ${cambiados} cambiaron.`);

// 4. Rentas Córdoba (Ingresos Brutos de la provincia donde SYS tiene su base):
// las normas que no se vieron todavía. Si toda la página es nueva, se miran
// las siguientes para no perder ninguna.
const MAX_PAGINAS_RENTAS = 5;
const VISTAS_GUARDADAS = 300;
try {
  const vistas = new Set(estado.rentasVistas ?? []);
  const primera = await listarRentas(1);
  if (!estado.rentasVistas) {
    // Primera corrida: se fija el punto de partida sin informar el histórico.
    estado.rentasVistas = primera.map((n) => n.id);
    revisado.push(`Rentas Córdoba: primera corrida, se arranca desde "${primera[0]?.titulo}".`);
  } else {
    const nuevas = primera.filter((n) => !vistas.has(n.id));
    let todasNuevas = nuevas.length === primera.length;
    for (let p = 2; p <= MAX_PAGINAS_RENTAS && todasNuevas; p++) {
      const pagina = await listarRentas(p);
      const mas = pagina.filter((n) => !vistas.has(n.id));
      nuevas.push(...mas);
      todasNuevas = mas.length === pagina.length;
    }
    if (todasNuevas) errores.push(`Rentas Córdoba: hay más de ${MAX_PAGINAS_RENTAS} páginas de normas nuevas; las más viejas pueden no haberse revisado.`);
    for (const n of nuevas) lote.rentas(n);
    estado.rentasVistas = [...nuevas.map((n) => n.id), ...estado.rentasVistas].slice(0, VISTAS_GUARDADAS);
    revisado.push(`Rentas Córdoba: ${nuevas.length} normas nuevas.`);
  }
} catch (e) {
  errores.push(`Rentas Córdoba: ${(e as Error).message}`);
}

// 5. Prensa del BCRA: las noticias que no se vieron todavía.
try {
  const vistas = new Set(estado.prensaVistas ?? []);
  const primera = await listarNoticias();
  if (!estado.prensaVistas) {
    // Primera corrida: se fija el punto de partida sin informar el histórico.
    estado.prensaVistas = primera.map((n) => n.id);
    revisado.push(`Prensa del BCRA: primera corrida, se arranca desde "${primera[0].titulo}".`);
  } else {
    const nuevas = primera.filter((n) => !vistas.has(n.id));
    for (const n of nuevas) lote.noticia(await leerNoticia(n));
    // Si todas las del listado son nuevas, puede haber más viejas sin ver.
    if (nuevas.length === primera.length) {
      errores.push(`Prensa del BCRA: las ${primera.length} noticias del listado son nuevas; puede haber otras anteriores sin revisar (mirar https://www.bcra.gob.ar/noticias/).`);
    }
    estado.prensaVistas = [...nuevas.map((n) => n.id), ...(estado.prensaVistas ?? [])].slice(0, VISTAS_GUARDADAS);
    revisado.push(`Prensa del BCRA: ${nuevas.length} noticias nuevas.`);
  }
} catch (e) {
  errores.push(`Prensa del BCRA: ${(e as Error).message}`);
}

// 6. Guardar, rearmar la página y dejar el aviso si hay algo nuevo.
// Las fallas le llegan a Guido por mail. El cliente no ve cortes pasajeros:
// en su página una fuente figura demorada solo si lleva más de 24 h fallando,
// y con un texto formal, nunca el error técnico.
const DEMORA_VISIBLE = 24 * 3_600_000;
const claveFalla = (e: string) => e.split(':')[0];
const ahora = new Date().toISOString();
const fallasDesde: Record<string, string> = {};
for (const e of errores) fallasDesde[claveFalla(e)] = estado.fallasDesde?.[claveFalla(e)] ?? ahora;
if (!manual) estado.fallasDesde = fallasDesde;
const demoras = [...new Set(errores.map(claveFalla))]
  .filter((k) => Date.parse(ahora) - Date.parse(fallasDesde[k]) >= DEMORA_VISIBLE)
  .map((k) => `${k}: la consulta se encuentra demorada; se completará automáticamente en la próxima actualización.`);
// Las que fallan hace menos de 24 h: el cliente las ve "en actualización",
// nunca como revisadas.
const enCurso = [...new Set(errores.map(claveFalla))].filter((k) => !demoras.some((d) => d.startsWith(`${k}:`)));
const { resumen, nuevos } = await guardarDia(fecha, lote, revisado, errores, { demoras, enCurso });
for (const [dia, { lote: delDia, normas }] of diasAnteriores) {
  const linea = normas ? `Boletín Oficial del ${dia}: ${normas} normas.` : `Boletín Oficial del ${dia}: no hubo edición.`;
  nuevos.push(...(await completarDiaAnterior(dia, delDia, linea, [...diasAnteriores.keys()])));
}
if (!manual) await limpiarDiasAnteriores(fecha, new Set(Object.keys(fallasDesde)));
await escribirSitio(resumen.generado);

// Una fuente caída se avisa por mail cuando empieza a fallar, no en cada
// corrida (la página la sigue mostrando en rojo mientras dure).
const fuenteDe = (e: string) => e.split(':')[0].replace(/ del \d{4}-\d{2}-\d{2}$/, '');
const yaAvisadas = new Set(manual ? [] : (estado.fallasAvisadas ?? []));
const erroresNuevos = errores.filter((e) => !yaAvisadas.has(fuenteDe(e)));
if (!manual) estado.fallasAvisadas = [...new Set(errores.map(fuenteDe))];
if (!manual) estado.ultimaCorrida = ahora;
await guardarEstado(estado);
await dejarAviso(fecha, nuevos, erroresNuevos);

console.log(armarMarkdown(resumen));
console.log(`\n${nuevos.length} normas nuevas en esta corrida. Página del monitor: salida/index.html`);
// Si no se pudo leer el Boletín o el BCRA, el workflow vuelve a correr en
// 15 minutos, y así hasta que ande (ver monitor.yml).
if (process.env.REINTENTAR_ARCHIVO && errores.some((e) => /^(Boletín Oficial|BCRA|Texto ordenado)/.test(e))) {
  await writeFile(process.env.REINTENTAR_ARCHIVO, errores.join('\n'), 'utf8');
}
if (errores.length) process.exitCode = 1;
