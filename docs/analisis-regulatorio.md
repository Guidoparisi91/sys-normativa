# Análisis regulatorio: qué normas le importan a SYS

*Relevado el 3/10/2026. Proyecto independiente, sin relación con PIRP.*

## Resumen en criollo

SYS Global Pay es una **billetera virtual para empresas** (gastos corporativos con pagos QR y transferencias), registrada en el BCRA como proveedor de servicios de pago. Según los resultados de búsqueda, la operadora sería **EvaPar S.A.**, pero no lo pude confirmar porque el PDF de términos y condiciones de su web hoy da error.

Las normas que le pueden cambiar el negocio salen de **ocho organismos** y se publican en **tres lugares distintos**:

1. **La web del BCRA.** Ahí sale lo más importante, y en su mayoría **no** se publica en el Boletín Oficial.
2. **El Boletín Oficial nacional.** UIF, ARCA, CNV, decretos, Comisión Arbitral y algunas comunicaciones del BCRA. Las comunicaciones del BCRA que salen en el Boletín se evalúan igual que las de la web: "Le afecta" solo si van dirigidas a los PSP; si no, como mucho "Para revisar" (regla del 25/10/2026, caso real: A 8474 en el Boletín del 22/10/2026). Desde el 22/10/2026 el sitio del Boletín no acepta conexiones del exterior: el monitor lee el PDF de la sección del día que el Boletín publica en su repositorio de la Blockchain Federal Argentina.
3. **Los boletines provinciales.** Ingresos Brutos sobre billeteras: ARBA, AGIP, Córdoba, etc.

El monitor ya cubre los dos primeros. Los boletines provinciales y el Congreso quedan para una segunda etapa.

**Prueba con casos reales:** corrí el monitor sobre los días en que salieron cuatro normas que sabemos que afectaban a billeteras, y las cuatro aparecieron en "Le afecta a SYS":

| Norma | Qué hizo | Publicada |
|---|---|---|
| Res. UIF 200/2024 | Obligaciones antilavado para los PSP | BO 19/12/2024 |
| RG ARCA 5804/2025 | Los PSP informan ingresos, egresos y saldos | BO 24/12/2025 |
| Com. BCRA A 8398 | Requisitos de seguridad informática, alcanza a los PSP | BO 9/2/2026 |
| Decreto 475/2026 | Exenciones del impuesto al cheque (PSP/PSAV) | BO 18/6/2026 |

Y sobre lo reciente, encontró la **Com. A 8488 del 2/10/2026**, dirigida a "proveedores de servicios de pago que ofrecen cuentas de pago". **Esa no salió en el Boletín Oficial**: con solo el Boletín se hubiera perdido.

---

## Los frentes, uno por uno

La columna "Monitor" dice si hoy se detecta automáticamente.

### 1. BCRA: régimen de PSP *(el núcleo)*
- **Qué regula:** registro como PSP; el 100% de los fondos de clientes depositados en cuentas a la vista en pesos en bancos del país; transparencia; transferencias desde y hacia cuentas de pago; verificación de identidad; prohibiciones; informe anual de contadores independientes (Com. A 8482, 16/9/2026).
- **Norma madre:** texto ordenado "Proveedores de servicios de pago" (`t-snp-psp`), al 2/10/2026 con la Com. A 8488 incorporada.
- **Dónde sale:** web del BCRA (comunicaciones "A").
- **Monitor:** ✅ Lee cada comunicación nueva. Si en el encabezado va dirigida a los PSP, sale sí o sí como "Le afecta". También vigila que el texto ordenado no cambie sin que lo hayamos visto.

### 2. BCRA: Sistema Nacional de Pagos
- **Qué regula:** transferencias (incluidas las inmediatas y los pagos con transferencia/QR interoperable), débitos directos, servicios de pago. Es la operatoria diaria de SYS.
- **Normas madre:** `t-snp-tr`, `t-snp-tr-nc`, `t-snp-spd`, `t-snp-dd`.
- **Monitor:** ✅

### 3. BCRA: protección de usuarios de servicios financieros
- **Qué regula:** comisiones, información al cliente, reclamos. Los PSP están alcanzados desde la Com. A 7593.
- **Alcance para SYS:** limitado si todos sus clientes son empresas, pero aplica igual en parte.
- **Norma madre:** `t-pusf`.
- **Monitor:** ✅

### 4. BCRA: seguridad informática y riesgo tecnológico
- **Qué regula:** requisitos mínimos de gestión de riesgos de tecnología y seguridad. Desde 2026 alcanza a los PSP del registro (Com. A 8398).
- **Normas madre:** `t-rmrtsd`, `t-rmgcti`.
- **Monitor:** ✅

### 5. BCRA: exterior y cambios
- **Importa si** SYS permite pagos en el exterior o gastos de viaje en otra moneda. Está por confirmar con SYS.
- **Norma madre:** `t-excbio`.
- **Monitor:** ✅ Aparece como "Para revisar", salvo que vaya dirigida a los PSP.

### 6. BCRA: comunicaciones "B" y "C"
- **"B":** informativas (feriados bancarios, tasas, listados). **"C":** correcciones de normas anteriores.
- **Feriados bancarios:** aunque no nombren a los PSP, mueven acreditaciones y plazos. Llegan siempre a "Para revisar", nunca a "Le afecta" (regla agregada el 3/10/2026, caso real: Com. A 8487, feriado bancario del 10/11/2026).
- **Monitor:** ✅ Se leen todas; aparecen solo si tocan temas de SYS.

### 7. UIF: prevención del lavado de dinero
- **Qué regula:** desde la **Ley 27.739** (2024), los proveedores de servicios de pago son **sujetos obligados**. La **Res. UIF 200/2024** fija sus obligaciones: conocer al cliente, monitorear operaciones y reportar las sospechosas.
- **Dónde sale:** Boletín Oficial.
- **Monitor:** ✅

### 8. ARCA: regímenes de información y retenciones
- **Qué regula:** los PSP informan mensualmente movimientos y saldos de sus clientes (RG 5699/2025 con umbrales, RG 5804/2025 con ingresos, egresos y saldos desde mayo de 2026). Además, cualquier régimen de retención o percepción que pase por la billetera.
- **Dónde sale:** Boletín Oficial.
- **Monitor:** ✅ Se miran solo las áreas impositivas de ARCA; la Aduana no le interesa a SYS.

### 9. Impuesto a los débitos y créditos ("impuesto al cheque")
- **Qué regula:** Ley 25.413 y Decreto 380/2001. Las cuentas de pago están exentas, y el Decreto 475/2026 amplió exenciones. Si eso cambia, le cambia el costo a SYS y a sus clientes.
- **Dónde sale:** Boletín Oficial (decretos).
- **Monitor:** ✅

### 10. Ingresos Brutos provincial sobre billeteras *(Córdoba cubierta desde el 4/10/2026; el resto, no)*
- **Qué regula:** **SIRCUPA** (Comisión Arbitral, RG 9/2022) retiene Ingresos Brutos sobre lo que entra a cuentas de pago, y cada provincia adhiere y fija alícuotas por su cuenta. Por ejemplo, ARBA tiene un régimen propio para billeteras (RN 25/2025).
- **Dónde sale:** la Comisión Arbitral en el Boletín Oficial nacional (✅ cubierto); las provincias en **su propio boletín**.
- **Córdoba (base de SYS): ✅ cubierta en lo impositivo.** El Boletín Oficial de Córdoba bloquea conexiones de fuera de Argentina y el monitor corre en servidores de EE.UU., así que se lee **la normativa que publica Rentas Córdoba** en su sitio (feed RSS): resoluciones normativas y generales, de la Secretaría de Ingresos Públicos, ministeriales, leyes, decretos y disposiciones de la Comisión Arbitral, con el resumen de Rentas. Todo cuenta como organismo de Ingresos Brutos. Casos reales: los padrones mensuales con SIRCUPA (RG 2227 y 2228/2026) salen como "Le afecta". Lo que se pierde: normas provinciales no impositivas, que para SYS pesan poco.
- El historial del 22/9 al 2/10 sí tiene el Boletín de Córdoba completo (se armó desde Argentina); ahí la **RG 2229/2026** (padrón de octubre, SIRCUPA) sale como "Le afecta". Una norma que llega por las dos vías no se repite (tipo y número).
- **Resto de las provincias: ❌ no cubierto.** Hay que saber **en qué otras provincias tiene clientes SYS** (Guido lo va a preguntar) y sumar esos boletines. Cada uno tiene un formato distinto.

### 11. CNV *(depende de lo que haga SYS)*
- **Importa si** SYS remunera saldos con un fondo común de inversión o toca activos virtuales (PSAV).
- **Dónde sale:** Boletín Oficial.
- **Monitor:** ✅

### 12. Defensa del consumidor y Comercio
- **Alcance:** bajo en un producto para empresas, aunque una norma general sobre medios de pago puede alcanzarlo.
- **Dónde sale:** Boletín Oficial.
- **Monitor:** ✅

### 13. Datos personales
- **Qué regula:** Ley 25.326 y la AAIP. SYS trata datos de empleados de sus clientes. Hay proyectos de reforma de la ley.
- **Dónde sale:** Boletín Oficial.
- **Monitor:** ✅ Con peso bajo, para no traer ruido.

### 14. Congreso: proyectos de ley *(no cubierto)*
- **Ejemplos:** pago de sueldos en billeteras, reforma de la ley de datos personales, regulación fintech.
- **Por qué importa:** avisar cuando un proyecto **avanza** (dictamen, media sanción) le da meses de anticipación a SYS.
- **Fuente:** HCDN y Senado tienen buscadores públicos.
- **Estado:** queda para la segunda etapa.

### 15. BCRA: comunicados de prensa *(cubierto desde el 4/10/2026)*
- A veces el BCRA anuncia medidas por prensa antes de la comunicación formal (ejemplo: 3/9/2026, el perfil de riesgo de fraude para los PSPCP).
- **Monitor:** ✅ Lee las noticias de bcra.gob.ar/noticias. No son normas: llegan como mucho a "Para revisar". El sitio muestra las 10 más nuevas sin paginar por dirección; si las 10 resultaran nuevas, se avisa para mirar a mano.

---

## Qué llega a la página (desde el 4/10/2026)

Objetivo: que compliance vea solo lo que le cambia algo a SYS como billetera, con qué hacer. Las obligaciones de cualquier empresa (sueldos, aportes, sus propios impuestos) quedan afuera: las lleva el contador.

1. **Reglas** (sin IA): para "Para revisar" hace falta al menos un tema de peso medio (no alcanza con "entidades financieras" + el organismo), salvo la UIF, cuyas normas valen para todos los sujetos obligados. Se descartan edictos y archivos de sumarios, designaciones de personal y el "QR" mencionado de pasada ("se paga con VEP o QR"). Las comunicaciones "B" de tasas de referencia ya no pasan.
2. **IA** (Gemini): da un veredicto (aplica / puede aplicar / no aplica), qué cambia, cómo le afecta y **qué hacer** con plazo. Si dice "no aplica", la norma va a una lista plegada al final del día, con el motivo, y no genera mail. Si confirma que aplica, pasa a "Le afecta". Lo que el BCRA dirige a los PSP es "Le afecta" siempre. Si la IA no responde, mandan las reglas.

Resultado sobre el historial del 22/9 al 2/10: de 25 normas mostradas se pasó a 3 que le afectan (RG 2229 de Rentas: usar el padrón de octubre; A 8487: feriado bancario del 10/11; A 8488: leer la A 8472) y 5 plegadas.

---

## Ajustes del filtro que salieron de datos reales (5/10/2026)

El estudio sobre el Boletín de julio a septiembre de 2026 (4.254 normas; ver `docs/estudio-palabras.md`) encontró por qué se colaban normas ajenas:

- **"PSP" también es "prestadores de servicios postales"** (PSP/courier) en las normas de Aduana: ya no cuenta como proveedor de pagos.
- **"Transferencia electrónica de fondos"** aparece como forma de pagarle a ARCA ("cancelar mediante transferencia electrónica de fondos"): ahora es un término débil. "Transferencias inmediatas" sigue siendo fuerte.
- **Números de ley sueltos:** un DNI terminado en "327.739" contaba como la Ley 27.739. Ahora los números de ley (27.739, 25.246, 25.413, 25.326) cuentan solo cerca de la palabra "ley".
- **La Ley 27.739 citada en considerandos** de normas ajenas (ej.: programa de ciberdelito) pasó de término fuerte a medio. Lo de la UIF entra igual por el organismo.
- **La IA no puede esconder** lo que nombra la actividad de SYS ni lo de la UIF: como mucho, "Para revisar".
- **Encabezados del BCRA** que no empiezan con "A LOS…" ("ADQUIRENTES DE PAGOS CON TARJETA:") ahora se leen bien.

Cada ajuste tiene un test con el texto real que lo motivó (`src/reglas.test.ts`, `src/explicar.test.ts`).

---

## Cómo explica el informe cada norma

Cada norma que pasa el filtro trae, **sin IA**, recortes literales de la propia norma más un texto fijo por tema:

- **Qué cambia:** en el BCRA, la carta de la comunicación ("Nos dirigimos a Uds…"), que es el resumen que hace el propio BCRA, o la resolución textual si la trae. En el Boletín Oficial, el artículo 1°.
- **Para qué:** el considerando que dice el objetivo ("resulta necesario…", "con el fin de…").
- **Cómo le afecta a SYS:** si va dirigida a los PSP o solo los nombra, más el impacto del tema (los textos están en `src/temas.ts` y salen de los frentes de este análisis). El tema sale del código de circular del BCRA (CAMEX, SINAP, CONAU…) o del organismo emisor (UIF, ARCA, CNV…).
- **Fechas clave:** las oraciones con vigencia, plazos o vencimientos.
- **Dónde nombra a SYS:** el pasaje donde aparece su actividad.
- **Normas relacionadas:** las comunicaciones citadas, con link y de qué tratan. Es clave en las "actualizaciones del texto ordenado", donde el cambio de fondo está en otra comunicación (ej.: la A 8488 remite a la A 8472).

Si alguna vez se suma IA, sería para reescribir esto en dos líneas; la base por reglas queda igual.

---

## Lo que hay que preguntarle a SYS

Las respuestas cambian qué se vigila y con qué peso.

1. **¿En qué provincias tienen clientes?** Define qué boletines provinciales sumar para Ingresos Brutos.
2. **¿Emiten tarjetas** (prepagas o corporativas)? Si sí, entra la Ley de Tarjetas 25.065 y su normativa.
3. **¿Remuneran los saldos?** ¿Con qué fondo? Define cuánto pesa la CNV.
4. **¿Hay pagos en el exterior o en moneda extranjera?** Define cuánto pesa "Exterior y cambios".
5. **¿Los clientes son solo empresas,** o también personas, por ejemplo empleados con cuenta propia? Define cuánto pesa la protección de usuarios.
6. **¿A quién le llega el aviso, y cómo?** Mail a legales o compliance, Slack, etc.
7. **¿Algún tema puntual que les preocupe hoy?**

---

## IA: activada, en el nivel gratuito

**La detección sigue siendo por reglas.** La IA solo escribe el recuadro "En pocas palabras" (qué cambia y cómo le afecta a SYS, en dos líneas) de las normas que ya pasaron el filtro. Va marcado como resumen automático; abajo queda el texto literal de la norma.

- **Servicio:** Google Gemini, nivel gratuito de AI Studio, sin facturación activada (no puede cobrar). Clave en `.env` (`GEMINI_API_KEY`), que no se sube.
- **Cupos reales de la cuenta** (vistos en AI Studio el 3/10/2026, pedidos por minuto / por día): Gemini 3.5 Flash-Lite 15/500, 3.1 Flash-Lite 15/500, 2.5 Flash-Lite 10/20. Se usan en ese orden: si uno no responde, prueba el siguiente.
- **Consumo:** una norma = un pedido. El peor caso son unas 30 por día (6% del cupo). Hay una pausa de 6 segundos entre pedidos para quedar abajo del tope por minuto. Prueba real: 31 normas de 5 días, 31 resúmenes, pico de 7 pedidos por minuto.
- **Si falla** (sin cupo, Google caído, clave vencida): la norma sale igual, con la explicación por reglas, y "Qué se revisó" dice cuántas quedaron sin resumen.
- **Advertencia:** en el nivel gratuito, Google puede usar lo que recibe para mejorar sus productos. Solo se le mandan normas públicas; **nunca datos internos de SYS**.
- **Google puede bajar los cupos gratis cuando quiera** (ya lo hizo en 2025). Por eso la IA es un agregado y no una dependencia.

---

## Dónde correrlo sin gastar

**Propuesta: GitHub Actions + GitHub Pages en un repositorio público.** Guido confirmó (3/10/2026) que no hay nada secreto: todo es información de los boletines.

- **Corrida:** de lunes a viernes a las 9:47 (ya salió el Boletín) y a las 21:47 (el BCRA ya publicó lo del día), y sábados a las 11:47 (hora argentina), cada una con un respaldo hora y media después por si GitHub la saltea. Cada corrida suma solo lo nuevo; si una falla, la siguiente recupera lo que faltó. En repos públicos, Actions no tiene límite de minutos.
- **Link:** la página del monitor (`salida/index.html`) se publica en GitHub Pages, gratis en repos públicos. Una sola dirección para entrar todos los días.
- **Estado e historial:** `datos/estado.json` y `datos/informes/` se guardan en el mismo repo después de cada corrida. No hace falta base de datos.
- **Clave de Gemini:** va como "secreto" del repo, nunca en el código.
- **Aviso por mail (opcional):** solo los días con algo que "Le afecta" o con una fuente caída, con el link.

**Limitaciones a tener en cuenta:**
- Los cron de GitHub pueden **atrasarse** varios minutos, a veces más, en horas pico. Para normas eso no es grave.
- GitHub **apaga los cron de un repo sin actividad por 60 días.** El commit diario del estado lo mantiene activo, pero si el monitor deja de commitear, hay que volver a activarlo a mano.
- Si mañana el BCRA o el Boletín cambian el formato de su web, el monitor **falla de forma visible**: el informe lista "Fuentes que fallaron", nunca dice "no hubo nada" en silencio. Igual alguien tiene que leer ese aviso.
- En un repo público también quedan a la vista estos documentos (incluidas las preguntas para SYS y las notas del proyecto).

---

## Resguardos para no perder nada (4/10/2026)

El peor error es decir "no hubo nada" cuando sí hubo. Cada fuente tiene un control para que una falla se vea:

- **Boletín Oficial, día sin edición vs. falla:** un día sin edición el sitio redirige a la portada; eso es "no hubo edición". Si la página del día responde pero no se reconoce ningún aviso, o no se puede leer el texto de más de un cuarto de ellos, es un **error visible** (posible cambio de formato).
- **Boletín Oficial, días que fallaron:** se recuerda el último día leído completo (`boletinHasta` en `datos/estado.json`). Cada corrida lee desde ahí hasta hoy (hasta 31 días; si faltan más, lo avisa), así un día caído se recupera solo. El día anterior se relee una vez más por si se agregó algo tarde.
- **BCRA, cambio de dirección de los PDF:** antes de buscar novedades se confirma que la última comunicación leída sigue existiendo. Si no, es error (si no, se vería "0 nuevas" para siempre).
- **BCRA, comunicaciones publicadas fuera de orden:** si falta un número entre dos publicados, queda como pendiente y se vuelve a buscar en cada corrida durante 30 días.
- **Textos ordenados:** son la red de seguridad; si una comunicación se escapara, el cambio en el texto ordenado la delata.
- **Sin repetidos:** una norma ya informada (por link, o por número si es del BCRA) no vuelve a aparecer.

**Lo que ningún control cubre:** que el filtro por reglas descarte una norma que sí importaba (por eso el filtro es generoso), lo que no se publica en estas fuentes (boletines provinciales salvo lo que Rentas Córdoba sube a su sitio, Congreso) y alguna sección del Boletín distinta de la primera.

**Rentas Córdoba sube tarde y no todo (verificado el 6/10/2026):** la RG 2228/2026 (padrón de septiembre de SIRCUPA) nunca apareció en su feed, y la RG 2229/2026 (padrón de octubre, Boletín de Córdoba del 30/9) seis días después todavía no estaba. Lo que Rentas no sube, el monitor no lo ve.

---

## Fuentes consultadas

- [SYS Global Pay](https://www.sys.com.ar/)
- [BCRA: texto ordenado de Proveedores de Servicios de Pago](https://www.bcra.gob.ar/archivos/Pdfs/Texord/t-snp-psp.pdf)
- [BCRA: Com. A 8488](https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A8488.pdf)
- [BCRA: Com. A 8398 en el Boletín Oficial](https://www.boletinoficial.gob.ar/detalleAviso/primera/338304/20260209)
- [Res. UIF 200/2024](https://www.boletinoficial.gob.ar/detalleAviso/primera/318446/20241219)
- [Allende & Brea: UIF y PSP](https://allende.com/bancario/nueva-reglamentacion-de-la-uif-aplicable-a-proveedores-de-servicios-de-cobros-y-o-pagos-12-20-2024/)
- [RG ARCA 5804/2025](https://www.boletinoficial.gob.ar/detalleAviso/primera/336723/20251224) · [iProfesional: montos informados](https://www.iprofesional.com/impuestos/464797-arca-fijo-los-montos-que-bancos-y-billeteras-informan-por-las-transferencias)
- [Decreto 475/2026](https://www.boletinoficial.gob.ar/detalleAviso/primera/343279/20260618) · [Tributum: Dec 475/2026](https://tributum.news/dec-475-2026-impuesto-al-cheque-exenciones-psp-psav-tarjetas-transportadoras-de-caudales-exencion/)
- [SIRCUPA (Infobae)](https://www.infobae.com/opinion/2022/10/10/10-claves-sobre-el-nuevo-impuesto-a-las-billeteras-virtuales-el-sircupa/) · [ARBA y billeteras (TradingView/Cointelegraph)](https://es.tradingview.com/news/cointelegraph:25b99558a09cd:0/)
- [BCRA: Exterior y cambios](https://www.bcra.gob.ar/archivos/Pdfs/Texord/t-excbio.pdf) · [BCRA: riesgos de tecnología](https://www.bcra.gob.ar/archivos/Pdfs/Texord/t-rmrtsd.pdf)
