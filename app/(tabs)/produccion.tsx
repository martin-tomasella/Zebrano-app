// app/(tabs)/produccion.tsx — cola de fábrica con planificación (como PlanCola.jsx de la web):
// horas-persona por etapa ÷ personas = duración; una OT por vez, jornada de 7 h, lunes a viernes.
// Iniciar, reordenar, avance y entrega: ot_iniciar / ot_reordenar / ot_avance / ot_entregar (admin y gestión).
import { useEffect, useMemo, useState } from 'react';
import { View, Pressable, RefreshControl, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store';
import { puede } from '@/lib/permisos';
import { planificar, ordenCola, ETAPA, type Etapa, type OtPlan } from '@/lib/plan';
import { useTema, spacing } from '@/lib/theme';
import { Vidrio, T, Boton, Badge, Kpi, Contador, Aviso, Icono, fecha } from '@/components/ui';

interface OT extends OtPlan {
  numero_ot: string; fecha_entrega_real?: string | null; tipo_trabajo?: string | null;
  horas_estimadas?: number | null; horas_fabricacion_estimadas?: number | null;
  proyectos: { nombre?: string | null; tipo_trabajo?: string | null; clientes: { nombre: string } | null } | null;
}

async function cargar() {
  const sel = 'id,numero_ot,estado,prioridad,avance_pct,iniciada_at,created_at,fecha_entrega_estimada,fecha_entrega_real,tipo_trabajo,horas_estimadas,horas_fabricacion_estimadas,proyectos(nombre,tipo_trabajo,clientes(nombre))';
  const [a, b, c, d] = await Promise.all([
    supabase.from('ordenes_trabajo').select(sel).in('estado', ['pendiente', 'en_proceso']).or('historica.is.null,historica.eq.false'),
    supabase.from('ot_etapas').select('*'),
    supabase.from('horas_trabajo_ot').select('ot_id,etapa,horas'),
    supabase.from('ordenes_trabajo').select(sel).eq('estado', 'terminada').or('historica.is.null,historica.eq.false').order('fecha_entrega_real', { ascending: false, nullsFirst: false }).limit(8),
  ]);
  const err = a.error ?? b.error ?? d.error;
  if (err) throw err;
  const reales: Record<string, number> = {};
  for (const h of c.data ?? []) { const k = `${h.ot_id}|${h.etapa}`; reales[k] = (reales[k] ?? 0) + Number(h.horas ?? 0); }
  return { ots: ((a.data ?? []) as unknown as OT[]).sort(ordenCola), etapas: (b.data ?? []) as Etapa[], reales, entregadas: (d.data ?? []) as unknown as OT[] };
}

const cliente = (o: OT) => o.proyectos?.clientes?.nombre ?? 'Sin cliente';
const tipo = (o: OT) => { const t = o.proyectos?.tipo_trabajo ?? o.tipo_trabajo; return t ? t[0].toUpperCase() + t.slice(1) : '—'; };
const corrido = (d?: string | null) => { if (!d) return '—'; const h = Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 3600000)); return `${Math.floor(h / 24)} d ${h % 24} h`; };
const fCorta = (d?: string | null) => d ? new Date(d + 'T12:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }) : '—';

export default function Produccion() {
  const { c } = useTema();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const rol = useAppStore((s) => s.empleado?.rol);
  const gestiona = puede(rol, 'gestionar_cola');
  const { data, refetch, isRefetching, error } = useQuery({ queryKey: ['produccion'], queryFn: cargar });
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [cola, setCola] = useState<OT[]>([]);
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});
  useEffect(() => { if (data) { setEtapas(data.etapas); setCola(data.ots.filter((o) => o.estado === 'pendiente')); } }, [data]);

  const enProceso = useMemo(() => (data?.ots ?? []).filter((o) => o.estado === 'en_proceso'), [data]);
  const plan = useMemo(() => planificar([...enProceso, ...cola], etapas), [enProceso, cola, etapas]);
  const planDe = (id: string) => plan.find((p) => p.ot.id === id);

  // Guarda la fecha de fin recalculada en las OT que tienen etapas (las que no tienen conservan la suya).
  useEffect(() => {
    if (!data) return;
    plan.filter((p) => p.dur != null && p.fin !== p.ot.fecha_entrega_estimada)
      .forEach((p) => supabase.from('ordenes_trabajo').update({ fecha_entrega_estimada: p.fin }).eq('id', p.ot.id).then(({ error: e }) => { if (!e) p.ot.fecha_entrega_estimada = p.fin; }));
  }, [plan, data]);

  async function rpc(fn: string, args: Record<string, unknown>) {
    const { error: e } = await supabase.rpc(fn, args);
    if (e) Alert.alert('No se pudo', e.message);
    refetch();
  }
  const confirmar = (titulo: string, fn: () => void) => Alert.alert(titulo, undefined, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Sí', onPress: fn }]);
  async function cambiarPersonas(e: Etapa, personas: number) {
    setEtapas((es) => es.map((x) => (x.id === e.id ? { ...x, personas } : x)));
    const { error: er } = await supabase.from('ot_etapas').update({ personas }).eq('id', e.id);
    if (er) { Alert.alert('No se pudo guardar', er.message); refetch(); }
  }

  const horasCola = plan.reduce((a, p) => a + (p.dur ?? 0), 0);

  const etapasDe = (o: OT) => {
    const p = planDe(o.id);
    if (!abiertas[o.id]) return null;
    if (!p?.etapas.length) return <T v="chico">Sin horas por etapa (OT cargada a mano): se toma su fecha de entrega.</T>;
    return (
      <View style={{ gap: 8 }}>
        {p.etapas.map((e) => {
          const real = data?.reales[`${o.id}|${e.etapa}`] ?? 0;
          return (
            <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.linea }}>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 14 }}>{ETAPA[e.etapa] ?? e.etapa}</T>
                <T v="chico">{Number(e.horas_persona).toFixed(1)} h-p → {(Number(e.horas_persona) / e.personas).toFixed(1)} h{real ? ` · reales ${real.toFixed(1)}` : ''}</T>
                {real > Number(e.horas_persona) && <T v="chico" color={c.error}>Pasó lo estimado</T>}
              </View>
              <Contador etiqueta={`personas en ${e.etapa}`} valor={e.personas} min={1} max={20} onChange={(n) => cambiarPersonas(e, n)} />
            </View>
          );
        })}
      </View>
    );
  };

  const pieOt = (o: OT) => {
    const p = planDe(o.id);
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <Icono n="calendar-check-outline" size={16} />
        <T v="chico" style={{ flex: 1 }}>{p?.dur != null ? `${p.dur.toFixed(1)} h · ${fCorta(p.inicio)} → ` : ''}fin {fCorta(p?.fin)}</T>
        <Boton chico tipo="quiet" icono={abiertas[o.id] ? 'chevron-up' : 'account-hard-hat'} texto="Etapas" onPress={() => setAbiertas((x) => ({ ...x, [o.id]: !x[o.id] }))} />
        <Boton chico tipo="quiet" icono="file-document-outline" texto="OT" onPress={() => router.push(`/ot/${o.id}`)} />
      </View>
    );
  };

  const cabecera = (
    <View style={{ gap: 14, paddingBottom: 12 }}>
      <View>
        <T v="chico" style={{ textTransform: 'capitalize' }}>{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</T>
        <T v="titulo">Producción</T>
      </View>
      {!!error && <Aviso texto={(error as Error).message} />}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Kpi destacado etiqueta="En el taller" valor={String(enProceso.length)} icono="hammer-wrench" />
        <Kpi etiqueta="En cola" valor={String(cola.length)} icono="tray-full" />
        <Kpi etiqueta="Horas de cola" valor={`${Math.round(horasCola)} h`} detalle="según etapas y personas" icono="clock-outline" />
      </View>
      <T v="chico">Si cambiás cuántas personas trabajan en una etapa, se recalculan las fechas de esa OT y de las que siguen.</T>

      {enProceso.length > 0 && <T v="etiqueta">En el taller</T>}
      {enProceso.map((o) => {
        const pct = o.avance_pct ?? 0;
        return (
          <Vidrio key={o.id} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T v="chico">{o.numero_ot} · {tipo(o)}</T><Badge texto="En taller" tono="info" />
            </View>
            <T v="h2">{cliente(o)}</T>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View><T v="num">{corrido(o.iniciada_at)}</T><T v="chico">desde el OK{o.iniciada_at ? ` del ${fecha(o.iniciada_at)}` : ''}</T></View>
              <View style={{ alignItems: 'flex-end' }}><T v="h2">{pct}%</T><T v="chico">avance</T></View>
            </View>
            <View style={{ height: 6, backgroundColor: c.hundido, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ width: `${Math.max(pct, 2)}%`, height: '100%', backgroundColor: c.primario }} />
            </View>
            {gestiona && <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Contador etiqueta="avance (de a 10%)" valor={pct} min={0} max={100} onChange={(n) => rpc('ot_avance', { p_ot: o.id, p_pct: pct + (n > pct ? 10 : -10) })} />
              <View style={{ flex: 1 }} />
              <Boton chico tipo="secundario" icono="truck-check-outline" texto="Entregada" onPress={() => confirmar(`¿Marcar ${o.numero_ot} como entregada?`, () => rpc('ot_entregar', { p_ot: o.id }))} />
            </View>}
            {pieOt(o)}
            {etapasDe(o)}
          </Vidrio>
        );
      })}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T v="etiqueta">En cola</T>
        {gestiona && cola.length > 1 && <T v="chico">Mantené apretado para reordenar</T>}
      </View>
      {cola.length === 0 && <T v="chico">No hay OT esperando. Las cotizaciones aprobadas llegan acá.</T>}
    </View>
  );

  const fila = ({ item: o, drag, isActive, getIndex }: RenderItemParams<OT>) => {
    const i = getIndex() ?? 0;
    return (
      <Pressable onLongPress={gestiona ? drag : undefined} delayLongPress={250} disabled={isActive} style={{ marginBottom: 10 }}>
        <Vidrio style={{ gap: 8, borderColor: isActive ? c.primario : undefined }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {gestiona && <Icono n="drag-vertical" />}
            <View style={{ width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: i === 0 ? c.primario : c.hundido }}>
              <T v="h2" color={i === 0 ? c.sobrePrimario : c.texto2} style={{ fontSize: 14 }}>{i + 1}</T>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T v="h2" lineas={1} style={{ fontSize: 15 }}>{cliente(o)}</T>
              <T v="chico">{o.numero_ot} · {tipo(o)}</T>
            </View>
            {gestiona && <Boton chico tipo={i === 0 ? 'primario' : 'secundario'} texto="Iniciar" onPress={() => confirmar(`¿Iniciar ${o.numero_ot}? Desde ahora corre el tiempo.`, () => rpc('ot_iniciar', { p_ot: o.id }))} />}
          </View>
          {pieOt(o)}
          {etapasDe(o)}
        </Vidrio>
      </Pressable>
    );
  };

  const pie = (
    <View style={{ gap: 10, paddingTop: 6, paddingBottom: 30 }}>
      {(data?.entregadas.length ?? 0) > 0 && <T v="etiqueta">Entregadas recientes</T>}
      {data?.entregadas.map((o) => (
        <Vidrio key={o.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
          <Icono n="check-circle-outline" color={c.exito} />
          <View style={{ flex: 1 }}><T v="h2" style={{ fontSize: 15 }}>{cliente(o)}</T><T v="chico">{o.numero_ot} · entregada {fecha(o.fecha_entrega_real)}</T></View>
        </Vidrio>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <DraggableFlatList
        data={cola}
        keyExtractor={(o) => o.id}
        renderItem={fila}
        onDragEnd={({ data: nueva }) => { setCola(nueva); rpc('ot_reordenar', { p_ids: nueva.map((o) => o.id) }); }}
        ListHeaderComponent={cabecera}
        ListFooterComponent={pie}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: insets.top + spacing.md }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.primario} />}
      />
    </View>
  );
}
