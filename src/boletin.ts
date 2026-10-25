// Recorrido del Boletín Oficial día por día, separado de la corrida para poder
// probarlo: es la parte con más casos (días que fallan, relecturas, madrugadas
// sin edición todavía) y donde un error esconde normas o borra un informe.

import type { AvisoBO } from './fuentes/boletinOficial.js';
import type { Estado } from './estado.js';
import { diasEntre } from './procesar.js';

// Si el monitor estuvo parado más que esto, se leen los últimos días y se avisa
// cuáles quedaron sin revisar: nunca se saltean en silencio.
export const MAX_DIAS_ATRAS = 31;

export interface Recorrido {
  /** Hoy hubo edición (leída ahora o en una corrida anterior de hoy). */
  edicionHoy: boolean;
  revisado: string[];
  errores: string[];
}

/**
 * Lee el Boletín de hoy, más los días anteriores que no se pudieron leer
 * completos (si una corrida falla, la siguiente los recupera). Ayer se relee
 * una vez más por si se agregó algo tarde. Actualiza `estado.boletinHasta` y
 * `estado.boletinHoy`, salvo en una corrida manual (`manual`).
 */
export async function recorrerBoletin(
  nombre: string,
  estado: Estado,
  fecha: string,
  manual: boolean,
  leer: (dia: string) => Promise<AvisoBO[]>,
  alLeer: (avisos: AvisoBO[], dia: string) => void,
): Promise<Recorrido> {
  const revisado: string[] = [];
  const errores: string[] = [];
  const ayer = new Date(Date.parse(`${fecha}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  const hasta = estado.boletinHasta;
  // Se miran todos los días, fines de semana incluidos: el Boletín a veces
  // sale sábado o domingo (p. ej. 11/4/2020 y 26/4/2020).
  const pendientes = manual || !hasta ? [fecha] : diasEntre(hasta, fecha);
  const dias = pendientes.slice(-MAX_DIAS_ATRAS);
  if (dias.length < pendientes.length) {
    errores.push(`${nombre}: no se revisaron las ediciones del ${pendientes[0]} al ${pendientes[pendientes.length - dias.length - 1]} porque el monitor estuvo detenido más de ${MAX_DIAS_ATRAS} días. Se recomienda verificarlas manualmente.`);
  }
  // Hasta qué día quedó todo leído: avanza solo por días seguidos sin error, y
  // nunca incluye hoy, que se relee en cada corrida.
  let completoHasta = hasta ?? ayer;
  let seguidos = true;
  let edicionHoy = false;
  for (const dia of dias) {
    try {
      const avisos = await leer(dia);
      alLeer(avisos, dia);
      // Una relectura de hoy que no ve edición no tapa una lectura anterior de
      // hoy que sí la vio: el día sigue teniendo informe.
      const antes = dia === fecha && estado.boletinHoy?.fecha === dia ? estado.boletinHoy.normas : 0;
      const normas = avisos.length || antes;
      if (dia === fecha) {
        edicionHoy = normas > 0;
        if (!manual) estado.boletinHoy = { fecha: dia, normas };
      }
      // Ayer ya leído se vuelve a mirar; un día que había fallado se completa ahora.
      const releido = dia === ayer && estado.boletinHoy?.fecha === ayer && estado.boletinHoy.normas > 0;
      const cuando = dia === fecha ? '' : releido ? ' (día anterior, vuelto a mirar por si quedó algo)' : ' (edición anterior, completada en esta revisión)';
      revisado.push(normas ? `${nombre} del ${dia}: ${normas} normas${cuando}.` : `${nombre} del ${dia}: no hubo edición.`);
      if (dia < fecha && seguidos) completoHasta = dia;
    } catch (e) {
      seguidos = false;
      // Hoy se relee en cada corrida. Si una revisión anterior de hoy ya lo
      // leyó completo, la falla de la relectura no es un error: el día sigue
      // pendiente y la próxima corrida lo vuelve a leer (5/10/2026).
      // Solo cuenta si se leyeron normas: una corrida de madrugada ve "sin
      // edición" porque el Boletín del día todavía no salió, y eso no puede
      // tapar una falla posterior.
      const yaLeido = dia === fecha && estado.boletinHoy?.fecha === dia ? estado.boletinHoy.normas : 0;
      // Y hoy sigue contando como día con edición: si no, el informe del día
      // se borraba como si fuera un feriado (6/10/2026).
      if (yaLeido) {
        edicionHoy = true;
        revisado.push(`${nombre} del ${dia}: ${yaLeido} normas.`);
      } else errores.push(`${nombre} del ${dia}: ${(e as Error).message}`);
    }
  }
  if (!manual) estado.boletinHasta = completoHasta;
  return { edicionHoy, revisado, errores };
}
