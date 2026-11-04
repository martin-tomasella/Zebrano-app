// app/(tabs)/produccion.tsx — cola de fabricación, OT en proceso y entregadas (mismas funciones que la web: ot_iniciar, ot_reordenar, ot_avance, ot_entregar)
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store';
import { colors, spacing, radius } from '@/lib/theme';

interface OT {
  id: string;
  numero_ot: string;
  estado: string;
  prioridad: number | null;
  avance_pct: number | null;
  iniciada_at: string | null;
  created_at: string;
  fecha_entrega_real: string | null;
  horas_estimadas: number | null;
  horas_fabricacion_estimadas: number | null;
  proyectos: { tipo_trabajo: string | null; clientes: { nombre: string } | null } | null;
}

async function cargar() {
  const sel = 'id, numero_ot, estado, prioridad, avance_pct, iniciada_at, created_at, fecha_entrega_real, horas_estimadas, horas_fabricacion_estimadas, proyectos(tipo_trabajo, clientes(nombre))';
  const [cola, enProceso, entregadas] = await Promise.all([
    supabase.from('ordenes_trabajo').select(sel).eq('estado', 'pendiente').eq('historica', false)
      .order('prioridad', { ascending: true, nullsFirst: false }).order('created_at'),
    supabase.from('ordenes_trabajo').select(sel).eq('estado', 'en_proceso').order('iniciada_at'),
    supabase.from('ordenes_trabajo').select(sel).eq('estado', 'terminada').eq('historica', false)
      .order('fecha_entrega_real', { ascending: false, nullsFirst: false }).limit(10),
  ]);
  const err = cola.error ?? enProceso.error ?? entregadas.error;
  if (err) throw err;
  const as = (d: unknown) => (d ?? []) as OT[];
  return { cola: as(cola.data), enProceso: as(enProceso.data), entregadas: as(entregadas.data) };
}

function transcurrido(desde: string | null) {
  if (!desde) return '—';
  const h = Math.max(0, Math.floor((Date.now() - new Date(desde).getTime()) / 3600000));
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}

const estimadas = (o: OT) => o.horas_fabricacion_estimadas ?? o.horas_estimadas;
const cliente = (o: OT) => o.proyectos?.clientes?.nombre ?? 'Sin nombre';

export default function ProduccionScreen() {
  const rol = useAppStore((s) => s.empleado?.rol);
  const puede = rol === 'admin' || rol === 'gestion';
  const { data, refetch, isRefetching, error } = useQuery({ queryKey: ['produccion'], queryFn: cargar });

  async function rpc(fn: string, args: Record<string, unknown>) {
    const { error: e } = await supabase.rpc(fn, args);
    if (e) Alert.alert('No se pudo', e.message);
    refetch();
  }

  function mover(i: number, delta: number) {
    const cola = [...(data?.cola ?? [])];
    const j = i + delta;
    if (j < 0 || j >= cola.length) return;
    [cola[i], cola[j]] = [cola[j], cola[i]];
    rpc('ot_reordenar', { p_ids: cola.map((o) => o.id) });
  }

  const confirmar = (titulo: string, fn: () => void) =>
    Alert.alert(titulo, undefined, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Sí', onPress: fn }]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgDeep }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.gold} />}
    >
      {!!error && <Text style={{ color: colors.red }}>Error: {(error as Error).message}</Text>}

      <Titulo texto={`En cola (${data?.cola.length ?? 0})`} sub="La primera es la próxima en entrar al taller" />
      {data?.cola.map((o, i) => (
        <Card key={o.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ color: colors.gold, fontSize: 18, fontWeight: '700', width: 24 }}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={st.nombre}>{cliente(o)}</Text>
              <Text style={st.meta}>{o.numero_ot} · {o.proyectos?.tipo_trabajo ?? '—'} · {estimadas(o) ?? '—'} h est.</Text>
            </View>
            {puede && (
              <View>
                <Boton texto="▲" onPress={() => mover(i, -1)} desactivado={i === 0} />
                <Boton texto="▼" onPress={() => mover(i, 1)} desactivado={i === (data?.cola.length ?? 0) - 1} />
              </View>
            )}
          </View>
          {puede && (
            <Boton principal texto="Iniciar fabricación" onPress={() => confirmar(`¿Iniciar ${o.numero_ot}? Desde ahora corre el tiempo.`, () => rpc('ot_iniciar', { p_ot: o.id }))} />
          )}
        </Card>
      ))}

      <Titulo texto={`En fabricación (${data?.enProceso.length ?? 0})`} />
      {data?.enProceso.map((o) => {
        const pct = o.avance_pct ?? 0;
        return (
          <Card key={o.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={st.meta}>{o.numero_ot}</Text>
              <Text style={{ color: colors.green, fontWeight: '700' }}>{pct}%</Text>
            </View>
            <Text style={st.nombre}>{cliente(o)}</Text>
            <Text style={st.meta}>⏱ {transcurrido(o.iniciada_at)} transcurridos · {estimadas(o) ?? '—'} h estimadas</Text>
            <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden', marginVertical: spacing.sm }}>
              <View style={{ height: '100%', width: `${pct}%`, backgroundColor: colors.green }} />
            </View>
            {puede && (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Boton texto="−10%" onPress={() => rpc('ot_avance', { p_ot: o.id, p_pct: pct - 10 })} />
                <Boton texto="+10%" onPress={() => rpc('ot_avance', { p_ot: o.id, p_pct: pct + 10 })} />
                <View style={{ flex: 1 }} />
                <Boton principal texto="Entregada" onPress={() => confirmar(`¿Marcar ${o.numero_ot} como entregada?`, () => rpc('ot_entregar', { p_ot: o.id }))} />
              </View>
            )}
          </Card>
        );
      })}

      <Titulo texto="Entregadas recientes" />
      {data?.entregadas.map((o) => (
        <Card key={o.id}>
          <Text style={st.nombre}>{cliente(o)}</Text>
          <Text style={st.meta}>{o.numero_ot} · entregada {o.fecha_entrega_real ? new Date(`${o.fecha_entrega_real}T12:00:00`).toLocaleDateString('es-AR') : '—'}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const st = {
  nombre: { color: colors.text1, fontSize: 15, fontWeight: '600' as const },
  meta: { color: colors.text3, fontSize: 12, marginTop: 2 },
};

function Titulo({ texto, sub }: { texto: string; sub?: string }) {
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={{ color: colors.text2, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 }}>{texto}</Text>
      {sub && <Text style={st.meta}>{sub}</Text>}
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={{ backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.xs }}>{children}</View>;
}

function Boton({ texto, onPress, principal, desactivado }: { texto: string; onPress: () => void; principal?: boolean; desactivado?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={desactivado}
      style={{
        backgroundColor: principal ? colors.gold : 'transparent', borderColor: colors.borderMid, borderWidth: principal ? 0 : 1,
        borderRadius: radius.sm, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center', opacity: desactivado ? 0.3 : 1, marginTop: principal ? spacing.sm : 2,
      }}
    >
      <Text style={{ color: principal ? colors.bgDeep : colors.text2, fontWeight: principal ? '700' : '400' }}>{texto}</Text>
    </TouchableOpacity>
  );
}
