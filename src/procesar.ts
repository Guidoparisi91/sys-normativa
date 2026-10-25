// Lo que comparten la corrida diaria (revisar.ts) y el armado de días
// anteriores (historial.ts): evaluar y explicar cada norma, completar las
// normas citadas, resumir con IA y guardar el informe del día.

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import type { AvisoBO } from './fuentes/boletinOficial.js';
import { leerComunicacion, type ComunicacionBCRA, type TipoCom } from './fuentes/bcraComunicaciones.js';
import type { Noticia } from './fuentes/bcraPrensa.js';
import type { NormaRentas } from './fuentes/rentasCordoba.js';
import { explicarAvisoBO, explicarComunicacion, explicarNoticia, explicarRentas, type Hallazgo } from './explicar.js';
import { enParalelo } from './http.js';
import { resumirTodos } from './ia.js';
import type { Resumen } from './informe.js';
import { dirigidaAPsp, evaluar } from './reglas.js';
import { normalizar } from './texto.js';

const ZONA = 'America/Argentina/Buenos_Aires';

export function hoyEnArgentina(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date());
}

export function ahoraEnArgentina(): string {
  const f = new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return f.format(new Date()).replace(',', ' a las');
}

/** Los días entre `desde` (sin incluir) y `hasta` (incluido), como AAAA-MM-DD. */
export function diasEntre(desde: string, hasta: string): string[] {
  const out: string[] = [];
  const d = new Date(`${desde}T12:00:00Z`);
  for (d.setUTCDate(d.getUTCDate() + 1); d.toISOString().slice(0, 10) <= hasta; d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10));
  return out;
}

/** "02/10/2026" -> "2026-10-02". */
export function fechaIso(ddmmaaaa: string): string {
  const [d, m, y] = ddmmaaaa.split('/');
  return `${y}-${m}-${d}`;
}

/** Lo encontrado en una corrida, con el texto completo de cada norma para la IA (no se guarda). */
export class Lote {
  hallazgos: Hallazgo[] = [];
  textos = new Map<Hallazgo, string>();

  agregar(h: Hallazgo, texto = ''): void {
    this.hallazgos.push(h);
    this.textos.set(h, texto);
  }

  avisosBO(avisos: AvisoBO[], fecha: string): void {
    for (const a of avisos) {
      const ev = evaluar(a.organismo, `${a.titulo}\n${a.texto}`);
      if (ev.nivel !== 'descartada') this.agregar(explicarAvisoBO(a, ev, fecha), a.texto);
    }
  }

  comunicacion(c: ComunicacionBCRA): void {
    // Sin organismo: que sea del BCRA no suma, lo son todas.
    const ev = evaluar('', c.texto);
    const dirigida = dirigidaAPsp(c.destinatarios);
    if (dirigida) {
      ev.nivel = 'alta';
      ev.motivos.unshift('dirigida a los proveedores de servicios de pago');
    } else if (ev.nivel === 'alta') {
      // Las del BCRA nombran a los PSP de pasada en muchas normas para bancos;
      // si no van dirigidas a ellos, que las mire una persona.
      ev.nivel = 'revisar';
    }
    if (ev.nivel !== 'descartada') this.agregar(explicarComunicacion(c, ev, dirigida), c.texto);
  }

  rentas(n: NormaRentas): void {
    // Todo lo que publica Rentas es de su área: suma como organismo de Ingresos Brutos.
    const ev = evaluar('Dirección General de Rentas', `${n.titulo}
${n.resumen}
${n.texto}`);
    if (ev.nivel !== 'descartada') this.agregar(explicarRentas(n, ev), `${n.resumen}
${n.texto}`);
  }

  noticia(n: Noticia): void {
    const ev = evaluar('', `${n.titulo}
${n.texto}`);
    // Un anuncio no obliga a nada: llega como mucho a "Para revisar".
    if (ev.nivel === 'alta') ev.nivel = 'revisar';
    if (ev.nivel !== 'descartada') this.agregar(explicarNoticia(n, ev), n.texto);
  }
}

// De qué trata cada comunicación citada, para que el lector sepa si vale la
// pena abrirla. Es lo que más ayuda en las "actualizaciones del texto
// ordenado", donde el cambio de fondo está en otra comunicación.
const MAX_CITADAS = 4;
const referencias = new Map<string, Promise<string>>();

function referenciaDe(url: string): Promise<string> {
  const m = /\/([ABC])(\d+)\.pdf$/.exec(url);
  if (!m) return Promise.resolve('');
  if (!referencias.has(url)) {
    referencias.set(
      url,
      leerComunicacion(m[1] as TipoCom, Number(m[2]))
        .then((x) => (x ? `${x.referencia.replace(/^[^:]*Circular[^:]*:\s*/i, '')} (${x.fecha})` : ''))
        .catch(() => ''),
    );
  }
  return referencias.get(url)!;
}

const ORDEN = { alta: 0, revisar: 1, descartada: 2 };
const ordenar = (hs: Hallazgo[]) => hs.sort((a, b) => ORDEN[a.evaluacion.nivel] - ORDEN[b.evaluacion.nivel] || b.evaluacion.puntaje - a.evaluacion.puntaje);

const INFORMES = new URL('../datos/informes/', import.meta.url);

/**
 * Una fuente que falló a la noche y se leyó en una corrida posterior no puede
 * quedar "en actualización" para siempre en el informe de aquel día: lo que
 * publicó se leyó (y figura en el informe del día en que se leyó).
 */
export async function limpiarDiasAnteriores(hoy: string, siguenFallando: Set<string>): Promise<void> {
  const desde = new Date(Date.parse(`${hoy}T12:00:00Z`) - 31 * 86_400_000).toISOString().slice(0, 10);
  for (const f of await readdir(INFORMES).catch(() => [] as string[])) {
    const dia = f.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(f) || dia >= hoy || dia < desde) continue;
    const r = JSON.parse(await readFile(new URL(f, INFORMES), 'utf8')) as Resumen;
    if (!r.enCurso?.length && !r.demoras?.length) continue;
    const sigue = (clave: string) => siguenFallando.has(clave);
    const enCurso = (r.enCurso ?? []).filter(sigue);
    const demoras = (r.demoras ?? []).filter((d) => sigue(d.split(':')[0]));
    if (enCurso.length === (r.enCurso ?? []).length && demoras.length === (r.demoras ?? []).length) continue;
    await writeFile(new URL(f, INFORMES), JSON.stringify({ ...r, enCurso, demoras }, null, 2) + '\n', 'utf8');
  }
}

/** Una comunicación del BCRA es la misma aunque llegue por la web del BCRA o por el Boletín Oficial. */
export function claveComunicacion(titulo: string): string | null {
  const m = /^Comunicaci[oó]n "([ABC])" (\d+)/.exec(titulo);
  return m ? `${m[1]}${m[2]}` : null;
}

/**
 * Una norma de Córdoba es la misma aunque venga del Boletín de Córdoba
 * ("Resolución General N° 2229") o del sitio de Rentas ("Resolución General
 * N° 2229/2026 – Padrón…"): tipo y número.
 */
export function claveCordoba(h: Pick<Hallazgo, 'titulo' | 'fuente' | 'emisor'>): string | null {
  if (!/c[oó]rdoba/i.test(`${h.fuente} ${h.emisor}`)) return null;
  const t = normalizar(h.titulo);
  const n = /n[°º]?\s*(\d+)/.exec(t)?.[1];
  if (!n) return null;
  const tipo = /general/.test(t) ? 'rg' : /normativa/.test(t) ? 'rn' : /\bsip\b/.test(t) || /ingresos publicos/i.test(normalizar(h.emisor)) ? 'sip' : /^ley/.test(t) ? 'ley' : /^decreto/.test(t) ? 'decreto' : null;
  return tipo ? `cba-${tipo}-${n}` : null;
}

// Un aviso del Boletín Oficial es el mismo leído de la web o del PDF del día: el número de su pie.
const claveNorma = (h: Hallazgo) => claveComunicacion(h.titulo) ?? claveCordoba(h) ?? (h.avisoBO ? `bo-${h.avisoBO}` : null);

/** Lo ya informado en otros días: links de cada norma y número de cada comunicación del BCRA. */
async function yaInformado(menos: string): Promise<Set<string>> {
  const claves = new Set<string>();
  let archivos: string[] = [];
  try {
    archivos = (await readdir(INFORMES)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f) && f !== `${menos}.json`);
  } catch {
    return claves;
  }
  for (const f of archivos) {
    const r = JSON.parse(await readFile(new URL(f, INFORMES), 'utf8')) as Resumen;
    for (const h of r.hallazgos) {
      const k = claveNorma(h);
      claves.add(h.url);
      if (k) claves.add(k);
    }
  }
  return claves;
}

/**
 * Completa y guarda el informe del día. Si ya había uno (la corrida de la
 * mañana), suma lo nuevo sin repetir: una norma es la misma si tiene el mismo
 * link. Devuelve el informe guardado y lo que apareció en esta corrida.
 */
export async function guardarDia(
  fecha: string,
  lote: Lote,
  revisado: string[],
  errores: string[],
  { demoras = [] as string[], enCurso = [] as string[] } = {},
): Promise<{ resumen: Resumen; nuevos: Hallazgo[] }> {
  let anterior: Resumen | undefined;
  try {
    anterior = JSON.parse(await readFile(new URL(`${fecha}.json`, INFORMES), 'utf8')) as Resumen;
  } catch {
    // Primera corrida del día.
  }
  const vistos = new Set(anterior?.hallazgos.flatMap((h) => [h.url, claveNorma(h) ?? h.url]));
  // Una comunicación que ya salió otro día (p. ej. en la web del BCRA y días
  // después en el Boletín Oficial) no se repite: queda donde apareció primero.
  const otrosDias = await yaInformado(fecha);
  const nuevos = ordenar(
    lote.hallazgos.filter((h) => {
      const k = claveNorma(h);
      return !vistos.has(h.url) && !(k && vistos.has(k)) && !otrosDias.has(h.url) && !(k && otrosDias.has(k));
    }),
  );

  await enParalelo(
    nuevos.flatMap((h) => h.relacionadas.slice(0, MAX_CITADAS)),
    2,
    async (e) => {
      e.detalle = await referenciaDe(e.url);
    },
  );
  // Resumen con IA (opcional) solo de lo nuevo. Si falla, el informe sale igual.
  revisado.push(await resumirTodos(nuevos, lote.textos));

  const resumen: Resumen = {
    fecha,
    generado: ahoraEnArgentina(),
    hallazgos: ordenar([...(anterior?.hallazgos ?? []), ...nuevos]),
    revisado,
    errores,
    demoras,
    enCurso,
  };
  const archivo = new URL(`${fecha}.json`, INFORMES);
  // Siempre se reescribe, aunque no haya nada nuevo: así una falla que ya se
  // resolvió deja de figurar en el informe del día. Un fin de semana o
  // feriado sin novedades también tiene su informe: si no, la página dice
  // "actualizado hoy" pero sigue mostrando el último día hábil.
  await mkdir(INFORMES, { recursive: true });
  await writeFile(archivo, JSON.stringify(resumen, null, 2) + '\n', 'utf8');
  return { resumen, nuevos };
}

/**
 * El Boletín de un día anterior leído recién ahora (porque esos días falló) o
 * vuelto a mirar: sus normas van al informe de ese día, no al de hoy, y la
 * falla deja de figurar ahí (Boletín del 21 al 23/10/2026, leído el 25/10),
 * igual que las de los otros días ya leídos (`leidos`), que cada corrida
 * fallida anotaba juntas.
 * Si no hay nada que cambiar, el informe de ese día queda como estaba.
 */
export async function completarDiaAnterior(dia: string, lote: Lote, lineaBoletin: string, leidos: string[]): Promise<Hallazgo[]> {
  let anterior: Resumen | undefined;
  try {
    anterior = JSON.parse(await readFile(new URL(`${dia}.json`, INFORMES), 'utf8')) as Resumen;
  } catch {
    // Ese día no corrió el monitor.
  }
  const delBoletin = (s: string) => s.startsWith(`Boletín Oficial del ${dia}`);
  const yaLeido = (s: string) => [dia, ...leidos].some((d) => s.startsWith(`Boletín Oficial del ${d}`));
  const fallaba = [...(anterior?.errores ?? []), ...(anterior?.demoras ?? []), ...(anterior?.enCurso ?? [])].some(yaLeido);
  if (anterior && !fallaba && !lote.hallazgos.length) return [];
  const revisado = [lineaBoletin, ...(anterior?.revisado ?? []).filter((r) => !delBoletin(r) && !r.startsWith('Resumen con IA'))];
  const { nuevos } = await guardarDia(dia, lote, revisado, (anterior?.errores ?? []).filter((e) => !yaLeido(e)), {
    demoras: (anterior?.demoras ?? []).filter((d) => !yaLeido(d)),
    enCurso: (anterior?.enCurso ?? []).filter((d) => !yaLeido(d)),
  });
  return nuevos;
}
