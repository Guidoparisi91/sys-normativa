// Las fuentes de Rentas Córdoba y de prensa del BCRA, con recortes reales de sus páginas.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fechaDeNoticia, parsearListado } from './fuentes/bcraPrensa.js';
import { fechaArgentina, parsearFeed } from './fuentes/rentasCordoba.js';
import { numeroDeAviso, parsearPdf, parsearRepositorio } from './fuentes/boletinOficial.js';
import { claveCordoba } from './procesar.js';
import { evaluar } from './reglas.js';

test('Rentas Córdoba RG 2229/2026 (padrones IIBB y SIRCUPA) -> le afecta, tema IIBB', () => {
  const ev = evaluar(
    'DIRECCIÓN GENERAL DE RENTAS',
    'APROBAR Y REMITIR a la Comisión Arbitral del Convenio Multilateral el listado ... Impuesto sobre los Ingresos Brutos ... regímenes de retención, percepción y/o recaudación ... SIRCUPA ... cuentas de pago ... proveedores de servicios de pago',
  );
  assert.equal(ev.nivel, 'alta');
  assert.equal(ev.temas[0], 'iibb');
});

const LISTADO = `<article id="post-105483" class="et_pb_post clearfix"> <p class="post-meta"> <span class="published">03 de septiembre de 2026</span> </p> <h2 class="entry-title"> <a href="https://www.bcra.gob.ar/noticias/el-bcra-profundiza-la-estrategia-de-prevencion-del-fraude/">El BCRA profundiza la estrategia de prevención del fraude</a> </h2> <div class="post-categories"> Noticias </div> <div class="post-content"> <div class="post-content-inner"> <p>Desde septiembre, los administradores de transferencias inmediatas contarán con información pública.</p> </div> </div> </article>`;

test('prensa del BCRA: lee id, fecha, título, link y bajada del listado', () => {
  const [n] = parsearListado(LISTADO);
  assert.equal(n.id, 'post-105483');
  assert.equal(n.fecha, '2026-09-03');
  assert.equal(n.titulo, 'El BCRA profundiza la estrategia de prevención del fraude');
  assert.match(n.url, /prevencion-del-fraude\/$/);
  assert.match(n.bajada, /^Desde septiembre/);
});

test('prensa del BCRA: fechas en castellano', () => {
  assert.equal(fechaDeNoticia('jueves, 1 de octubre de 2026'), '2026-10-01');
  assert.equal(fechaDeNoticia('sin fecha'), '');
});

// Entrada real del feed de Rentas Córdoba (22/9/2026), recortada.
const FEED = `<rss><channel><item>
<title>Resolución SIP N° 19/2026 Letra D &#8211; Baja de Agentes de Retención y Percepción de Ingresos Brutos</title>
<link>https://www.rentascordoba.gob.ar/cms/resolucion-sip-n-19-2026-letra-d/</link>
<pubDate>Tue, 22 Sep 2026 11:10:28 +0000</pubDate>
<category><![CDATA[Novedades]]></category>
<category><![CDATA[Resoluciones SIP]]></category>
<guid isPermaLink="false">https://www.rentascordoba.gob.ar/cms/?p=101422</guid>
<description><![CDATA[<p>Fecha de Publicación 22/09/2026</p> <p>Da de baja de la nómina de agentes de retención y percepción a Avex S.A. La vigencia es desde la publicación en el boletín oficial.</p> <p>La entrada <a href="https://x">Resolución SIP</a> se publicó primero en <a href="https://x">Rentas Córdoba</a>.</p>]]></description>
<content:encoded><![CDATA[<p>Texto completo.</p>]]></content:encoded>
</item><item>
<title>Acreditación de inversión</title><link>https://x/guia/</link><pubDate>Mon, 14 Sep 2026 10:00:00 +0000</pubDate>
<category><![CDATA[Gestiones CMS]]></category><category><![CDATA[Guía Trámite]]></category><guid>https://x/?p=1</guid>
</item></channel></rss>`;

test('Rentas Córdoba: lee la norma del feed y saltea las guías de trámites', () => {
  const normas = parsearFeed(FEED);
  assert.equal(normas.length, 1);
  const [n] = normas;
  assert.equal(n.id, 'p=101422');
  assert.equal(n.fecha, '2026-09-22');
  assert.equal(n.titulo, 'Resolución SIP N° 19/2026 Letra D – Baja de Agentes de Retención y Percepción de Ingresos Brutos');
  assert.match(n.resumen, /Da de baja de la nómina/);
  assert.doesNotMatch(n.resumen, /se publicó primero/);
});

test('Rentas Córdoba: la fecha se toma en hora argentina', () => {
  // 01:30 UTC del 1/10 son las 22:30 del 30/9 en Argentina.
  assert.equal(fechaArgentina('Thu, 01 Oct 2026 01:30:00 +0000'), '2026-09-30');
});

test('la misma norma de Córdoba por el Boletín o por Rentas no se repite', () => {
  const boletin = claveCordoba({ titulo: 'Resolución General N° 2229', fuente: 'Boletín Oficial de Córdoba', emisor: 'Dirección General de Rentas (Córdoba)' });
  const rentas = claveCordoba({ titulo: 'Resolución General N° 2229/2026 – Padrón de Octubre de 2026', fuente: 'Rentas Córdoba', emisor: 'Rentas Córdoba (Ingresos Brutos de Córdoba)' });
  assert.equal(boletin, 'cba-rg-2229');
  assert.equal(rentas, boletin);
  const sipBoletin = claveCordoba({ titulo: 'Resolución N° 19 - Letra:D', fuente: 'Boletín Oficial de Córdoba', emisor: 'Secretaría de Ingresos Públicos (Córdoba)' });
  const sipRentas = claveCordoba({ titulo: 'Resolución SIP N° 19/2026 Letra D – Baja de Agentes', fuente: 'Rentas Córdoba', emisor: 'Rentas Córdoba (Ingresos Brutos de Córdoba)' });
  assert.equal(sipBoletin, 'cba-sip-19');
  assert.equal(sipRentas, sipBoletin);
  assert.equal(claveCordoba({ titulo: 'Resolución General N° 2229', fuente: 'Boletín Oficial', emisor: 'ARCA' }), null);
});

// Boletín Oficial leído del PDF del día (repositorio de la BFA), recortes reales del 23/10/2026.
const REPOSITORIO = `<form class="form-inline" method="GET" action="/ots/"><input type="text" name="date_filter"></form>
<h4 class="text-left">23-10-2026</h4><table><tbody>
<tr>
<td>1</td>
<td class="txtlargo">85ae</td>
<td><a href="/ots/download/85aef326/0/"><i class="fa fa-download"></i></a></td>
<td><a href="/ots/download/85aef326/2/"></a></td>
</tr>
<tr>
<td>2</td>
<td class="txtlargo">5572</td>
<td><a href="/ots/download/5572167f/0/"></a></td>
</tr>
</tbody></table>
<h4 class="text-left">22-10-2026</h4><table><tbody><tr><td>1</td><td><a href="/ots/download/aaaa/0/"></a></td></tr></tbody></table>`;

test('Boletín Oficial por PDF: el repositorio da el PDF de la primera sección de ese día', () => {
  assert.deepEqual(parsearRepositorio(REPOSITORIO, '20261023'), ['https://otslist.boletinoficial.gob.ar/ots/download/85aef326/0/']);
  // Sin edición ese día (fin de semana): no hay renglón.
  assert.deepEqual(parsearRepositorio(REPOSITORIO, '20261024'), []);
  // Una página desconocida nunca se toma como "no hubo edición".
  assert.throws(() => parsearRepositorio('<html>Mantenimiento</html>', '20261024'));
});

const PAGINAS = [
  'Primera Sección\nLegislación y Avisos Oficiales',
  `SUMARIO
Decretos
PODER EJECUTIVO. Decreto 1253/2026. DECTO-2026-1253-APN-PTE - Reglamentación de la Ley N° 27.799. Modificación. ...................... 3`,
  `BOLETÍN OFICIAL Nº 36.019 - Primera Sección 3 Viernes 23 de octubre de 2026
Decretos
PODER EJECUTIVO
Decreto 1253/2026
DECTO-2026-1253-APN-PTE - Reglamentación de la Ley N° 27.799. Modificación.
Ciudad de Buenos Aires, 22/10/2026
VISTO el Expediente N° EX-2026-98196090-APN-DGDA#MEC
e. 23/10/2026 N° 79166/26 v. 23/10/2026
MINISTERIO DE ECONOMÍA
SECRETARÍA DE ENERGÍA
Resolución 297/2026
RESOL-2026-297-APN-SE#MEC
Ciudad de Buenos Aires, 21/10/2026
e. 23/10/2026 N° 78712/26 v. 23/10/2026
#F7820497F#`,
  `BOLETÍN OFICIAL Nº 36.019 - Primera Sección 4 Viernes 23 de octubre de 2026
Avisos Oficiales
NUEVOS
BANCO CENTRAL DE LA REPÚBLICA ARGENTINA
El Banco Central de la República Argentina cita y emplaza...
e. 23/10/2026 N° 78368/26 v. 27/10/2026`,
];

test('Boletín Oficial por PDF: separa cada aviso con organismo, nombre, texto y número', () => {
  const avisos = parsearPdf(PAGINAS);
  assert.deepEqual(
    avisos.map((a) => [a.organismo, a.titulo, a.numero]),
    [
      ['PODER EJECUTIVO', 'Decreto 1253/2026', '79166/26'],
      ['MINISTERIO DE ECONOMÍA - SECRETARÍA DE ENERGÍA', 'Resolución 297/2026', '78712/26'],
      ['BANCO CENTRAL DE LA REPÚBLICA ARGENTINA', 'Aviso Oficial', '78368/26'],
    ],
  );
  assert.match(avisos[0].texto, /^DECTO-2026-1253[\s\S]*VISTO el Expediente/);
  assert.doesNotMatch(avisos[1].texto, /BOLETÍN OFICIAL Nº|#F/);
  assert.equal(numeroDeAviso(avisos[2].texto), '78368/26');
});

test('Boletín Oficial por PDF: un PDF sin avisos reconocibles es un error, no un día vacío', () => {
  assert.throws(() => parsearPdf(['tapa', 'otra cosa']));
  assert.throws(() => parsearPdf([PAGINAS[0], PAGINAS[1], 'BOLETÍN OFICIAL Nº 36.019 - Primera Sección 3\nTexto sin pie']));
});
