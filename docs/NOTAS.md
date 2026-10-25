# Notas del proyecto

Contexto y decisiones de este proyecto. Se guarda acá, dentro de la carpeta, a propósito: **no se mezcla con ningún otro proyecto** (pedido explícito de Guido, 3/10/2026).

## Contexto
- Cliente: **SYS Global Pay**, billetera virtual para empresas, PSP registrado en el BCRA.
- Pedido original: scrapear el Boletín Oficial todos los días y avisar cuando salga algo del BCRA o similar que afecte a billeteras virtuales o a SYS.
- Arranque: 3/10/2026, de cero.

## Decisiones
- **Proyecto totalmente aparte.** Nada de código, datos, cuentas ni memoria compartidos con otros proyectos.
- **Sin presupuesto nuevo.** Si se usa IA, tiene que ser gratuita o casi gratuita. Por eso la detección es por reglas y la IA queda solo como un extra opcional para resumir.
- **Filtro generoso.** Perder una norma que afecta a SYS es peor que mostrar una de más, por eso hay dos niveles: "Le afecta" y "Para revisar".
- **Una fuente caída no puede verse como "no hubo nada".** El informe lista las fuentes que fallaron y el proceso sale con error.

## Estado al 3/10/2026 (noche)
- Prototipo andando en local: Boletín Oficial, comunicaciones del BCRA (A, B y C) y 9 textos ordenados.
- Validado contra 4 normas reales históricas: las 4 detectadas. 17 tests en verde.
- **Nuevo:** cada norma trae explicación sin IA (qué cambia, para qué, cómo le afecta a SYS, fechas clave, dónde nombra a SYS, normas relacionadas con link y de qué tratan) y un "qué hacer".
- **Nuevo:** informe visual en `salida/AAAA-MM-DD.html` (anda en celular y en modo oscuro) e historial en `salida/index.html`. Las "Para revisar" van plegadas.
- **Nuevo:** regla de feriados bancarios (llegan a "Para revisar").
- Todavía no corre solo, no manda mails y no tiene IA.

## Estado al 3/10/2026 (más tarde)
- **Una sola página** (`salida/index.html`) con pestañas: Último informe, Todas las normas (filtros por nivel y tema, buscador), Por día, Cómo funciona. Pedido de Guido: todo junto y clarísimo, nada de un HTML por día.
- Los informes se guardan como datos en `datos/informes/`. `npm run pagina` rearma la página sin revisar las fuentes.
- **IA activada:** Gemini, nivel gratuito (confirmado en AI Studio: "Nivel gratuito", sin facturación). Recuadro "En pocas palabras" en cada norma, marcado como IA. Prueba: 31 de 31 normas resumidas. Detalle de cupos en `docs/analisis-regulatorio.md`.
- La clave está en `.env` y en el secreto del repo; Guido decidió no regenerarla (4/10).
- La clave es de la cuenta personal de Google de Guido ("Default Gemini Project"). Si usa esa cuenta para otras cosas con la API, comparten cupo.
- **Decisión de Guido:** el repo puede ser **público**, no hay nada secreto.

## En producción desde el 3/10/2026
- **Link:** https://sys-normativa.github.io/
- **Repo (público):** https://github.com/sys-normativa/sys-normativa.github.io. Decisión de Guido: público, no hay nada secreto.
- **Corre solo** con GitHub Actions (`.github/workflows/monitor.yml`): lunes a viernes a las 9:47 y a las 21:47, y sábados a las 11:47 (hora argentina), cada una con respaldo hora y media después (11:23, 23:23, 13:23). Elegido el 4/10 con Guido (10 y 22); el 5/10 se corrió fuera de la hora en punto porque la primera corrida automática (lunes 10:00) GitHub no la largó a tiempo: a la hora en punto atrasa o saltea tareas programadas. Se puede correr a mano desde la pestaña Actions → "Run workflow".
- Cada corrida guarda `datos/` en el repo (commit "Guardar informe del …") y publica la página. Si una fuente falla, el informe igual se publica y el workflow queda en rojo.
- **Aviso por mail:** cuando hay algo nuevo (o falla una fuente) se crea un issue que menciona a @Guidoparisi91; GitHub lo manda al mail de la cuenta. Hay que confirmar en GitHub → Settings → Notifications que ese mail sea guidoparisi91@gmail.com. Prueba enviada: issue #1.
- **Clave de Gemini:** secreto `GEMINI_API_KEY` del repo (y `.env` en la compu).
- **Historial:** arranca con los 9 días hábiles anteriores (22/9 al 2/10; los del 22 al 28/9 se sumaron el 4/10), armados con `npm run historial`: Boletín de ese día + comunicaciones del BCRA con esa fecha. Los 4 días sueltos de la validación se sacaron del historial (la validación sigue documentada en el análisis).
- Una comunicación del BCRA que ya salió un día no se repite cuando después aparece en el Boletín Oficial.
- Días sin Boletín (fines de semana, feriados) y sin novedades no generan informe vacío.

## Fuentes sumadas el 4/10/2026
- **Boletín Oficial de Córdoba** (base de SYS): 1ª Sección, norma por norma. Rentas Córdoba cuenta como organismo de Ingresos Brutos. Probado con los 9 días del historial: todos se leen; la RG 2229 de Rentas (30/9) sale como "Le afecta".
- **Prensa del BCRA:** noticias de bcra.gob.ar, como "Para revisar" a lo sumo.
- El historial (22/9 al 2/10) se completó con estas dos fuentes.
- Punto de partida: `cordobaHasta` = 2/10 y `prensaVistas` = las 10 noticias hasta el 2/10.
- **Problema (4/10):** el Boletín de Córdoba **bloquea conexiones de fuera de Argentina** (CloudFront, 403 en todo: páginas y PDF, con cualquier navegador). Desde la compu de Guido anda; desde GitHub Actions (EE.UU.), no. No se intenta esquivar el bloqueo. La web de Rentas Córdoba sí responde desde GitHub, pero es una aplicación sin páginas legibles y solo cubriría Rentas.
- Mientras se decide: la corrida en la nube marca Córdoba en rojo (no se esconde) y el mail de una fuente caída sale **una sola vez** cuando empieza a fallar (`fallasAvisadas` en el estado), no en cada corrida.
- Guido descartó leer nada desde su compu ("o encontrás una ruta o lo sacamos").
- **Solución (4/10):** Rentas Córdoba publica su normativa en un feed RSS que sí responde desde GitHub. Reemplaza al Boletín de Córdoba en la corrida diaria. Cubre lo impositivo (lo que le importa a SYS); se pierden las normas provinciales no impositivas. Se sacó el lector del Boletín de Córdoba. Punto de partida: `rentasVistas` = las 9 normas publicadas hasta el 2/10.

## Menos ruido (4/10/2026)
- Guido: "no quiero información al pedo, quiero que sea útil". Los resúmenes de IA decían casi todos "no le aplica", porque el filtro dejaba pasar mucho ruido.
- Cambios: filtro más estricto (detalle en el análisis), la IA da veredicto + qué hacer, y lo que la IA descarta va plegado y sin mail. Tarjetas: resumen arriba, texto de la norma plegado.
- Historial rearmado con todo esto: 3 normas que le afectan y 5 plegadas en 9 días. La RG 2229 (Boletín de Córdoba) se reincorporó a mano porque ese sitio no se puede volver a leer desde el servidor y Rentas todavía no la subió.

## Validación y estudio de palabras (noche del 4 al 5/10/2026)
- Pedido de Guido: validar con un historial grande, sacar palabras clave de datos reales, que "Para revisar" exista con sentido y que la IA no pueda esconder algo importante.
- **Cambio de lógica:** si una norma nombra la actividad de SYS (término fuerte) o es de la UIF, la IA no la puede plegar: como mucho va a "Para revisar". Solo se pliega lo que pasó con palabras débiles y la IA descartó.
- `npm run validar` → `docs/validacion.md`: 10 casos reales con link verificado (8 de 9 exigidos aparecían; faltaba la Res. UIF 78/2025, que ahora queda como "Para revisar" por la regla de la UIF), 189 comunicaciones A del BCRA (las 31 dirigidas a PSP salen como "Le afecta"), 20 días de Boletín (1.401 normas → 2 "Le afecta" y 2 "Para revisar").
- Arreglo: 3 comunicaciones (A 8310, 8326, 8381) tenían destinatarios sin "A LOS" ("ADQUIRENTES DE PAGOS CON TARJETA:") y el lector no los leía. Ninguna iba a los PSP en general.
- `npm run estudio` → `docs/estudio-palabras.md`: comunicaciones A 8000 a 8488 y Boletín de julio a septiembre de 2026 (4.254 normas). Resultado: **0 huecos** entre 250 normas "casi" que vio la IA (de 606), pero bastante ruido en "Para revisar". Las causas, todas corregidas con test: "PSP" = prestadores de servicios postales (courier), "transferencia electrónica de fondos" como forma de pagarle a ARCA, un DNI que coincidía con "27.739", y la Ley 27.739 citada en considerandos (pasó a peso medio). Detalle en el análisis regulatorio.
- **Validación después de los ajustes:** 9 de 9 casos reales aparecen, 0 encabezados del BCRA ilegibles, 31 de 31 dirigidas a PSP como "Le afecta", 20 días de Boletín → 2 "Le afecta" + 2 "Para revisar". 43 tests en verde. Subido.
- **Estudio rápido después de los ajustes (5/10, `npm run estudio-rapido`, ~15 min):** en 3 meses de Boletín (4.254 normas) se muestran **6 "Le afecta"** (todas del BCRA: fraude, pagos, régimen informativo) y **4 "Para revisar"** (2 de la UIF, 1 de la CNV, 1 que nombra billeteras). Antes de los ajustes eran 7 y 13.
- Historial del 22/9 al 2/10 rearmado con la lógica nueva (y la RG 2229 de Rentas reincorporada a mano).
- **Pendiente:** que la IA revise las ~360 normas "casi" que nunca vio (`npm run estudio`, la versión completa, tarda más de una hora).

## Datos y límites
- No hay base de datos: cada día es un JSON en `datos/informes/` (~7 KB). Un año ≈ 2 MB. La página embebe todo: al año pesa ~2 MB, carga bien. Si en unos años pesa demasiado, mostrar solo los últimos meses en la página.
- Límites de GitHub (repo público, gratis): Actions sin límite de minutos; Pages hasta 1 GB por sitio; repo recomendado < 1 GB. Sobra.
- GitHub apaga los cron tras 60 días sin commits; el commit diario de `datos/` lo evita.
- Aviso de GitHub (3/10/2026): las acciones `checkout@v4`, `setup-node@v4`, `configure-pages@v5`, `deploy-pages@v4`, `upload-artifact@v4` usan Node 20, que está deprecado; hoy corren igual. Actualizar las versiones cuando salgan las nuevas.
- `ubuntu-latest` pasa a Ubuntu 26 desde el 19/10/2026; no debería afectar.

## Cambios del 5/10/2026
- Pestañas en el orden que pidió Guido: Cómo funciona, Por día, Último informe. La página sigue abriendo en Último informe. En celular las tres entran enteras (antes se cortaba "Cómo funciona").
- **Corrida programada a confirmar:** GitHub no largó la de las 10:00 del 5/10. Se agregó que cada push a `main` corra el monitor y publique, así los cambios se ven enseguida (primera prueba 5/10 10:37: publicó bien). Falta ver que el respaldo de las 11:23 salga solo; si las programadas siguen sin salir, proponerle a Guido un disparador externo gratuito (cron-job.org llamando a "Run workflow" con un token), que requiere crear cuenta.
- El Boletín del domingo 4/10 daba "fetch failed" siempre: un día sin edición el sitio redirige a la portada, y desde GitHub la portada falla. Ahora la redirección no se sigue: alcanza con verla para saber que no hubo edición. Se siguen mirando todos los días, fines de semana incluidos, porque el Boletín a veces sale sábado o domingo (verificado: 11/4/2020 y 26/4/2020). Las demás fuentes (BCRA, Rentas, prensa) no van por fecha: cada corrida trae todo lo nuevo desde la anterior, así que lo de un fin de semana sale en la corrida siguiente.
- **Revisión de "que no se pierda nada"** (pedida por Guido: va a haber más fuentes, tiene que ser prolijo). Se agregó: (1) el Boletín ya no saltea días en silencio si el monitor estuvo parado mucho tiempo: lee hasta 31 días para atrás y, si faltan más, lo avisa; (2) la página muestra un aviso rojo si dejó de actualizarse; (3) el guardado del workflow ya no falla si se subió otro cambio mientras corría. La regla de cobertura quedó escrita en CLAUDE.md para las fuentes nuevas.
- **Hueco que queda:** si GitHub no corre, nadie recibe un mail (el aviso aparece en la página pero hay que entrar a verla). Solución propuesta: disparador externo gratuito (cron-job.org) o un chequeo externo que mande mail. Decide Guido.
- Pendiente de decisión de Guido: el tablero muestra "1 Le afecta" junto a "0 Para revisar / Sin novedades" y se lee contradictorio. Propuesta: renombrar los niveles a "Impacto directo" y "Posible impacto", y poner "Ninguna" en vez de "Sin novedades" cuando el contador está en 0.
- **Errores del informe del 5/10 a la noche (queja del cliente):** (1) "Boletín Oficial: fetch failed": el Boletín de hoy ya se había leído completo a la mañana (73 normas); falló la relectura de la noche por un corte de conexión desde GitHub (desde acá respondía bien). Ahora: 4 intentos con esperas de 5 s, 20 s y 60 s (antes 3 en 6 s); si igual falla la relectura de un día ya leído hoy, no figura como error (el día queda pendiente y la próxima corrida lo relee); y los errores de conexión se explican en castellano en vez de "fetch failed". (2) Rentas Córdoba: el sitio estaba en mantenimiento (redirigía a mantenimiento.rentascordoba.gob.ar); ahora lo dice así en vez de "¿cambió el formato?". No se perdió ninguna norma. **Decisión de Guido (5/10): el cliente no puede ver nunca más un error técnico.** Las fallas van solo al mail de Guido; la página del cliente muestra una fuente como "demorada" (texto formal) solo si lleva más de 24 h fallando (`fallasDesde` en `datos/estado.json`, `demoras` en el informe). El Boletín no estaba caído: lo que falló fue la conexión GitHub→Boletín; el error ahora incluye el código técnico para diagnosticar la próxima vez. **Diagnóstico de la noche del 5/10:** de las 2 corridas desde GitHub a la noche (18:30 y 22:35), las dos fallaron con el Boletín ("aborted due to timeout": el sitio no terminó de mandar las páginas en 30 s, 4 veces), y además se cortó la descarga de un texto ordenado del BCRA ("terminated"). Desde esta compu, a la misma hora, el Boletín completo (73 normas) se lee en 5 s. A la mañana desde GitHub anduvo. Hipótesis no confirmada: los sitios del Estado limitan o enlentecen las conexiones desde servidores de afuera (como ya hace el Boletín de Córdoba). Cambios: la descarga del cuerpo ahora está dentro de los reintentos; `boletinHoy` en el estado recuerda que el Boletín del día ya se leyó. **Horarios de GitHub:** de las 4 corridas programadas del 5/10 (9:47, 11:23, 21:47, 23:23) solo arrancó una, a las 18:30, con ~7 h de atraso. **Disparador externo activo desde el 5/10/2026 (noche):** tarea en cron-job.org (cuenta de Guido, gratis) que llama a "Run workflow" de GitHub de lunes a sábado a las 9:47 y 21:47 (zona Buenos Aires), con una clave de GitHub (fine-grained, solo Actions del repo) que cargó Guido; la clave vence: anotar la fecha y renovarla. Prueba 5/10 23:05: corrió completa sin errores. Los horarios propios de GitHub quedan de respaldo. Si falla el Boletín, el BCRA o un texto ordenado, la corrida publica lo demás y se vuelve a lanzar sola a los 15 min (`gh workflow run` con el token del workflow, input `reintento`), hasta que ande o hasta 32 intentos (8 h); el mail de la falla sale una sola vez. Todavía no se vio en una falla real (5/10). La tarea de cron-job.org quedó `47 9,21 * * *` (verificado). Mientras una fuente falla hace menos de 24 h, la página del cliente la muestra en gris como "actualización en curso" (`enCurso` en el informe), nunca como verificada. **Revisión completa (5/10 noche), corregido:** (1) una corrida de madrugada (antes de que salga el Boletín) dejaba anotado "hoy sin edición" y, si después fallaba la lectura de la mañana, se mostraba "no hubo edición" sin error; ahora solo cuenta una lectura con normas. (2) Un día cuya fuente falló a la noche y se leyó al día siguiente quedaba "en actualización" para siempre; ahora se limpia (`limpiarDiasAnteriores`). **Pendiente de Guido:** activar el aviso por mail de fallas de cron-job.org, anotar el vencimiento de la clave de GitHub.

## Noche del 5/10/2026: problemas y cómo quedó (resumen para revisar el 6/10)

**Qué pasó (el cliente se quejó):**
- El informe del 5/10 a la noche mostraba dos errores técnicos al cliente: "Boletín Oficial: fetch failed" y "Rentas Córdoba: ¿cambió el formato?".
- Rentas: el sitio estaba en mantenimiento (redirigía a mantenimiento.rentascordoba.gob.ar). Verificado.
- Boletín: **el sitio no estaba caído**; falló la conexión desde los servidores de GitHub (EE. UU.). Desde la compu de Guido andaba (73 normas en 5 s). Lecturas del 5/10 desde GitHub: 10:47 bien, 10:56 bien, 18:30 falla (no conectó), 22:35 falla (timeout y un PDF del BCRA cortado a mitad), 22:50 bien (ya con el arreglo). Causa de fondo no confirmada.
- GitHub no respetó los horarios programados: de las 4 del 5/10 solo arrancó una, a las 18:30, con ~7 h de atraso.

**Qué se cambió (todo subido y probado con tests; la corrida de las 22:50 y la de prueba de las 23:05 salieron sin errores):**
1. El cliente nunca ve errores técnicos. Las fallas van solo al mail de Guido. En la página: fuente que falla hace menos de 24 h → gris "actualización en curso"; más de 24 h → "consulta demorada" en texto formal. Los días ya recuperados se limpian solos.
2. Reintentos: 4 intentos por pedido (esperas de 5 s, 20 s, 60 s), con la descarga completa adentro. Si igual falla el Boletín, el BCRA o un texto ordenado, el workflow se vuelve a lanzar solo cada 15 min hasta que ande (tope 32 intentos = 8 h). Un solo mail por falla. **Todavía no se vio en una falla real.**
3. Errores explicados en castellano (con el código técnico para diagnosticar) y mantenimiento de Rentas informado como tal.
4. Corregido: una corrida de madrugada podía hacer que una falla posterior se mostrara como "no hubo edición".
5. **cron-job.org** (cuenta de Guido, gratis) lanza el monitor a horario: `47 9,21 * * *` (todos los días, domingo incluido; verificado 5/10 noche), zona Buenos Aires, con una clave de GitHub que cargó Guido. Los horarios de GitHub quedan de respaldo.

**Horarios de publicación medidos:**
- BCRA (hora de subida de ~65 PDF de agosto a octubre): "A" entre 12:24 y 18:46 (lo habitual, 16 a 18 h); "B" entre 9:56 y 17:56; "C" entre 10:51 y 18:12. Nunca después de las 19 h → la pasada de las 21:47 agarra todo el día.
- Boletín: a las 23:30 del 5/10 la edición del 6/10 todavía no estaba. Quedó un control midiendo la hora exacta de salida (resultado abajo, cuando esté).

**Decisiones de Guido (5/10):**
- Por ahora se deja así: pasadas a las 9:47 y 21:47.
- No quiere que el monitor reintente sin fin cuando el Boletín del día todavía no salió.
- Quedó propuesto, sin decidir: marcar el informe de la mañana como parcial ("se completa con la revisión de las 21:47") para que nunca diga "sin novedades" antes de que termine el día.

## Revisión del 6/10/2026
- Corridas del 6/10 (hora de inicio aprox.): 3:55 y 6:05 son los horarios propios de GitHub del lunes a la noche (21:47 y 23:23) largados con 6-7 h de atraso; 9:47 la lanzó cron-job.org (anduvo, terminó 9:50).
- **El Boletín del 6/10 ya estaba publicado a las 3:57 (69 normas)** → la pasada de las 9:47 llega bien.
- **Error corregido:** la pasada de las 9:47 no pudo releer el Boletín (ya leído a la madrugada) y, al no contarlo como día con edición, borró el informe del martes como si fuera feriado. Ahora un Boletín ya leído hoy cuenta como edición. Informe del 6/10 recuperado.
- **Pedido de Guido (6/10): horarios siempre en hora argentina**, en este y en todos sus proyectos (quedó también en sus preferencias generales de Claude, sin nada de este proyecto).
- **Horarios de GitHub (decisión 6/10, pedido de Guido "por qué siguen si ya está el cron"):** del 4 al 6/10 GitHub largó 3 de sus 8 corridas programadas, todas con 6 a 8 h de atraso (de ahí las de las 3:57 y 6:10). Se sacaron como horario de revisión. Quedó un **control cada 3 h**: si la última revisión (`ultimaCorrida` en el estado) tiene menos de 13 h, termina en segundos sin hacer nada; si tiene más, cron-job.org dejó de lanzarlo → revisa igual y manda un mail "no se revisó a horario". Es el aviso que faltaba si se vence la clave o se pausa la tarea de cron-job.org.
- **Recorrido del Boletín separado en `src/boletin.ts` con 7 tests** (ahí salieron los dos errores del 5 y 6/10). Corregido además: una relectura de hoy que no ve edición ya no pisa una lectura anterior con normas (habría borrado el informe igual que hoy). 50 tests en verde.
- **Revisión del detector (6/10):** no está fallando. El último "Le afecta" fue el 2/10 (A 8488, a los PSP); en los 11 días hábiles del 22/9 al 6/10 hubo 3. Del 5 y 6/10 se leyeron a mano las 142 normas del Boletín y las comunicaciones A 8484-8489, B 13236-13241 y C 102398-102402: nada que le afecte a SYS como billetera. Lo más cercano: RG ARCA 5908/2026 (nuevo servicio web para la DDJJ de Ganancias de sociedades), que queda afuera a propósito (obligación de cualquier empresa, la lleva el contador).
- **Hueco encontrado: Rentas Córdoba.** Su feed está incompleto y atrasado: la RG 2228/2026 (padrón de septiembre, SIRCUPA) nunca apareció, la RG 2229/2026 (30/9) todavía no está, y lo último del feed es del 24/9.

## Revisión del 9/10/2026
- Corridas del 7 al 9/10: todas a horario (9:48 y 21:49), sin errores ni fuentes demoradas.
- **Alerta del 9/10: Ley 27.826 (modifica la Ley 27.799 de Inocencia Fiscal). Es correcta.** Art. 7 (nuevo art. 40 bis de la 27.799): los sujetos obligados ante la UIF (SYS) tienen que tomar la constancia de adhesión al Ganancias simplificado como antecedente favorable al identificar y monitorear clientes; la UIF tiene que dictar la norma complementaria y ARCA tiene que habilitar una consulta/API para validar si el cliente está adherido. También obliga a esos contribuyentes a mover sus fondos por medios autorizados por el BCRA o la CNV. Las reglas la dieron "Para revisar" y la IA la subió a "Le afecta". Detalle menor: el "qué hacer" de la IA dice "consultar las API de ARCA", que todavía no existen. Lo que hay que esperar es la resolución de la UIF (va a salir sola en el monitor: lo de la UIF nunca se pliega).
- **Revisión a mano del 7 al 9/10:** 229 normas del Boletín, comunicaciones A 8489-8490, B 13242-13245, C 102403-102416, prensa del BCRA. Nada más que le afecte a SYS (cajeros, tasas, liquidez, tipo de cambio, edictos, designaciones; CNV RG 1171 es de hechos relevantes de emisoras). No se pasó nada.
- Rentas Córdoba subió la RG 2229/2026 recién el 9/10 (salió el 30/9). No se va a repetir: ya está en el informe del 30/9 y se reconoce como la misma norma (`claveCordoba`). La RG 2228 sigue sin aparecer en el feed.

## 10/10/2026: informe también los fines de semana
- Guido vio la página "Actualizado 10/10 9:49" pero mostrando el viernes 9 en "Último informe" y "Por día". Era a propósito: un fin de semana o feriado sin edición del Boletín ni novedades no generaba informe. Para el cliente parecía que no se había revisado. Ahora `guardarDia` guarda siempre el informe del día, aunque esté vacío ("Sin novedades", con las fuentes consultadas). La corrida de cron-job.org sigue siendo todos los días (la nota vieja de "sumar Domingo" ya estaba resuelta desde el 5/10).
- **Chequeo general (10/10 noche):** todas las corridas desde el 6/10 salieron bien y a horario (cron-job.org 9:47 y 21:47, 1 a 3 min cada una); sin fuentes caídas, sin números del BCRA pendientes. Se corrigió la guía del cliente ("Actualización y notificaciones" decía lunes a viernes + sábado al mediodía y que había mail ante fallas: ahora dice todos los días y mail solo por normas), el aviso de página detenida (ahora 16 h siempre, antes 50 h el fin de semana) y se ocultó al cliente la línea "Resumen con IA" de "Fuentes consultadas" (interna, y reflejaba solo la última corrida del día).

## 25/10/2026: el Boletín Oficial bloquea conexiones del exterior
- **Qué pasó:** desde el 22/10 a la mañana todas las corridas daban "Boletín Oficial: no se pudo conectar (UND_ERR_CONNECT_TIMEOUT)" y el cliente veía "consulta demorada" del 21 al 25/10. El sitio no estaba caído: **www.boletinoficial.gob.ar dejó de aceptar conexiones de fuera de Argentina** (probado el 25/10 desde EE. UU., Brasil, Alemania, España y Francia: todas cortan; desde la compu de Guido anda). GitHub corre en EE. UU. Lo mismo que ya hacía el Boletín de Córdoba. El BCRA, Rentas y el resto seguían bien. El reintento cada 15 min corrió decenas de veces sin chance (por eso tantos commits del 24/10).
- **Arreglo:** si la web no conecta (2 intentos), se lee el **PDF de la primera sección del día** que el propio Boletín publica en su repositorio de la Blockchain Federal (`otslist.boletinoficial.gob.ar/ots/?date_filter=DD-MM-AAAA`), que sí se ve desde afuera. Se separa cada aviso por su pie ("e. ... N° 79166/26 v. ..."). Probado contra la web del 21, 22 y 23/10: mismas normas (52, 58 y 65), mismos organismos y títulos, y el filtro da el mismo resultado. Diferencias: los avisos oficiales no tienen nombre propio (salen como "Aviso Oficial", igual que en la web) y **el link de cada norma lleva a la sección del día en la web** (el PDF no trae el link de detalle); para el cliente, desde Argentina, anda.
- **Días caídos recuperados:** las normas de un día que se lee tarde ahora van **al informe de su día** (antes iban al de hoy) y se limpian ahí los avisos de falla. El 22/10 tenía 2 normas que nunca se informaron: Comisión Arbitral RG 11/2026 (vencimientos SIRCAR; las reglas la dieron "Para revisar" y la IA la plegó: no toca SIRCUPA) y Com. A 8474 del BCRA publicada en el Boletín (firma digital en trámites de cuentas corrientes en el BCRA, "Para revisar"). El 21 (52 normas) ya se había leído bien; el 23 (65) sin nada; 24 y 25 sin edición.
- **Corregido de paso:** (1) una comunicación del BCRA publicada en el Boletín ya no puede salir "Le afecta" si no va dirigida a los PSP (misma vara que las de la web del BCRA; la A 8474 salía "Le afecta"); (2) en el Boletín figuran como "Aviso Oficial": ahora toman el número de la comunicación como título, así no se repiten si ya salieron por la web del BCRA.
- **Verificado en producción (25/10, corrida de las 11:14 a 11:17, lanzada por el push):** GitHub leyó el Boletín del 21 al 25/10 por el PDF, sin errores; los informes del 21 al 25 quedaron sin avisos de falla y `boletinHasta` = 2026-10-24. Antes había corrido un reintento con el código viejo (10:43 a 11:11): cada reintento con la web bloqueada tardaba ~28 min.
- **Si algún día también bloquean el repositorio:** el monitor vuelve a dar error (nunca "no hubo edición"). Alternativas en ese caso: InfoLEG y SAIJ se ven desde afuera, pero cargan las normas con días de atraso y sin los avisos oficiales.

## Próximos pasos
- **Vigilar el lector del PDF del Boletín (desde 25/10/2026)** en las próximas corridas: que cada día hábil tenga una cantidad de normas razonable (50 a 90).
- **Pedido de Guido (9/10): avisos a 2 mails más.** GitHub solo manda mails a cuentas de GitHub, así que se descartó (además el formato no es formal). Decisión: mandar por Gmail con contraseña de aplicación (gratis, ~500 mails/día). Código hecho (`src/mail.ts`, paso "Mandar el mail" del workflow, test): solo "Le afecta" y "Para revisar", en copia oculta, texto formal; las fallas técnicas siguen yendo solo a Guido por issue. Sin los secretos no hace nada.
  - **Funcionando desde el 9/10/2026 (12:53):** Guido cargó los 3 secretos (`GMAIL_USUARIO` = su Gmail, `GMAIL_APP_PASSWORD`, `AVISO_MAILS` = 2 destinatarios más y él mismo). Prueba con "Run workflow" + "Mandar un aviso de prueba": le llegó a Guido y a los destinatarios (a ellos, en spam: se les pidió marcarlo como "no es spam" y agendar el remitente). Las direcciones no se anotan acá (repo público). Si se revoca la contraseña de aplicación, sale un issue "no salió el mail a los destinatarios".
0. **Córdoba (lo más importante que falta):** buscar desde GitHub otra fuente de las normas de Rentas que el feed no trae (portal de la Legislatura/digesto, otras páginas de cba.gov.ar) con un workflow de diagnóstico; si ninguna anda desde afuera del país, decidir con Guido. Mientras tanto, el padrón mensual de SIRCUPA también lo publica la Comisión Arbitral, que sí se ve en el Boletín nacional.
   - Ver el primer control de GitHub con la última revisión vieja (o probarlo pausando cron-job.org un día) para confirmar que llega el mail.
   - Clave de GitHub de cron-job.org: Guido la creó por 365 días el 5/10/2026 (según recuerda) → **vence alrededor del 5/10/2027**; renovarla antes. Si vence, llega el mail del control. Pendiente de Guido: activar el mail de fallas de cron-job.org.
00. **Revisar el 6/10 (hecho, ver arriba):** (a) que la pasada de las 9:47 la haya lanzado cron-job.org (en Actions, evento `workflow_dispatch` a las ~9:47) y haya leído el Boletín del 6/10 con normas; (b) la hora a la que salió el Boletín del 6/10 y si 9:47 sirve; (c) la pasada de las 21:47; (d) si hubo fallas, que se haya reprogramado sola y que el cliente no haya visto nada técnico; (e) decidir lo del informe de la mañana "parcial".
   - Pendiente de Guido en cron-job.org: activar el mail de fallas (pestaña Notificaciones), anotar el vencimiento de la clave de GitHub.
1. ~~Link más lindo~~ **Hecho (4/10/2026):** el repo pasó a la organización `sys-normativa` (gratuita, se maneja desde la cuenta de Guido) como `sys-normativa.github.io`. Link: https://sys-normativa.github.io/
   - Diseño renovado el 4/10/2026: encabezado con marca, tablero tipo semáforo, iconos y colores por tema, línea de tiempo en "Por día", guía en tarjetas.
   - Aviso por mail: el primer aviso de prueba (issue #1) lo creó Guido mismo y GitHub no avisa de lo propio; el #2 lo creó el robot y GitHub lo registró como mención. Le llegó (confirmado el 4/10).
   - Historial: Guido no quiere ir más de un mes atrás; se sumaron 5 días (22 al 28/9) y alcanza. Los mails de aviso le llegan (confirmado el 4/10).
2. Mandarle a SYS las preguntas del análisis (provincias, tarjetas, remuneración de saldos, exterior, a quién avisar). **Guido le va a preguntar a SYS en qué provincias trabaja** (dicho el 4/10); con eso se suman los boletines provinciales de Ingresos Brutos.
3. Otras provincias (Ingresos Brutos) según lo que diga SYS; después, proyectos de ley del Congreso.
4. Si los mails diarios resultan muchos: avisar solo cuando hay algo que "Le afecta".
5. Afinar "Para revisar".
