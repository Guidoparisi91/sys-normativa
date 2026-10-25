// La explicación sale de recortes de la norma: estos casos usan textos reales.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  cartaBcra,
  explicarAvisoBO,
  cartaDirecta,
  comunicacionesCitadas,
  destinatariosLegibles,
  fechasClave,
  paraQue,
  primerArticulo,
  parteDispositiva,
  temaDeComunicacion,
  tipoComunicacion,
} from './explicar.js';
import { parsearEncabezado } from './fuentes/bcraComunicaciones.js';
import { evaluar } from './reglas.js';

const A8488 =
  'COMUNICACIÓN “A” 8488 02/10/2026 A LAS ENTIDADES FINANCIERAS, A LOS PROVEEDORES DE SERVICIOS DE PAGO QUE OFRECEN CUENTAS DE PAGO: Ref.: Circular SINAP 1-256: Proveedores de Servicios de Pago. Actualización. ____ ' +
  'Nos dirigimos a Uds. para hacerles llegar en anexo las hojas que, en reemplazo de las oportunamente provistas, corresponde incorporar en el texto ordenado sobre Proveedores de Servi- cios de Pago en función de las disposiciones divulgadas mediante la Comunicación A 8472. ' +
  'Se recuerda que en la página de esta Institución www.bcra.gob.ar, accediendo a “Sis- tema Financiero”, se encontrarán las modificaciones realizadas con textos resaltados en caracteres especiales (tachado y negrita). ' +
  'Saludamos a Uds. atentamente. BANCO CENTRAL DE LA REPUBLICA ARGENTINA';

test('Com. A 8488: carta sin el párrafo de navegación y con apertura directa', () => {
  const carta = cartaBcra(A8488);
  assert.ok(!/Se recuerda/.test(carta));
  assert.ok(/Proveedores de Servicios de Pago en función/.test(carta), 'une las palabras cortadas');
  assert.match(cartaDirecta(carta), /^El BCRA envía en anexo las hojas/);
  assert.equal(tipoComunicacion(carta, 'A'), 'Actualización del texto ordenado');
});

test('Com. A 8488: cita a la A 8472, que es donde está el cambio de fondo', () => {
  assert.deepEqual(comunicacionesCitadas(cartaBcra(A8488), { tipo: 'A', numero: 8488 }), [{ tipo: 'A', numero: 8472 }]);
});

test('Com. A 8481: lista de comunicaciones citadas con comas e "y"', () => {
  const citadas = comunicacionesCitadas('atento a las disposiciones difundidas por las Comunicaciones A 8330, A 8331, A 8442 y A 8464. Adicionalmente');
  assert.deepEqual(citadas.map((c) => c.numero), [8330, 8331, 8442, 8464]);
});

test('Com. A 8487: la resolución entre comillas y su fecha', () => {
  const carta = cartaBcra(
    'Nos dirigimos a Uds. para comunicarles que esta Institución adoptó la resolución que, en su parte pertinente, dispone: “- Establecer como feriado bancario el 10/11/26 en todo el territorio de la República Argentina.” Saludamos a Uds. atentamente.',
  );
  assert.equal(tipoComunicacion(carta, 'A'), 'Norma nueva');
  assert.equal(fechasClave(carta).length, 1);
});

test('tema por la referencia de la circular', () => {
  const ev = { nivel: 'revisar' as const, puntaje: 5, motivos: [], temas: ['psp' as const] };
  assert.equal(temaDeComunicacion('Circular CAMEX 1-1065: Exterior y cambios. Actualización del texto ordenado.', ev), 'cambios');
  assert.equal(temaDeComunicacion('Circular SINAP 1-256: Proveedores de Servicios de Pago. Actualización.', ev), 'psp');
  assert.equal(temaDeComunicacion('Circular RUNOR 1-1975: Feriado bancario con motivo de la visita de Su Santidad el Papa León XIV.', ev), 'operativo');
  assert.equal(temaDeComunicacion('Circular OTRA 1-1: Algo sin pista.', ev), 'psp');
});

test('destinatarios en minúscula y abreviados', () => {
  assert.equal(
    destinatariosLegibles('A LAS ENTIDADES FINANCIERAS, A LAS CÁMARAS ELECTRÓNICAS DE COMPENSACIÓN, A LOS OPERADORES DE CAMBIO, A LAS REDES DE CAJEROS AUTOMÁTICOS, A LOS ADMINISTRADORES QR', 2),
    'entidades financieras, cámaras electrónicas de compensación y 3 más',
  );
});

test('Res. 400/2026 (BO): artículo 1°, vigencia y sin fechas de normas citadas', () => {
  const texto = [
    'CONSIDERANDO:',
    'Que la Ley N° 27.440 tiene como objetivo mejorar las condiciones de financiamiento de las PyMEs.',
    'Que resulta necesario aclarar el alcance del régimen respecto de las entidades financieras.',
    'Por ello,',
    'EL SECRETARIO DE INDUSTRIA Y COMERCIO',
    'RESUELVE:',
    'ARTÍCULO 1°.- Establécese que las entidades financieras no serán sujetos obligados, conforme la Resolución General N° 4.367 de fecha 19 de diciembre de 2018, a partir del momento en que resulte exigible la emisión de comprobantes.',
    'ARTÍCULO 2°.- La presente medida entrará en vigencia a partir del día de su publicación en el Boletín Oficial.',
  ].join('\n');
  const disp = parteDispositiva(texto);
  assert.match(primerArticulo(disp), /^Establécese que las entidades financieras/);
  assert.deepEqual(fechasClave(disp), ['La presente medida entrará en vigencia a partir del día de su publicación en el Boletín Oficial.']);
  assert.match(paraQue(texto), /^Resulta necesario aclarar/);
});

test('Com. A 8398 (BO 9/2/2026): la fecha clave muestra el plazo de 180 días', () => {
  const [f] = fechasClave(
    '1- Incorporar como sujetos obligados contemplados en el punto 1.1. del texto ordenado sobre Requisitos Mínimos para la Gestión y Control de los Riesgos de Tecnología y Seguridad de la Información a los Proveedores de servicios de pago (PSP) incluidos en el Registro de PSP del Banco Central de la República Argentina, otorgándoles un plazo de 180 (ciento ochenta) días corridos a partir de la divulgación de esta comunicación para su implementación.',
  );
  assert.match(f, /plazo de 180 \(ciento ochenta\) días corridos/);
});

test('carta del BCRA: no se corta cuando nombra al banco en el medio', () => {
  const carta = cartaBcra('Nos dirigimos a Uds. para comunicarles que se incluye a los PSP del Registro de PSP del BANCO CENTRAL DE LA REPÚBLICA ARGENTINA con un plazo. Saludamos a Uds. atentamente.');
  assert.match(carta, /con un plazo\.$/);
});

test('Com. A 8310: destinatarios sin "A LOS" al principio', () => {
  const enc = parsearEncabezado(
    '“Año de la Reconstrucción de la Nación Argentina” COMUNICACIÓN “A” 8310 28/08/2025 ADQUIRENTES DE PAGOS CON TARJETA: Ref.: Circular CONAU 1-1692: R.I. Adquirentes de pagos con tarjeta ____ Nos dirigimos a Uds.',
  );
  assert.equal(enc.fecha, '28/08/2025');
  assert.equal(enc.destinatarios, 'ADQUIRENTES DE PAGOS CON TARJETA');
  assert.match(enc.referencia, /Adquirentes de pagos con tarjeta/);
});

test('Com. A 8488: destinatarios de siempre', () => {
  const enc = parsearEncabezado(A8488);
  assert.match(enc.destinatarios, /^A LAS ENTIDADES FINANCIERAS, A LOS PROVEEDORES DE SERVICIOS DE PAGO/);
});

// Boletín Oficial del 22/10/2026 (leído del PDF): la A 8474, dirigida a entidades financieras.
const A8474_BO = "Comunicación “A” 8474/2026\n03/09/2026\nA LAS ENTIDADES FINANCIERAS,\nA LOS OPERADORES DE CAMBIO,\nA LAS CÁMARAS ELECTRÓNICAS DE COMPENSACIÓN:\nRef.: Circular RUNOR 1-1970:\nImplementación de firma digital en trámites gestionados ante la Gerencia de Cuentas Corrientes.\nNos dirigimos a Uds. para comunicarles que esta Institución adoptó la resolución que, en su parte pertinente,\ndispone:\n“1. Reemplazar, con vigencia 01/11/26, el punto 2.1. del texto ordenado sobre Cuentas Corrientes y Otras Cuentas\na la Vista de las Entidades Financieras y Cambiarias en el Banco Central de la República Argentina por el siguiente:\n“2.1. Solicitud\n2.1.1. Entidades financieras\n2.1.1.1. Cuenta corriente en pesos: la Subgerencia de Cuentas Corrientes tramitará su apertura una vez emitida\nla correspondiente comunicación B que informe la autorización para funcionar de la entidad financiera de que se\ntrate.\n#F7818632F#\n#I7817303I#\n#F7817303F#\n#I7818638I#\n=====PAGINA 74\nBOLETÍN OFICIAL Nº 36.018 - Primera Sección 74 Jueves 22 de octubre de 2026\nUna vez notificada del número de cuenta asignado, y al efecto de registrar ante el Banco Central de la República\nArgentina a las personas autorizadas a operar su cuenta corriente en esta Institución —así como las restantes\ncuya apertura luego solicite, conforme al punto 2.1 .I .2.—, la entidad financiera deberá presentar una nota dirigida\na la Gerencia de Cuentas Corrientes, suscripta por su máxima autoridad, conforme a lo establecido en el punto\n1.5.1. del texto ordenado sobre Firmas Autorizadas ante el BCRA.\n2.1.1.2. Restantes cuentas a la vista: deberán presentar a la Gerencia de Cuentas Corrientes una nota suscripta\npor firmantes registrados en el Registro de Firmas Autorizadas previsto en la Sección I . del texto ordenado sobre\nFirmas Autorizadas ante el BCRA, conforme al esquema de utilización de firmas vigente en ese registro.\n2.1.2. Operadores de cambio\nA los fines de solicitar la apertura de cuentas a la vista y de cuentas restringidas, en pesos o en moneda extranjera,\ndeberán ajustarse a lo siguiente:\n2.1.2.1. Solicitud de primera cuenta a la vista: deberán presentar a la Gerencia de Cuentas Corrientes nota\nsuscripta por su máximo responsable, intervenida por escribano público en los términos del punto 1.3.2. del texto\nordenado sobre Firmas Autorizadas ante el BCRA.\n2.1.2.2. Restantes solicitudes de apertura: deberán observar lo dispuesto en el punt0 2.1.1.2.\nQuedan comprendidas en este punto las solicitudes recibidas en el marco del segundo párrafo del punto 1.2.\nLas solicitudes previstas en los puntos 2.I.1.2. y 2.1.2.2. deberán cursarse por IDEAR. Cuando se trate de\noperadores de cambio que no tengan acceso a IDEAR, deberán cursarlas desde la dirección de correo electrónico\ninformada ante el Registro de Operadores de Cambio a la dirección de correo electrónico de la Gerencia de\nCuentas Corrientes: ctas.ctes@bcra.gob.ar. En ambos casos, las solicitudes deben efectuarse por nota suscripta\ncon firma digital establecida en la Ley 25.506.\nLas solicitudes efectuadas por organismos que utilicen el sistema de Gestión Documental Electrónica (GDE) y\ncuyos firmantes se encuentren habilitados en el Registro de Firmas Autorizadas previsto en la Sección 1. del texto\nordenado sobre Firmas Autorizadas ante el BCRA podrán cursarse a través de dicho sistema empleando la firma\nallí generada.\nSólo excepcionalmente, ante la indisponibilidad de los sistemas informáticos o de comunicación, se podrá admitir\npresentaciones de solicitudes en papel, con firma ológrafa.”\n2. Reemplazar, con vigencia 01/11/26, el punto 4. del texto ordenado sobre Cuentas Corrientes y Otras Cuentas a\nla Vista de las Entidades Financieras y Cambiarias en el Banco Central de la República Argentina por el siguiente:\n“4.3. Reclamos\nLas observaciones respecto de cualquier resumen de cuenta corriente o de otras cuentas a la vista se formularán\nmediante nota dirigida a la Gerencia de Cuentas Corrientes, la que deberá presentarse dentro de los plazos\nindicados en el punto precedente y estar acompañada indefectiblemente de copia de la documentación\nrespaldatoria del reclamo (comprobantes, notas, etc.).\nLa presentación deberá ajustarse a lo siguiente:\ni. Cuando sea interpuesta por una entidad financiera, o por un operador de cambio con acceso a IDEAR: se\ncursará por IDEAR y deberá efectuarse por nota suscripta con firma digital establecida en la Ley 25.506.\nii. Cuando sea interpuesta por un operador de cambio sin acceso a IDEAR: se cursará desde su dirección de\ncorreo electrónico informada ante el Registro de Operadores de Cambio a la dirección de correo electrónico de la\nGerencia de Cuentas Corrientes: ctas.ctes@bcra.gob.ar, y deberá efectuarse por nota suscripta con firma digital\nestablecida en la Ley 25.506.\niii. Cuando sea interpuesta por un organismo que utilice el sistema de Gestión Documental Electrónica (GDE) y\ncuyos firmantes se encuentren habilitados en el registro de firmas: podrán cursarse a través de dicho sistema\nempleando la firma allí generada.\nSólo excepcionalmente, ante la indisponibilidad de los sistemas informáticos o de comunicación, se podrán\nadmitir presentaciones de solicitudes en papel, con firma ológrafa.”\n3. Establecer, con vigencia 01/11/26, que las solicitudes para operar en situaciones de contingencia en la\nconectividad con el Banco Central de la República Argentina previstas en los puntos 5.1.1. y 5.1.2. del texto\nordenado sobre Sistema Nacional de Pagos — Medio Electrónico de Pagos deberán cursarse por IDEAR.\nCuando se trate de operadores de cambio que no tengan acceso a IDEAR, deberán cursar las solicitudes desde\nla dirección de correo electrónico informada ante el Registro de Operadores de Cambio a la dirección de correo\nelectrónico de la Gerencia de Cuentas Corrientes: ctas.ctes@bcra.gob.ar. Las solicitudes deben efectuarse por\nnota suscripta con firma digital establecida en la Ley 25.506.\n=====PAGINA 75\nBOLETÍN OFICIAL Nº 36.018 - Primera Sección 75 Jueves 22 de octubre de 2026\nLas entidades participantes del Medio Electrónico de Pagos (MEP) que utilicen el sistema de Gestión Documental\nElectrónica (GDE) y cuyos firmantes se encuentren habilitados en el Registro de Firmas Autorizadas previsto en la\nSección 1. del texto ordenado sobre Firmas Autorizadas ante el Banco Central de la República Argentina podrán\ncursar las solicitudes a través de dicho sistema empleando la firma allí generada.\nSólo excepcionalmente, ante la indisponibilidad de los sistemas informáticos o de comunicación, se podrán\nadmitir presentaciones de solicitudes en papel, con firma ológrafa.\n4. Disponer, con vigencia 01/11/26, que las restantes solicitudes y trámites imterpuestos ante la Gerencia de\nCuentas Corrientes que no involucren movimientos de fondos en el Medio Electrónico de Pagos deberán ajustarse\na lo siguiente:\ni. Cuando sean interpuestas por entidades financieras, y por operadores de cambio con acceso a IDEAR: se\ncursarán por IDEAR y deberán efectuarse por nota suscripta con firma digital establecida en la Ley 25.506.\nii. Cuando sean interpuestas por operadores de cambio sin acceso a IDEAR: se cursarán desde su dirección de\ncorreo electrónico informada ante el Registro de Operadores de Cambio a la dirección de correo electrónico de\nla Gerencia de Cuentas Corrientes: ctas.ctes@bcra.gob.ar, y deberán efectuarse por nota suscripta con firma\ndigital establecida en la Ley 25.506.\niii. Cuando sean interpuestas por entidades participantes del MEP que utilicen el sistema de Gestión Documental\nElectrónica (GDE) y cuyos firmantes se encuentren habilitados en el registro de firmas: podrán cursarse a través\nde dicho sistema empleando la firma allí generada.\nSólo excepcionalmente, ante la indisponibilidad de los sistemas informáticos o de comunicación, se podrán\nadmitir presentaciones de solicitudes en papel, con firma ológrafa.”\nAsimismo, les informamos que posteriormente les haremos llegar las hojas que, en reemplazo de las oportunamente\nprovistas, corresponderá incorporar en los textos ordenados de la referencia.\nSaludamos a Uds. atentamente.\nMatias A. Gutiérrez Girault, Gerente Principal de Sistemas de Pago y Cuentas Corrientes - Alejandra I. Sanguinetti,\nSubgerenta General de Medios de Pago.\ne. 22/10/2026 N° 78376/26 v. 22/10/2026\n";

test('comunicación del BCRA en el Boletín no dirigida a los PSP: como mucho "Para revisar", con su número de título', () => {
  const ev = evaluar('BANCO CENTRAL DE LA REPÚBLICA ARGENTINA', `Aviso Oficial\n${A8474_BO}`);
  const h = explicarAvisoBO({ id: 'pdf-78376/26', url: 'https://x', organismo: 'BANCO CENTRAL DE LA REPÚBLICA ARGENTINA', titulo: 'Aviso Oficial', texto: A8474_BO, numero: '78376/26' }, ev, '2026-10-22');
  assert.equal(h.titulo, 'Comunicación "A" 8474');
  assert.notEqual(h.evaluacion.nivel, 'alta');
  assert.equal(h.avisoBO, '78376/26');
});
