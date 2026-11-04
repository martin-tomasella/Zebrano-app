// app/(tabs)/produccion.tsx — cola de fabricación, OT en el taller y entregadas
// Mismas funciones que la web: ot_iniciar, ot_reordenar, ot_avance, ot_entregar (solo admin y gestión).
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store';
import { colors, spacing, radius, fonts } from '@/lib/theme';

interface OT {
  id: string;
  numero_ot: string;
  estado: string;
  avance_pct: number | null;
  iniciada_at: string | null;
  created_at: string;
  fecha_entrega_real: string | null;
  tipo_trabajo: string | null;
  horas_estimadas: number | null;
  horas_fabricacion_estimadas: number | null;
  proyectos: { tipo_trabajo: string | null; clientes: { nombre: string } | null } | null;
}

async function cargar() {
  const sel = 'id, numero_ot, estado, avance_pct, iniciada_at, created_at, fecha_entrega_real, tipo_trabajo, horas_estimadas, horas_fabricacion_estimadas, proyectos(tipo_trabajo, clientes(nombre))';
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

const estimadas = (o: OT) => Number(o.horas_fabricacion_estimadas ?? o.horas_estimadas) || null;
const cliente = (o: OT) => o.proyectos?.clientes?.nombre ?? 'Sin nombre';
const tipo = (o: OT) => { const t = o.proyectos?.tipo_trabajo ?? o.tipo_trabajo; return t ? t[0].toUpperCase() + t.slice(1) : '—'; };
const fecha = (d: string) => new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
function transcurrido(desde: string | null) {
  if (!desde) return '—';
  const h = Math.max(0, Math.floor((Date.now() - new Date(desde).getTime()) / 3600000));
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}

export default function ProduccionScreen() {
  const insets = useSafeAreaInsets();
  const empleado = useAppStore((s) => s.empleado);
  const puede = empleado?.rol === 'admin' || empleado?.rol === 'gestion';
  const { data, refetch, isRefetching, error } = useQuery({ queryKey: ['produccion'], queryFn: cargar });
  const [cola, setCola] = useState<OT[]>([]);
  useEffect(() => { setCola(data?.cola ?? []); }, [data]);

  async function rpc(fn: string, args: Record<string, unknown>) {
    const { error: e } = await supabase.rpc(fn, args);
    if (e) Alert.alert('No se pudo', e.message);
    refetch();
  }
  const confirmar = (titulo: string, fn: () => void) =>
    Alert.alert(titulo, undefined, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Sí', onPress: fn }]);

  const enProceso = data?.enProceso ?? [];
  const horas = [...cola, ...enProceso].reduce((s, o) => s + (estimadas(o) ?? 0), 0);
  const iniciales = (empleado?.nombre ?? '').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const hoy = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

  const cabecera = (
    <View style={{ gap: 20, paddingBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text style={{ color: colors.text2, fontSize: 13, fontFamily: fonts.regular, textTransform: 'capitalize' }}>{hoy}</Text>
          <Text style={{ color: colors.text1, fontSize: 30, fontFamily: fonts.bold, letterSpacing: -0.6, marginTop: 4 }}>Producción</Text>
        </View>
        <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.gold, fontSize: 15, fontFamily: fonts.semibold }}>{iniciales}</Text>
        </View>
      </View>

      {!!error && <Text style={{ color: colors.red, fontFamily: fonts.regular }}>Error: {(error as Error).message}</Text>}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Kpi valor={String(enProceso.length)} etiqueta="En el taller" acento />
        <Kpi valor={String(cola.length)} etiqueta="En cola" />
        <Kpi valor={`${Math.round(horas)} h`} etiqueta="Por fabricar" />
      </View>

      {enProceso.length > 0 && <Titulo texto="En el taller" />}
      {enProceso.map((o) => {
        const pct = o.avance_pct ?? 0;
        const est = estimadas(o);
        return (
          <View key={o.id} style={tarjeta}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={meta}>{o.numero_ot} · {tipo(o)}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(46,184,158,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
                <Text style={{ color: colors.primary, fontSize: 12, fontFamily: fonts.medium }}>Fabricando</Text>
              </View>
            </View>
            <Text style={{ color: colors.text1, fontSize: 19, fontFamily: fonts.semibold }}>{cliente(o)}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View>
                <Text style={{ color: colors.text1, fontSize: 34, fontFamily: fonts.bold, letterSpacing: -0.7, fontVariant: ['tabular-nums'] }}>{transcurrido(o.iniciada_at)}</Text>
                <Text style={meta}>{o.iniciada_at ? `desde el OK del ${fecha(o.iniciada_at)}` : 'sin fecha de inicio'}{est ? ` · ${est} h estimadas` : ''}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: colors.text1, fontSize: 20, fontFamily: fonts.semibold }}>{pct}%</Text>
                <Text style={meta}>avance</Text>
              </View>
            </View>
            <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${Math.max(pct, 2)}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
            </View>
            {!est && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(226,168,72,0.10)', borderRadius: 12, padding: 12 }}>
                <Feather name="clock" size={18} color={colors.gold} />
                <Text style={{ flex: 1, color: colors.goldSoft, fontSize: 13, fontFamily: fonts.regular }}>Sin horas estimadas: cargalas en la web (Proyectos)</Text>
              </View>
            )}
            {puede && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' }}>
                  <TouchableOpacity accessibilityLabel="Bajar avance" onPress={() => rpc('ot_avance', { p_ot: o.id, p_pct: pct - 10 })} style={paso}><Feather name="minus" size={20} color={colors.text1} /></TouchableOpacity>
                  <Text style={{ width: 64, textAlign: 'center', color: colors.text2, fontSize: 13, fontFamily: fonts.medium }}>Avance</Text>
                  <TouchableOpacity accessibilityLabel="Subir avance" onPress={() => rpc('ot_avance', { p_ot: o.id, p_pct: pct + 10 })} style={paso}><Feather name="plus" size={20} color={colors.text1} /></TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => confirmar(`¿Marcar ${o.numero_ot} como entregada?`, () => rpc('ot_entregar', { p_ot: o.id }))} style={[secundario, { flex: 1 }]}>
                  <Text style={{ color: colors.text1, fontSize: 14, fontFamily: fonts.semibold }}>Entregada</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Titulo texto="En cola" />
        {puede && cola.length > 1 && <Text style={{ color: colors.text3, fontSize: 12, fontFamily: fonts.regular }}>Mantené apretado para reordenar</Text>}
      </View>
      {cola.length === 0 && <Text style={meta}>No hay OT esperando. Las cotizaciones aprobadas llegan acá.</Text>}
    </View>
  );

  const pie = (
    <View style={{ gap: 10, paddingTop: 10, paddingBottom: 32 }}>
      {(data?.entregadas.length ?? 0) > 0 && <Titulo texto="Entregadas recientes" />}
      {data?.entregadas.map((o) => (
        <View key={o.id} style={[tarjeta, { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }]}>
          <Feather name="check-circle" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text1, fontSize: 15, fontFamily: fonts.semibold }}>{cliente(o)}</Text>
            <Text style={meta}>{o.numero_ot} · entregada {o.fecha_entrega_real ? fecha(o.fecha_entrega_real) : '—'}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const fila = ({ item: o, drag, isActive, getIndex }: RenderItemParams<OT>) => {
    const i = getIndex() ?? 0;
    const est = estimadas(o);
    return (
      <TouchableOpacity
        onLongPress={puede ? drag : undefined}
        delayLongPress={250}
        disabled={isActive}
        activeOpacity={0.9}
        style={[tarjeta, { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 10, marginBottom: 10, borderColor: isActive ? colors.primary : colors.border }]}
      >
        {puede && <Feather name="menu" size={18} color={colors.text3} />}
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: i === 0 ? 'rgba(46,184,158,0.14)' : colors.bgRaised, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: i === 0 ? colors.primary : colors.text2, fontSize: 15, fontFamily: fonts.bold }}>{i + 1}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: colors.text1, fontSize: 15, fontFamily: fonts.semibold }}>{cliente(o)}</Text>
          <Text style={meta}>{o.numero_ot} · {tipo(o)}{est ? ` · ${est} h` : ''}</Text>
        </View>
        {puede && (
          <TouchableOpacity
            onPress={() => confirmar(`¿Iniciar ${o.numero_ot}? Desde ahora corre el tiempo.`, () => rpc('ot_iniciar', { p_ot: o.id }))}
            style={i === 0 ? principal : secundario}
          >
            <Text style={{ color: i === 0 ? colors.onPrimary : colors.text1, fontSize: 13, fontFamily: fonts.bold }}>Iniciar</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDeep, paddingTop: insets.top }}>
      <DraggableFlatList
        data={cola}
        keyExtractor={(o) => o.id}
        renderItem={fila}
        onDragEnd={({ data: nueva }) => { setCola(nueva); rpc('ot_reordenar', { p_ids: nueva.map((o) => o.id) }); }}
        ListHeaderComponent={cabecera}
        ListFooterComponent={pie}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      />
    </View>
  );
}

const tarjeta = { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16, gap: 14 } as const;
const meta = { color: colors.text2, fontSize: 12, fontFamily: fonts.regular, marginTop: 2 } as const;
const paso = { width: 44, height: 44, backgroundColor: colors.bgRaised, alignItems: 'center', justifyContent: 'center' } as const;
const principal = { height: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' } as const;
const secundario = { height: 44, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' } as const;

function Kpi({ valor, etiqueta, acento }: { valor: string; etiqueta: string; acento?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 }}>
      <Text style={{ color: acento ? colors.primary : colors.text1, fontSize: 24, fontFamily: fonts.bold }}>{valor}</Text>
      <Text style={{ color: colors.text2, fontSize: 12, fontFamily: fonts.regular }}>{etiqueta}</Text>
    </View>
  );
}

function Titulo({ texto }: { texto: string }) {
  return <Text style={{ color: colors.text2, fontSize: 13, fontFamily: fonts.semibold, letterSpacing: 0.8, textTransform: 'uppercase' }}>{texto}</Text>;
}
