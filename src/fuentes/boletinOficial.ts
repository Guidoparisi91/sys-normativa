// Boletín Oficial de la República Argentina, primera sección (legislación y
// avisos oficiales). La lista del día es HTML plano y completa, sin paginar:
// https://www.boletinoficial.gob.ar/seccion/primera/AAAAMMDD
// Cada aviso trae el texto completo de la norma en su página de detalle.
//
// Desde el 22/10/2026 el sitio no acepta conexiones de fuera del país (probado
// desde EE. UU., Brasil, Alemania, España y Francia), y GitHub corre en EE. UU.
// Si no conecta, se lee el PDF de la sección del día que el mismo Boletín
// publica en su repositorio de la Blockchain Federal Argentina, que sí se ve
// desde afuera: https://otslist.boletinoficial.gob.ar/ots/?date_filter=DD-MM-AAAA

import { extractText, getDocumentProxy } from 'unpdf';
import { enParalelo, pedir, pedirTexto } from '../http.js';
import { decodificarEntidades, htmlATexto } from '../texto.js';

const BASE = 'https://www.boletinoficial.gob.ar';
const REPOSITORIO = 'https://otslist.boletinoficial.gob.ar';

export interface AvisoBO {
  id: string;
  url: string;
  organismo: string;
  titulo: string;
  texto: string;
  /** De qué boletín sale, si no es el nacional (p. ej. "Boletín Oficial de Córdoba"). */
  boletin?: string;
  /** Número del pie ("e. 23/10/2026 N° 79166/26 v. ..."): el mismo en la web y en el PDF. */
  numero?: string;
}

interface Renglon {
  id: string;
  ruta: string;
  organismo: string;
  titulo: string;
}

function limpiar(s: string): string {
  return decodificarEntidades(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function parsearLista(html: string): Renglon[] {
  const out: Renglon[] = [];
  const re = /<a href="(\/detalleAviso\/primera\/(\d+)\/\d{8})"[^>]*>([\s\S]*?)<\/a>/g;
  for (const m of html.matchAll(re)) {
    const organismo = /<p class="item">([\s\S]*?)<\/p>/.exec(m[3]);
    if (!organismo) continue;
    const detalles = [...m[3].matchAll(/<p class="item-detalle"[^>]*>([\s\S]*?)<\/p>/g)].map((d) => limpiar(d[1]));
    out.push({ id: m[2], ruta: m[1], organismo: limpiar(organismo[1]), titulo: detalles[0] ?? '' });
  }
  // La misma página repite enlaces (p. ej. en el sumario): uno por aviso.
  return [...new Map(out.map((r) => [r.id, r])).values()];
}

export function parsearCuerpo(html: string): string {
  const inicio = html.indexOf('id="cuerpoDetalleAviso"');
  if (inicio === -1) return '';
  const resto = html.slice(inicio);
  // El cuerpo termina donde empiezan los avisos relacionados / pie de página.
  const fin = resto.search(/<div[^>]+id="(anexos|avisosRelacionados)"|<footer/);
  return htmlATexto('<div ' + (fin === -1 ? resto : resto.slice(0, fin)));
}

// El pie con que termina cada aviso: "e. 23/10/2026 N° 79166/26 v. 23/10/2026".
const PIE = /^e\.\s*\d{2}\/\d{2}\/\d{4}\s*N[°º]\s*(\d+\/\d+)\s*v\.\s*\d{2}\/\d{2}\/\d{4}\s*$/gm;

export function numeroDeAviso(texto: string): string | undefined {
  return new RegExp(PIE.source, 'm').exec(texto)?.[1];
}

/** fecha en formato AAAAMMDD. Devuelve [] si ese día no hubo edición. */
export async function avisosDelDia(fecha: string): Promise<AvisoBO[]> {
  let web: Response;
  try {
    // Un día sin edición (fin de semana, feriado) el sitio redirige a la portada.
    // La redirección no se sigue: desde GitHub la portada falla ("fetch failed",
    // domingo 4/10/2026) y no hace falta leerla. Dos intentos: si no conecta,
    // lo más probable es el bloqueo a conexiones del exterior y se va al PDF.
    web = await pedir(`${BASE}/seccion/primera/${fecha}`, 2, { seguirRedireccion: false });
  } catch (e) {
    try {
      return await avisosDelPdf(fecha);
    } catch (e2) {
      throw new Error(`${(e as Error).message}; tampoco se pudo leer el PDF del día: ${(e2 as Error).message}`);
    }
  }
  if (web.status >= 300 && web.status < 400) return [];
  if (!web.ok) throw new Error(`HTTP ${web.status} al pedir la sección del día`);
  const lista = parsearLista(await web.text());
  const delDia = lista.filter((r) => r.ruta.endsWith(`/${fecha}`));
  // La página del día respondió pero no se reconoce ningún aviso: lo más
  // probable es que haya cambiado el formato. Nunca se informa como "no hubo
  // edición", porque eso escondería las normas del día.
  if (!delDia.length) throw new Error('la página del día respondió, pero no se pudo leer ningún aviso (¿cambió el formato del sitio?)');
  // Pedidos en paralelo: 4 en la corrida diaria; los estudios pueden pedir más.
  const avisos = await enParalelo(delDia, Number(process.env.BO_PARALELO) || 4, async (r) => {
    const texto = parsearCuerpo(await pedirTexto(BASE + r.ruta));
    return { id: r.id, url: BASE + r.ruta, organismo: r.organismo, titulo: r.titulo, texto, numero: numeroDeAviso(texto) };
  });
  // Lo mismo con el texto de cada aviso: sin texto, el filtro solo vería el título.
  const sinTexto = avisos.filter((a) => !a.texto).length;
  if (sinTexto > avisos.length / 4) throw new Error(`no se pudo leer el texto de ${sinTexto} de ${avisos.length} avisos (¿cambió el formato del sitio?)`);
  return avisos;
}

/** Los PDF de la primera sección de ese día en el repositorio. [] si ese día no hubo edición. */
export function parsearRepositorio(html: string, fecha: string): string[] {
  // Sin el buscador por fecha no es la página esperada: "no hubo edición"
  // sería falso.
  if (!html.includes('date_filter')) throw new Error('el repositorio de PDF respondió con una página desconocida (¿cambió el formato?)');
  const dia = `${fecha.slice(6, 8)}-${fecha.slice(4, 6)}-${fecha.slice(0, 4)}`;
  const inicio = html.indexOf(`<h4 class="text-left">${dia}</h4>`);
  if (inicio === -1) return [];
  const resto = html.slice(inicio + 10);
  const bloque = resto.slice(0, resto.search(/<h4 class="text-left">|$/));
  const pdfs: string[] = [];
  for (const m of bloque.matchAll(/<tr>\s*<td>\s*(\d+)\s*<\/td>[\s\S]*?href="(\/ots\/download\/[0-9a-f]+\/0\/)"/g)) {
    if (m[1] === '1') pdfs.push(REPOSITORIO + m[2]);
  }
  if (!pdfs.length) throw new Error(`el repositorio lista la edición del ${dia}, pero no se encontró el PDF de la primera sección (¿cambió el formato?)`);
  return pdfs;
}

// Títulos de los apartados de la sección ("Decretos", "Avisos Oficiales"...),
// que no son parte de ningún aviso.
const APARTADO = /^(?:[A-ZÁÉÍÓÚ][a-záéíóúñ]+)(?: (?:de|y|del|[A-ZÁÉÍÓÚ][a-záéíóúñ]+))*$|^(?:NUEVOS|ANTERIORES)$/;
const MAYUSCULAS = (l: string) => /[A-ZÁÉÍÓÚÑ]/.test(l) && !/[a-záéíóúñ]/.test(l);
// "Decreto 1253/2026", "Resolución General 5908/2026", "Ley 27.826", "Disposición Sintetizada 11447/2026".
const NOMBRE_NORMA = /^[A-ZÁÉÍÓÚ][a-záéíóúñ]+(?: [A-Za-záéíóúñ]+){0,3} [\d.]+(?:\/\d{4})?$/;

/**
 * Los avisos del PDF de la sección, en orden. Cada aviso termina con su pie
 * ("e. ... N° ... v. ..."); arriba de todo van el organismo en mayúsculas y,
 * si es una norma, su nombre ("Decreto 1253/2026").
 */
export function parsearPdf(paginas: string[]): { organismo: string; titulo: string; texto: string; numero: string }[] {
  // El sumario dice en qué página arranca el primer aviso.
  const primera = Number(/\.{5,}\s*(\d+)\s*$/m.exec(paginas.slice(1, 6).join('\n'))?.[1]);
  if (!primera || primera > paginas.length) throw new Error('no se encontró el sumario del PDF (¿cambió el formato?)');
  const cuerpo = paginas
    .slice(primera - 1)
    .join('\n')
    .replace(/#[IF]\d+[IF]#/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^BOLET[IÍ]N OFICIAL N[º°] [\d.]+ - Primera Secci[oó]n/.test(l))
    .join('\n');
  const avisos = [];
  let desde = 0;
  for (const m of cuerpo.matchAll(PIE)) {
    const lineas = cuerpo.slice(desde, m.index + m[0].length).split('\n');
    desde = m.index + m[0].length + 1;
    let i = 0;
    while (i < lineas.length - 1 && APARTADO.test(lineas[i]) && !NOMBRE_NORMA.test(lineas[i])) i++;
    const organismo: string[] = [];
    while (i < lineas.length - 1 && organismo.length < 4 && MAYUSCULAS(lineas[i])) organismo.push(lineas[i++]);
    const titulo = NOMBRE_NORMA.test(lineas[i]) ? lineas[i++] : '';
    avisos.push({ organismo: organismo.join(' - '), titulo: titulo || 'Aviso Oficial', texto: lineas.slice(i).join('\n'), numero: m[1] });
  }
  if (!avisos.length) throw new Error('el PDF del día no tiene ningún aviso reconocible (¿cambió el formato?)');
  return avisos;
}

/** El día leído del PDF. El link de cada aviso es la sección del día en la web. */
async function avisosDelPdf(fecha: string): Promise<AvisoBO[]> {
  const dia = `${fecha.slice(6, 8)}-${fecha.slice(4, 6)}-${fecha.slice(0, 4)}`;
  const pdfs = parsearRepositorio(await pedirTexto(`${REPOSITORIO}/ots/?date_filter=${dia}`), fecha);
  const avisos: AvisoBO[] = [];
  for (const url of pdfs) {
    const res = await pedir(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} al pedir el PDF del día`);
    const { text } = await extractText(await getDocumentProxy(new Uint8Array(await res.arrayBuffer())), { mergePages: false });
    for (const a of parsearPdf(text)) {
      avisos.push({ ...a, id: `pdf-${a.numero}`, url: `${BASE}/seccion/primera/${fecha}#aviso-${a.numero.replace('/', '-')}` });
    }
  }
  return avisos;
}
