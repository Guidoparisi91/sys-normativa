import assert from 'node:assert/strict';
import { test } from 'node:test';
import { recorrerBoletin } from './boletin.js';
import type { Estado } from './estado.js';
import type { AvisoBO } from './fuentes/boletinOficial.js';

const avisos = (n: number): AvisoBO[] => Array.from({ length: n }, (_, i) => ({ id: String(i), url: `https://x/${i}`, organismo: '', titulo: '', texto: '' }));
const estadoCon = (e: Partial<Estado>): Estado => ({ ultimaComunicacion: {}, textosOrdenados: {}, ...e });
const falla = async (): Promise<AvisoBO[]> => {
  throw new Error('el sitio no respondió a tiempo');
};
const nada = () => {};

test('lectura normal: lee ayer y hoy, avanza hasta ayer y recuerda el de hoy', async () => {
  const estado = estadoCon({ boletinHasta: '2026-10-04' });
  const r = await recorrerBoletin('BO', estado, '2026-10-06', false, async (d) => avisos(d === '2026-10-06' ? 69 : 73), nada);
  assert.equal(r.edicionHoy, true);
  assert.deepEqual(r.errores, []);
  assert.equal(estado.boletinHasta, '2026-10-05');
  assert.deepEqual(estado.boletinHoy, { fecha: '2026-10-06', normas: 69 });
});

test('6/10: si falla la relectura de un Boletín ya leído hoy, el día sigue teniendo edición y no es error', async () => {
  const estado = estadoCon({ boletinHasta: '2026-10-05', boletinHoy: { fecha: '2026-10-06', normas: 69 } });
  const r = await recorrerBoletin('BO', estado, '2026-10-06', false, falla, nada);
  assert.equal(r.edicionHoy, true);
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.revisado, ['BO del 2026-10-06: 69 normas.']);
});

test('una relectura que no ve edición no tapa la lectura anterior de hoy', async () => {
  const estado = estadoCon({ boletinHasta: '2026-10-05', boletinHoy: { fecha: '2026-10-06', normas: 69 } });
  const r = await recorrerBoletin('BO', estado, '2026-10-06', false, async () => [], nada);
  assert.equal(r.edicionHoy, true);
  assert.deepEqual(estado.boletinHoy, { fecha: '2026-10-06', normas: 69 });
});

test('madrugada sin edición todavía y después una falla: es error, no "no hubo edición"', async () => {
  const estado = estadoCon({ boletinHasta: '2026-10-05' });
  await recorrerBoletin('BO', estado, '2026-10-06', false, async () => [], nada);
  const r = await recorrerBoletin('BO', estado, '2026-10-06', false, falla, nada);
  assert.equal(r.edicionHoy, false);
  assert.equal(r.errores.length, 1);
});

test('un día anterior que falla no se da por leído y se vuelve a pedir', async () => {
  const estado = estadoCon({ boletinHasta: '2026-10-03' });
  const r = await recorrerBoletin('BO', estado, '2026-10-06', false, async (d) => (d === '2026-10-05' ? falla() : avisos(5)), nada);
  assert.equal(r.errores.length, 1);
  assert.equal(estado.boletinHasta, '2026-10-04');
});

test('más de 31 días sin correr: lee los últimos 31 y avisa cuáles quedaron sin revisar', async () => {
  const estado = estadoCon({ boletinHasta: '2026-08-01' });
  const leidos: string[] = [];
  const r = await recorrerBoletin('BO', estado, '2026-10-06', false, async (d) => (leidos.push(d), avisos(1)), nada);
  assert.equal(leidos.length, 31);
  assert.match(r.errores[0], /del 2026-08-02 al 2026-09-05/);
});

test('una corrida manual no toca el estado', async () => {
  const estado = estadoCon({ boletinHasta: '2026-10-05' });
  await recorrerBoletin('BO', estado, '2026-10-02', true, async () => avisos(3), nada);
  assert.equal(estado.boletinHasta, '2026-10-05');
  assert.equal(estado.boletinHoy, undefined);
});

test('21 al 25/10/2026: los días que fallaron se completan y se dicen como completados, no como "vueltos a mirar"', async () => {
  const estado = estadoCon({ boletinHasta: '2026-10-20', boletinHoy: { fecha: '2026-10-21', normas: 52 } });
  const leidos: string[] = [];
  const r = await recorrerBoletin('BO', estado, '2026-10-25', false, async (d) => (leidos.push(d), avisos(d < '2026-10-24' ? 50 : 0)), (_, d) => leidos.push(`alLeer ${d}`));
  assert.equal(leidos.filter((d) => d.startsWith('alLeer')).length, 5);
  assert.deepEqual(r.errores, []);
  assert.equal(estado.boletinHasta, '2026-10-24');
  assert.match(r.revisado[1], /2026-10-22: 50 normas \(edición anterior, completada/);
  assert.match(r.revisado[3], /2026-10-24: no hubo edición/);
});
