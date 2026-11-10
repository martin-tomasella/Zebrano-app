// Chequeo mínimo de la lógica portada de la web: npx tsx scripts/check.ts
import assert from 'node:assert';
import { _check, optimizar } from '../src/lib/corte';
import { planificar, ordenCola, sumarHorasHabiles } from '../src/lib/plan';

// Corte: el chequeo de la web y una pieza con veta que no gira
_check();
assert(!optimizar([{ largo_mm: 1800, ancho_mm: 400 }], { veta: true }).placas[0].piezas[0].rot);

// Plan: jornada de 7 h hábiles; menos personas en una etapa corre la fecha de esa OT y de las que siguen
assert.equal(sumarHorasHabiles(new Date('2026-11-13T10:00:00'), 8).getDay(), 1, 'viernes + 8 h = lunes');
const ots = [{ id: 'b', estado: 'pendiente', created_at: '2' }, { id: 'a', estado: 'en_proceso', iniciada_at: '2026-11-01', created_at: '1' }].sort(ordenCola);
assert.equal(ots[0].id, 'a', 'primero la que está en el taller');
const et = [{ id: '1', ot_id: 'a', etapa: 'armado', orden: 1, horas_persona: 14, personas: 2 }, { id: '2', ot_id: 'b', etapa: 'armado', orden: 1, horas_persona: 7, personas: 1 }];
const hoy = new Date('2026-11-09T10:00:00');
const p1 = planificar(ots, et, hoy), p2 = planificar(ots, et.map((e) => (e.id === '1' ? { ...e, personas: 1 } : e)), hoy);
assert(p2[0].fin! > p1[0].fin! && p2[1].fin! > p1[1].fin!, 'se corren las dos fechas');
console.log('ok');
