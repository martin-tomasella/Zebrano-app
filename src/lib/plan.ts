// src/lib/plan.ts — planificación de la cola, copiada de zebrano-web/src/components/PlanCola.jsx.
// ponytail: el taller hace una OT por vez y las etapas van en serie (jornada de 7 h, lunes a viernes);
// si se trabajan varias OT en paralelo, pasar a capacidad por persona (igual que en la web).
export const JORNADA = 7;
export const ETAPA: Record<string, string> = { corte: 'Corte', canteado: 'Canteado', armado: 'Armado', terminacion: 'Terminación', instalacion: 'Instalación' };

export interface OtPlan { id: string; estado: string; prioridad?: number | null; avance_pct?: number | null; iniciada_at?: string | null; created_at: string; fecha_entrega_estimada?: string | null }
export interface Etapa { id: string; ot_id: string; etapa: string; orden: number; horas_persona: number; personas: number }

export function sumarHorasHabiles(desde: Date, horas: number) {
  const d = new Date(desde); d.setHours(0, 0, 0, 0);
  let resto = horas;
  const habil = (x: Date) => x.getDay() !== 0 && x.getDay() !== 6;
  while (!habil(d)) d.setDate(d.getDate() + 1);
  while (resto > JORNADA) { resto -= JORNADA; do d.setDate(d.getDate() + 1); while (!habil(d)); }
  return d;
}
const iso = (d: Date) => d.toISOString().slice(0, 10);

// Orden de la cola: primero las en proceso por inicio, después las pendientes por prioridad y antigüedad.
export const ordenCola = (x: OtPlan, y: OtPlan) => (x.estado === 'en_proceso' ? 0 : 1) - (y.estado === 'en_proceso' ? 0 : 1)
  || (x.estado === 'en_proceso' ? String(x.iniciada_at).localeCompare(String(y.iniciada_at)) : (x.prioridad ?? 1e9) - (y.prioridad ?? 1e9) || x.created_at.localeCompare(y.created_at));

export function planificar<O extends OtPlan>(ots: O[], etapas: Etapa[], hoy = new Date()) {
  let cursor = new Date(hoy), resto = 0; // horas ya usadas del día en curso
  return ots.map((o) => {
    const es = etapas.filter((e) => e.ot_id === o.id).sort((a, b) => a.orden - b.orden);
    const pend = 1 - (Number(o.avance_pct) || 0) / 100;
    const dur = es.length ? es.reduce((a, e) => a + Number(e.horas_persona) / Math.max(1, e.personas), 0) * pend : null;
    if (dur == null) { // sin etapas: se respeta la fecha que tenga
      const fin = o.fecha_entrega_estimada || null;
      if (fin && new Date(fin) > cursor) { cursor = new Date(fin + 'T12:00'); cursor.setDate(cursor.getDate() + 1); resto = 0; }
      return { ot: o, etapas: es, dur: null as number | null, inicio: null as string | null, fin };
    }
    const inicio = sumarHorasHabiles(cursor, resto + 0.01);
    const total = resto + dur, fin = sumarHorasHabiles(cursor, total);
    resto = total % JORNADA; cursor = new Date(fin); if (resto === 0) { cursor.setDate(cursor.getDate() + 1); }
    return { ot: o, etapas: es, dur: dur as number | null, inicio: iso(inicio) as string | null, fin: iso(fin) as string | null };
  });
}
