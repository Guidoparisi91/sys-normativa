# SYS-Normativa

Monitor diario de normas que pueden afectar a **SYS Global Pay**, una billetera virtual para empresas registrada en el BCRA como proveedor de servicios de pago (PSP). Revisa el Boletín Oficial, las comunicaciones del BCRA y los textos ordenados del BCRA, y deja un informe por día.

## Regla número uno: proyecto aislado

Este proyecto **no tiene nada que ver con ningún otro proyecto de Guido**. No se comparte código, datos, cuentas, credenciales ni memoria con nada externo a esta carpeta. Tampoco se menciona ni se usa como referencia otro proyecto.

Todo lo que haya que recordar entre sesiones va en `docs/NOTAS.md`, dentro de esta carpeta, y en ningún otro lado.

## Antes de arrancar, leer

1. `docs/NOTAS.md`: contexto, decisiones tomadas, estado actual y próximos pasos.
2. `docs/analisis-regulatorio.md`: qué normas le importan a SYS, por qué, qué cubre el monitor y qué falta. Incluye las preguntas pendientes para SYS.

Al terminar una tarea, actualizar el "Estado" y los "Próximos pasos" de `docs/NOTAS.md`.

## Comandos

```bash
npm install
npm run revisar                          # corrida de hoy -> datos/informes/AAAA-MM-DD.json + salida/index.html
npm run revisar -- --fecha 2026-10-02    # Boletín Oficial de otro día (para probar)
npm run revisar -- --bcra-desde A=8480   # releer el BCRA desde un número
npm run pagina                           # rearmar la página sin revisar las fuentes
npm run historial -- 2026-09-29 ...      # armar informes de días pasados (no toca el estado)
npm run validar                          # casos reales + BCRA + ruido -> docs/validacion.md (~25 min)
npm run estudio-rapido                   # ruido en 3 meses de Boletín -> docs/estudio-palabras.md (~15 min)
npm run estudio                          # completo: + BCRA y la IA sobre lo descartado (>1 h)
npm test                                 # tests de las reglas
npm run typecheck
```

## Cómo está armado

- `src/revisar.ts`: corrida completa. Cada fuente va en su propio try: una que falla queda listada en el informe y el proceso sale con error. **Nunca puede decir "hoy no hubo nada" porque una fuente se cayó.**
- `src/fuentes/boletinOficial.ts`: primera sección del día, HTML en `/seccion/primera/AAAAMMDD`. La lista viene completa, sin paginar. **Desde el 22/10/2026 el sitio no acepta conexiones de fuera del país** (GitHub corre en EE. UU.): si no conecta, lee el PDF de la sección del día del repositorio oficial del Boletín en la Blockchain Federal (`otslist.boletinoficial.gob.ar/ots/?date_filter=DD-MM-AAAA`, sí se ve desde afuera). Cada aviso se separa por su pie ("e. ... N° 79166/26 v. ..."); ese número (`avisoBO`) hace que la misma norma leída de la web o del PDF no se repita. Leído del PDF, el link de la norma es la sección del día en la web.
- Un día del Boletín que se recupera tarde (o ayer vuelto a mirar) suma sus normas **al informe de su día** (`completarDiaAnterior` en `procesar.ts`) y limpia ahí las fallas; el mail sale igual en la corrida que las encontró.
- `src/fuentes/bcraComunicaciones.ts`: PDF en `/archivos/Pdfs/comytexord/{A|B|C}{n}.pdf`. Detecta las nuevas preguntando por el número siguiente. Tolera 5 huecos seguidos. `PISO` es el número desde donde busca en la primera corrida.
- `src/fuentes/rentasCordoba.ts`: normativa impositiva de Córdoba desde el feed RSS de Rentas (`rentascordoba.gob.ar/cms/feed/`, `?paged=N`), con el resumen que escribe Rentas. Recuerda las vistas en `rentasVistas`. **El Boletín Oficial de Córdoba bloquea conexiones de fuera del país**: no se puede leer desde GitHub, y Guido no quiere nada corriendo en su compu.
- `src/fuentes/bcraPrensa.ts`: noticias de bcra.gob.ar/noticias (solo las 10 más nuevas; la API está cerrada). Recuerda las vistas en `prensaVistas`.
- `src/fuentes/bcraTextosOrdenados.ts`: lee solo la carátula ("Última comunicación incorporada"). Si cambia, avisa. Es la red de seguridad.
- `src/reglas.ts`: filtro de relevancia por palabras con peso más el organismo emisor. Para "Le afecta" hace falta un término propio de SYS: muchos términos débiles juntos no alcanzan. Las comunicaciones del BCRA dirigidas a "proveedores de servicios de pago" van directo a "Le afecta"; las demás del BCRA llegan como mucho a "Para revisar".
- **Producción:** https://sys-normativa.github.io/ (repo público sys-normativa/sys-normativa.github.io). `.github/workflows/monitor.yml` lo lanza cron-job.org todos los días a las 9:47 y 21:47 (hora argentina, cuenta de Guido). Los horarios propios de GitHub no se usan para revisar (largó 3 de 8, con 6 a 8 h de atraso): un control cada 3 h mira `ultimaCorrida` en `datos/estado.json` y, si pasaron más de 13 h, revisa igual y manda un mail avisando que cron-job.org falló. La corrida guarda `datos/`, publica `salida/` en Pages, avisa a Guido con un issue (mail de GitHub) y manda las normas nuevas por Gmail a los destinatarios de `AVISO_MAILS`. Si falla el Boletín o el BCRA, se vuelve a lanzar sola cada 15 min hasta que ande (máx. 8 h). Cada push a `main` corre el monitor y publica enseguida.
- `src/boletin.ts`: el recorrido día por día del Boletín Oficial (relecturas, días que fallan, madrugadas sin edición), con tests en `boletin.test.ts`.
- `src/procesar.ts`: lo común a la corrida diaria y a `historial.ts`. `guardarDia` suma lo nuevo al informe del día sin repetir.
- `src/aviso.ts`: arma el aviso; el workflow lo publica como issue (llega a Guido). También arma un mail formal, solo con normas (nunca errores técnicos), que `src/mail.ts` manda por Gmail en copia oculta a los mails del secreto `AVISO_MAILS` (secretos `GMAIL_USUARIO` y `GMAIL_APP_PASSWORD`). Si el mail falla, sale un issue a Guido.
- `src/estado.ts` → `datos/estado.json`: última comunicación leída por tipo y versión de cada texto ordenado. No hay base de datos.
- `src/explicar.ts`: arma la explicación de cada norma con recortes de su texto (qué cambia, para qué, fechas, normas citadas, dónde nombra a SYS).
- `src/temas.ts`: los frentes de SYS y el texto de "cómo le afecta" de cada uno. Sale de `docs/analisis-regulatorio.md`.
- `src/ia.ts`: resumen opcional con Gemini (nivel gratuito). Solo resume lo que ya pasó el filtro; si falla, el informe sale igual. Clave en `.env` (`GEMINI_API_KEY`), nunca en el código.
- `src/informe.ts`: el informe del día como datos (`datos/informes/AAAA-MM-DD.json`) y en Markdown para la consola.
- `src/sitio.ts` + `src/sitio/`: la página única `salida/index.html` (pestañas: cómo funciona, por día, último informe; abre en el último informe), con todos los informes embebidos. Abre con doble clic y se publica tal cual.

**Regla de cobertura de cada fuente (obligatoria para las que se sumen).** Ninguna fuente se consulta "por el día de hoy": cada una guarda en `datos/estado.json` hasta dónde leyó, y en cada corrida trae **todo** lo publicado desde ahí, fines de semana y feriados incluidos. Si no puede garantizar que leyó todo, lo dice como error en el informe (y sale el mail); nunca lo saltea en silencio. Hoy:
- Boletín Oficial: por fecha (`boletinHasta`). Recorre cada día desde el último completo, incluido sábado y domingo (a veces hay edición), y vuelve a mirar el día anterior. Más de 31 días sin correr: avisa qué ediciones quedaron sin revisar.
- Comunicaciones BCRA: por número (`ultimaComunicacion`). Los números salteados se siguen buscando 30 días (`pendientes`).
- Textos ordenados: por versión de la carátula.
- Rentas Córdoba y prensa del BCRA: por lista de vistas. Si todo lo que se ve es nuevo, avisa que puede haber más.
- Además, la página avisa si pasaron más de 16 h sin actualizarse, por si GitHub no corre.

**Todo lo que ve el cliente (página, guía, mails) tiene que ser claro y profesional**: tono formal, sin jerga técnica, sin detalles internos (repo, pruebas, métricas de validación) ni expresiones coloquiales.

**Si se agrega o cambia una regla en `reglas.ts`**, actualizar `docs/analisis-regulatorio.md` y sumar un caso en `src/reglas.test.ts`, de ser posible con una norma real.

## Decisiones vigentes

- **Sin presupuesto.** Toda herramienta, hosting o IA tiene que ser gratuita o casi gratuita. Si algo tiene costo, cuota o límite, avisarlo siempre antes de sumarlo.
- **Detección en dos pasos:** reglas (palabras clave + organismo) y después la IA, que da veredicto y qué hacer. La IA no puede esconder lo que nombra la actividad de SYS, lo de la UIF ni lo que el BCRA dirige a los PSP. Si la IA falla, mandan las reglas. Nunca mandarle datos internos de SYS: solo normas públicas.
- **El filtro es generoso.** Perder una norma relevante es peor que mostrar una de más.
- **Las fuentes son públicas.** Pedidos con pausa y reintentos, sin castigar los sitios del Estado.

## Cómo trabajar con Guido

- Hablar simple y en criollo: primero qué pasa, qué hago y qué tiene que hacer él. La jerga técnica después, y solo si aporta.
- Dar **una** recomendación fundamentada, no un menú de opciones.
- Las decisiones de fondo (dónde corre, qué servicio usar, cambios de alcance) se le consultan antes de codear. El resto se avanza.
- "¿Se puede X?" es una pregunta: se contesta, no se ejecuta.
- No subir nada a internet, no crear cuentas y no contactar a SYS sin que él lo pida.
- Si se usa git: commits en español, en imperativo, sin el trailer `Co-Authored-By`.
- Horarios: siempre en hora de Argentina (UTC−3).
