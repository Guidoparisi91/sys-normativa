// Explica cada norma con su propio texto, sin IA: qué cambia, para qué, desde
// cuándo, qué otras normas cita, dónde nombra a SYS y cómo le afecta.
// Todo sale de recortes literales de la norma, así que se puede verificar.

import type { AvisoBO } from './fuentes/boletinOficial.js';
import type { Noticia } from './fuentes/bcraPrensa.js';
import type { NormaRentas } from './fuentes/rentasCordoba.js';
import { parsearEncabezado, type ComunicacionBCRA, type TipoCom } from './fuentes/bcraComunicaciones.js';
import type { ResumenIa } from './ia.js';
import { dirigidaAPsp, type Evaluacion } from './reglas.js';
import { TEMAS, type Tema } from './temas.js';
import { normalizar } from './texto.js';

export interface Enlace {
  texto: string;
  url: string;
  /** De qué trata la norma enlazada, si se pudo averiguar. */
  detalle?: string;
}

export interface Hallazgo {
  fuente: string;
  /** Quién la firma: organismo o "BCRA". */
  emisor: string;
  /** "Comunicación "A" 8488", "Resolución General 5804/2025". */
  titulo: string;
  /** De qué trata, en una línea. */
  asunto: string;
  fecha: string;
  url: string;
  /** "Norma nueva", "Actualización del texto ordenado", etc. */
  tipo: string;
  queCambia: string;
  paraQue: string;
  tema: Tema;
  comoAfecta: string[];
  queHacer: string;
  fechasClave: string[];
  dondeNombraASys: string;
  relacionadas: Enlace[];
  evaluacion: Evaluacion;
  /** Número de aviso del Boletín Oficial ("79166/26"): la misma norma leída de la web o del PDF. */
  avisoBO?: string;
  /** Resumen en dos líneas hecho con IA, si estaba activada y respondió. */
  resumenIa?: ResumenIa;
}

export interface Citada {
  tipo: TipoCom;
  numero: number;
}

export const urlComunicacion = (c: Citada) => `https://www.bcra.gob.ar/archivos/Pdfs/comytexord/${c.tipo}${c.numero}.pdf`;

const plano = (s: string) => s.replace(/\s+/g, ' ').trim();
// Palabras cortadas al final de renglón en los PDF: "Servi- cios" -> "Servicios".
const unirCortes = (s: string) => s.replace(/(\p{Ll})- (\p{Ll})/gu, '$1$2');

/** Recorta en el último fin de oración antes de `max`, o en la última palabra. */
export function recortar(s: string, max: number): string {
  if (s.length <= max) return s;
  const corte = s.slice(0, max);
  const fin = corte.lastIndexOf('. ');
  return fin > max * 0.5 ? corte.slice(0, fin + 1) : corte.slice(0, corte.lastIndexOf(' ')) + '…';
}

function oraciones(texto: string): string[] {
  return texto
    .split(/\n+|(?<=[.;:])\s+(?=[A-ZÁÉÍÓÚÑ“"«])/)
    .map(plano)
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Piezas que se buscan en cualquier norma

const DISPARA_FECHA = /entrar[aá]n? en vigencia|vigencia|a partir del?|desde el|hasta el|vencimiento|venc[ea]n?|plazo|feriado|no m[aá]s all[aá]|antes del/i;
const TIENE_FECHA =
  /\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}(?:º|°)? de (?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?: de \d{4})?|(?:mes|meses) de \w+ de \d{4}|d[ií]a (?:siguiente al )?de su publicaci[oó]n|\d+ \(?[\w ]*\)? d[ií]as/i;

// La fecha tiene que estar cerca de la palabra que la dispara: si no, se cuelan
// fechas de normas citadas ("Resolución N° 4.367 de fecha 19 de diciembre de 2018").
const FECHA_CLAVE = new RegExp(`(?:${DISPARA_FECHA.source})[^.;]{0,60}?(?:${TIENE_FECHA.source})`, 'i');

/** Oraciones que dicen desde cuándo rige algo o hasta cuándo hay plazo. */
export function fechasClave(texto: string, max = 3): string[] {
  const out: string[] = [];
  for (const o of oraciones(texto)) {
    const m = FECHA_CLAVE.exec(o);
    if (m) {
      const sinArticulo = o.replace(/^ART[IÍ]CULO \d+\s*(?:º|°)?[.:]?\s*-?\s*/i, '');
      // Oración larga: se muestra el tramo de la fecha, no el principio.
      const desde = sinArticulo.length <= 260 ? 0 : Math.max(0, sinArticulo.indexOf(m[0]) - 100);
      const limpia = desde ? '…' + recortar(sinArticulo.slice(sinArticulo.indexOf(' ', desde) + 1), 240) : recortar(sinArticulo, 260);
      if (!out.includes(limpia)) out.push(limpia);
    }
    if (out.length === max) break;
  }
  return out;
}

// Nombran la actividad de SYS (mismo criterio que los términos fuertes de
// reglas.ts, en versión que se puede ubicar en el texto original). Primero se
// busca la actividad en sí; los números de ley, solo si no aparece.
const NOMBRA_A_SYS = [
  /proveedor(?:es)? de servicios de pago|cuentas? de pago|billeteras? (?:virtual|digital|electr[oó]nica)s?|\bPSPCP\b|\bPSP\b|servicios de cobros? y\/?o pagos?|SIRCUPA|clave virtual uniforme|\bCVU\b/i,
  /\bley(es)?\b[^.\n]{0,40}(25\.?413|27\.?739)|activos virtuales/i,
];

// Tablas y planes de cuentas de los anexos: más números que palabras.
const esTabla = (s: string) => (s.match(/\d/g)?.length ?? 0) > s.length * 0.12;

/** El pasaje donde la norma nombra la actividad de SYS. */
export function dondeNombraASys(texto: string): string {
  const lista = oraciones(texto);
  for (const re of NOMBRA_A_SYS) {
    for (const o of lista) {
      const m = re.exec(o);
      if (!m) continue;
      // Oración muy larga: una ventana alrededor de la mención.
      const desde = o.length <= 320 ? 0 : Math.max(0, m.index - 140);
      let trozo = o.length <= 320 ? o : o.slice(desde, desde + 320);
      if (esTabla(trozo)) continue;
      if (o.length > 320) trozo = (desde > 0 ? '…' + trozo.slice(trozo.indexOf(' ') + 1) : trozo).replace(/\s\S*$/, '') + '…';
      return trozo;
    }
  }
  return '';
}

/** Comunicaciones del BCRA citadas en un texto ("Comunicaciones A 8330, A 8331 y A 8464"). */
export function comunicacionesCitadas(texto: string, excepto?: Citada): Citada[] {
  const out = new Map<string, Citada>();
  for (const m of texto.matchAll(/Comunicaci[oó]n(?:es)?\s+((?:["“]?[ABC]["”]?\s*\d{3,6}\s*(?:,|\by\b)?\s*)+)/gi)) {
    for (const x of m[1].matchAll(/([ABC])["”]?\s*(\d{3,6})/g)) {
      const c = { tipo: x[1] as TipoCom, numero: Number(x[2]) };
      if (excepto && c.tipo === excepto.tipo && c.numero === excepto.numero) continue;
      out.set(`${c.tipo}${c.numero}`, c);
    }
  }
  return [...out.values()];
}

// ---------------------------------------------------------------------------
// Comunicaciones del BCRA

/** La carta de la comunicación, entre "Nos dirigimos a Uds." y la firma: el resumen que hace el propio BCRA. */
export function cartaBcra(texto: string): string {
  const t = unirCortes(plano(texto));
  // Termina en el saludo; la firma ("BANCO CENTRAL…") solo si no hay saludo,
  // porque el nombre del banco aparece también dentro de la carta.
  const m =
    /(Nos dirigimos a (?:Uds|ustedes)\.?[\s\S]*?)Saludamos a (?:Uds|ustedes)/i.exec(t) ??
    /(Nos dirigimos a (?:Uds|ustedes)\.?[\s\S]*?)BANCO CENTRAL DE LA REP[UÚ]BLICA ARGENTINA/.exec(t);
  if (!m) return '';
  return m[1]
    // Instrucciones de navegación del sitio, iguales en todas las comunicaciones.
    .replace(/Se recuerda que en la p[aá]gina de esta Instituci[oó]n[\s\S]*?\((?:tachado y negrita)\)\.?/i, '')
    .trim();
}

// La fórmula de apertura de la carta, pasada a una frase directa.
const APERTURAS: [RegExp, string][] = [
  [/^Nos dirigimos a (?:Uds|ustedes)\.? para (?:comunicarles|informarles|hacerles saber) que (?:esta Instituci[oó]n )?/i, 'El BCRA '],
  [/^Nos dirigimos a (?:Uds|ustedes)\.? para comunicarles /i, 'El BCRA comunica '],
  [/^Nos dirigimos a (?:Uds|ustedes)\.? para informarles /i, 'El BCRA informa '],
  [/^Nos dirigimos a (?:Uds|ustedes)\.? para hacerles llegar /i, 'El BCRA envía '],
  [/^Nos dirigimos a (?:Uds|ustedes)\.? para /i, 'El BCRA escribe para '],
];

export function cartaDirecta(carta: string): string {
  const regla = APERTURAS.find(([re]) => re.test(carta));
  return regla ? carta.replace(regla[0], regla[1]) : carta;
}

/** Si la carta trae una resolución, su texto entre comillas: es la regla en sí. */
function resolucionCitada(carta: string): string {
  const m = /adopt[oó] la (?:siguiente )?resoluci[oó]n[^:]*:\s*[“"]([\s\S]+?)[”"]/i.exec(carta);
  return m ? m[1].replace(/^[\s\-–]+/, '').trim() : '';
}

export function tipoComunicacion(carta: string, tipo: TipoCom): string {
  if (tipo === 'B') return 'Comunicación informativa';
  if (tipo === 'C') return 'Corrección de una norma anterior';
  if (/en reemplazo de las oportunamente provistas|actualizaci[oó]n del texto ordenado/i.test(carta)) return 'Actualización del texto ordenado';
  if (/adopt[oó] la (?:siguiente )?resoluci[oó]n/i.test(carta)) return 'Norma nueva';
  return 'Comunicación normativa';
}

// El código de circular y el título dicen el tema mejor que las palabras sueltas.
const TEMA_POR_REFERENCIA: [RegExp, Tema][] = [
  [/exterior y cambios|\bcamex\b/, 'cambios'],
  [/feriado/, 'operativo'],
  [/regimen informativo|\bconau\b|\br\.\s?i\./, 'informativo'],
  [/proteccion de los usuarios/, 'usuarios'],
  [/tecnologia|seguridad de la informacion|ciberseguridad/, 'tecnologia'],
  [/lavado|financiamiento del terrorismo/, 'lavado'],
  [/proveedores de servicios de pago/, 'psp'],
  [/\bsinap\b|transferencias|debitos directos|\bqr\b/, 'pagos'],
  [/efectivo minimo|capitales minimos|\blisol\b|\boprac\b|\bcrefi\b/, 'general'],
];

export function temaDeComunicacion(referencia: string, ev: Evaluacion): Tema {
  const r = normalizar(referencia);
  return TEMA_POR_REFERENCIA.find(([re]) => re.test(r))?.[1] ?? ev.temas[0] ?? 'general';
}

/** "A LAS ENTIDADES FINANCIERAS, A LAS CÁMARAS…" -> "entidades financieras, cámaras…". */
export function destinatariosLegibles(d: string, max = 4): string {
  const lista = unirCortes(d)
    .split(/,\s*(?=A L[AO]S?\s)/i)
    .map((x) => x.replace(/^A L[AO]S?\s+/i, '').replace(/:$/, '').trim().toLocaleLowerCase('es-AR'))
    .filter(Boolean);
  const extra = lista.length - max;
  return lista.slice(0, max).join(', ') + (extra > 0 ? ` y ${extra} más` : '');
}

function queHacer(nivel: Evaluacion['nivel']): string {
  return nivel === 'alta'
    ? 'Evaluar las adecuaciones requeridas y sus plazos.'
    : 'Evaluar su aplicabilidad a SYS.';
}

export function explicarComunicacion(c: ComunicacionBCRA, ev: Evaluacion, dirigida: boolean): Hallazgo {
  const carta = cartaBcra(c.texto);
  const tipo = tipoComunicacion(carta, c.tipo);
  const tema = temaDeComunicacion(c.referencia, ev);
  const citadas = comunicacionesCitadas(carta, c);
  const resolucion = resolucionCitada(carta);

  const comoAfecta: string[] = [];
  if (dirigida) {
    comoAfecta.push(
      /que ofrecen cuentas de pago/i.test(c.destinatarios)
        ? 'Dirigida a los proveedores de servicios de pago que ofrecen cuentas de pago, categoría que comprende a SYS.'
        : 'Dirigida a los proveedores de servicios de pago, categoría que comprende a SYS.',
    );
  } else {
    comoAfecta.push(
      `No está dirigida a los PSP${c.destinatarios ? ` (destinatarios: ${destinatariosLegibles(c.destinatarios)})` : ''}, pero trata materias vinculadas a la actividad de SYS.`,
    );
  }
  comoAfecta.push(TEMAS[tema].impacto);
  if (tipo === 'Actualización del texto ordenado' && citadas.length) {
    const lista = citadas.map((x) => `${x.tipo} ${x.numero}`).join(', ');
    comoAfecta.push(`No incorpora disposiciones nuevas: actualiza el texto ordenado con lo dispuesto por ${citadas.length > 1 ? 'las comunicaciones' : 'la comunicación'} ${lista}.`);
  }

  // Para el "qué cambia": la resolución textual si la hay; si no, la carta.
  const queCambia = recortar(resolucion || cartaDirecta(carta), 700);

  return {
    fuente: 'BCRA',
    emisor: 'Banco Central (BCRA)',
    titulo: `Comunicación "${c.tipo}" ${c.numero}`,
    asunto: c.referencia.replace(/^[^:]*Circular[^:]*:\s*/i, '') || c.referencia,
    fecha: c.fecha,
    url: c.url,
    tipo,
    queCambia: queCambia || 'El texto de la comunicación no pudo procesarse. Consultar el documento oficial.',
    paraQue: '',
    tema,
    comoAfecta,
    queHacer: queHacer(ev.nivel),
    fechasClave: fechasClave(resolucion || carta),
    dondeNombraASys: dirigida ? '' : dondeNombraASys(unirCortes(plano(c.texto.slice(Math.max(0, c.texto.search(/Nos dirigimos/i)))))),
    relacionadas: citadas.slice(0, 12).map((x) => ({ texto: `Comunicación "${x.tipo}" ${x.numero}`, url: urlComunicacion(x) })),
    evaluacion: ev,
  };
}

// ---------------------------------------------------------------------------
// Boletín Oficial

/** El texto del aviso termina en la firma y la línea "e. 02/10/2026 N° …"; lo que sigue es la página. */
function cuerpoSinPie(texto: string): string {
  const fin = texto.search(/\ne\.\s*\d{2}\/\d{2}\/\d{4}\s*N°|\nFecha de publicaci[oó]n/);
  return fin === -1 ? texto : texto.slice(0, fin);
}

/** La parte dispositiva: lo que viene después de "RESUELVE:", "DECRETA:", etc. */
export function parteDispositiva(texto: string): string {
  const m = /\b(?:RESUELVE|RESUELVEN|DECRETA|DISPONE|DISPONEN|ACUERDA|ACUERDAN)\s*:/.exec(texto);
  return m ? texto.slice(m.index + m[0].length).trim() : '';
}

/** El primer artículo, sin el "ARTÍCULO 1°.-". */
export function primerArticulo(dispositiva: string): string {
  // "ARTÍCULO 1°.-" (nación) o "Artículo 1°:" (Córdoba).
  const m = /ART[IÍ]CULO\s*1\s*(?:º|°)?[.:]?\s*-?\s*([\s\S]*?)(?=\nART[IÍ]CULO\s*2|$)/i.exec(dispositiva);
  return plano(m ? m[1] : dispositiva);
}

/** El considerando que dice para qué se dicta la norma. */
export function paraQue(texto: string): string {
  const inicio = texto.search(/CONSIDERANDO/i);
  const fin = texto.search(/\b(?:RESUELVE|RESUELVEN|DECRETA|DISPONE|DISPONEN)\s*:/);
  if (inicio === -1) return '';
  const considerandos = texto.slice(inicio, fin === -1 ? undefined : fin).split('\n').map(plano);
  // El objetivo suele estar en los últimos considerandos; los primeros dan contexto.
  const motivo = considerandos.findLast((p) => /^Que\b/.test(p) && /resulta (?:necesario|aconsejable|conveniente|oportuno|pertinente)|con el (?:fin|objeto) de|a fin de|tiene (?:como|por) objet|corresponde (?:adecuar|establecer|modificar)/i.test(p));
  return motivo ? recortar(motivo.replace(/^Que,?\s*/, ''), 400).replace(/^\p{Ll}/u, (l) => l.toUpperCase()) : '';
}

/** "MINISTERIO DE ECONOMÍA - SECRETARÍA DE…" -> "Ministerio de Economía - Secretaría de…". */
export function nombrePropio(s: string): string {
  const menores = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en', 'para', 'a', 'al']);
  return s
    .toLocaleLowerCase('es-AR')
    .split(' ')
    .map((w, i) => (i > 0 && menores.has(w) ? w : w.charAt(0).toLocaleUpperCase('es-AR') + w.slice(1)))
    .join(' ');
}

export function explicarAvisoBO(a: AvisoBO, ev: Evaluacion, fecha: string): Hallazgo {
  const cuerpo = cuerpoSinPie(a.texto);
  // Las comunicaciones del BCRA que salen en el Boletín son la misma carta del
  // PDF, sin "RESUELVE:": se explican igual que las leídas en la web del BCRA.
  const carta = cartaBcra(cuerpo);
  if (carta && !a.boletin && /banco central/i.test(a.organismo)) {
    const enc = parsearEncabezado(cuerpo);
    const m = /COMUNICACI[OÓ]N\s*["“]?([ABC])["”]?\s*(\d+)/i.exec(cuerpo);
    const c: ComunicacionBCRA = { tipo: (m?.[1] ?? 'A') as TipoCom, numero: Number(m?.[2] ?? 0), url: a.url, texto: cuerpo, ...enc };
    // Misma vara que las leídas en la web del BCRA (Lote.comunicacion): si no
    // va dirigida a los PSP, llega como mucho a "Para revisar" (A 8474, para
    // entidades financieras, salió como "Le afecta" en el Boletín del 22/10/2026).
    const dirigida = dirigidaAPsp(enc.destinatarios);
    if (dirigida && ev.nivel !== 'alta') {
      ev.nivel = 'alta';
      ev.motivos.unshift('dirigida a los proveedores de servicios de pago');
    } else if (!dirigida && ev.nivel === 'alta') ev.nivel = 'revisar';
    const h = explicarComunicacion(c, ev, dirigida);
    // En el Boletín figura como "Aviso Oficial": con su número se reconoce la misma
    // comunicación ya informada desde la web del BCRA (A 8492: 19/10 en la web, 22/10 en el Boletín).
    const titulo = m && /^aviso oficial$/i.test(a.titulo) ? h.titulo : a.titulo || h.titulo;
    return { ...h, fuente: 'Boletín Oficial', avisoBO: a.numero, titulo, fecha: enc.fecha || h.fecha || `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}/${fecha.slice(0, 4)}` };
  }
  const dispositiva = parteDispositiva(cuerpo);
  const tema = ev.temas[0] ?? 'general';
  const fuertes = ev.motivos.filter((m) => !m.startsWith('emitida') && !m.startsWith('decreto'));
  const nombra = dondeNombraASys(cuerpo);

  const comoAfecta = [
    ev.nivel === 'alta'
      ? `Menciona materias propias de la actividad de SYS: ${fuertes.slice(0, 3).join(', ')}.`
      : `Trata materias vinculadas a SYS (${fuertes.slice(0, 3).join(', ')}), sin mencionar expresamente su actividad.`,
    TEMAS[tema].impacto,
  ];
  const citadas = comunicacionesCitadas(cuerpo);
  const [d, m, y] = [fecha.slice(8, 10), fecha.slice(5, 7), fecha.slice(0, 4)];

  return {
    fuente: a.boletin ?? 'Boletín Oficial',
    emisor: nombrePropio(a.organismo) + (a.boletin ? ` (${a.boletin.replace('Boletín Oficial de ', '')})` : ''),
    titulo: a.titulo || nombrePropio(a.organismo),
    asunto: '',
    fecha: `${d}/${m}/${y}`,
    url: a.url,
    avisoBO: a.numero,
    tipo: `Publicada en el ${a.boletin ?? 'Boletín Oficial'}`,
    queCambia: recortar(primerArticulo(dispositiva) || plano(cuerpo), 700),
    paraQue: paraQue(cuerpo),
    tema,
    comoAfecta,
    queHacer: queHacer(ev.nivel),
    fechasClave: fechasClave(dispositiva || cuerpo),
    dondeNombraASys: nombra,
    relacionadas: citadas.slice(0, 6).map((x) => ({ texto: `Comunicación "${x.tipo}" ${x.numero} del BCRA`, url: urlComunicacion(x) })),
    evaluacion: ev,
  };
}

// ---------------------------------------------------------------------------
// Textos ordenados

export function explicarTextoOrdenado(t: { tema: string; temaSys: Tema; url: string; fechaTexto: string }, antes: string, ahora: string): Hallazgo {
  const [tipo, numero] = ahora.split(' ');
  const citada = { tipo: tipo as TipoCom, numero: Number(numero) };
  return {
    fuente: 'BCRA',
    emisor: 'Banco Central (BCRA)',
    titulo: `Se actualizó el texto ordenado "${t.tema}"`,
    asunto: `Ahora incorpora la Comunicación "${tipo}" ${numero}`,
    fecha: t.fechaTexto,
    // Cada versión es una novedad distinta: el link lleva la comunicación incorporada.
    url: `${t.url}#${ahora.replace(/\s+/g, '')}`,
    tipo: 'Cambio en un texto ordenado',
    queCambia: `El BCRA actualizó la versión consolidada de "${t.tema}". Antes llegaba hasta la Comunicación ${antes}; ahora incorpora la ${ahora}. Las modificaciones se destacan en el texto ordenado.`,
    paraQue: '',
    tema: t.temaSys,
    comoAfecta: [
      'Texto ordenado que regula la actividad de SYS.',
      TEMAS[t.temaSys].impacto,
      'Corresponde revisar la comunicación incorporada si no fue informada previamente.',
    ],
    queHacer: queHacer('alta'),
    fechasClave: [],
    dondeNombraASys: '',
    relacionadas: [{ texto: `Comunicación ${ahora}`, url: urlComunicacion(citada) }],
    evaluacion: { nivel: 'alta', puntaje: 0, motivos: ['tema normativo que regula a SYS'], temas: [t.temaSys] },
  };
}

// ---------------------------------------------------------------------------
// Prensa del BCRA

export function explicarNoticia(n: Noticia, ev: Evaluacion): Hallazgo {
  const tema = ev.temas[0] ?? 'general';
  const [y, m, d] = n.fecha.split('-');
  const citadas = comunicacionesCitadas(n.texto);
  return {
    fuente: 'BCRA — prensa',
    emisor: 'Banco Central (BCRA) — comunicado de prensa',
    titulo: n.titulo,
    asunto: '',
    fecha: n.fecha ? `${d}/${m}/${y}` : '',
    url: n.url,
    tipo: 'Anuncio de prensa (no es una norma)',
    queCambia: recortar(n.bajada || n.texto, 600),
    paraQue: '',
    tema,
    comoAfecta: [
      'Anuncio del BCRA, sin carácter normativo. Puede anticipar una comunicación futura, que se informará al publicarse.',
      TEMAS[tema].impacto,
    ],
    queHacer: 'Seguimiento: evaluar si corresponde anticipar adecuaciones.',
    fechasClave: fechasClave(n.texto),
    dondeNombraASys: dondeNombraASys(n.texto),
    relacionadas: citadas.slice(0, 6).map((x) => ({ texto: `Comunicación "${x.tipo}" ${x.numero}`, url: urlComunicacion(x) })),
    evaluacion: ev,
  };
}

// ---------------------------------------------------------------------------
// Rentas Córdoba

// Las categorías del sitio de Rentas, en singular para el "tipo" de la norma.
function tipoRentas(categorias: string[]): string {
  const c = categorias.find((x) => !/^(novedades|todos|vigente)$/i.test(x)) ?? 'Norma';
  return `${c.replace(/es\b/g, '').replace(/s\b/g, '')} de Córdoba`.replace(/^Otra /, 'Otra norma: ');
}

export function explicarRentas(n: NormaRentas, ev: Evaluacion): Hallazgo {
  const tema = ev.temas[0] ?? 'iibb';
  const [y, m, d] = n.fecha.split('-');
  const fuertes = ev.motivos.filter((x) => !x.startsWith('emitida'));
  return {
    fuente: 'Rentas Córdoba',
    emisor: 'Rentas Córdoba (Ingresos Brutos de Córdoba)',
    titulo: n.titulo,
    asunto: '',
    fecha: n.fecha ? `${d}/${m}/${y}` : '',
    url: n.url,
    tipo: tipoRentas(n.categorias),
    // El resumen lo escribe Rentas: es la mejor explicación disponible.
    queCambia: recortar(n.resumen.replace(/^Fecha de Publicaci[oó]n:?\s*\S+\s*/i, '') || n.texto, 700),
    paraQue: '',
    tema,
    comoAfecta: [
      ev.nivel === 'alta'
        ? `Norma tributaria de la Provincia de Córdoba que menciona materias propias de la actividad de SYS: ${fuertes.slice(0, 3).join(', ')}.`
        : `Norma tributaria de la Provincia de Córdoba${fuertes.length ? ` (materias: ${fuertes.slice(0, 3).join(', ')})` : ''}.`,
      TEMAS[tema].impacto,
    ],
    queHacer: ev.nivel === 'alta' ? 'Evaluar el impacto en las obligaciones de Ingresos Brutos de SYS.' : 'Evaluar su aplicabilidad a SYS.',
    fechasClave: fechasClave(`${n.resumen}\n${n.texto}`),
    dondeNombraASys: dondeNombraASys(n.texto),
    relacionadas: [],
    evaluacion: ev,
  };
}
