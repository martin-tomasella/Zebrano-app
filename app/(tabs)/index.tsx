// app/(tabs)/index.tsx
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { db } from '@/lib/supabase';
import { colors, spacing, radius } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const empleado = useAppStore((st) => st.empleado);
  const insets = useSafeAreaInsets();
  const { data: enCola } = useQuery({
    queryKey: ['ot-en-cola'],
    queryFn: () => supabase.from('ordenes_trabajo').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente').eq('historica', false).then(r => r.count ?? 0),
  });

  const { data: otActivas, refetch, isRefetching } = useQuery({
    queryKey: ['ot-activas'],
    queryFn: () => db.ot.activas().then(r => r.data ?? []),
  });

  const { data: sesiones } = useQuery({
    queryKey: ['sesiones-recientes'],
    queryFn: () => db.sesiones.list(5).then(r => r.data ?? []),
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.lg }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.gold} />}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {empleado?.nombre?.split(' ')[0]}</Text>
          <Text style={styles.subtitle}>{new Date().toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' })}</Text>
        </View>
        <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.gold, fontSize: 15, fontFamily: 'InstrumentSans_600SemiBold' }}>{(empleado?.nombre ?? '').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}</Text>
        </View>
      </View>

      {/* KPIs */}
      <View style={styles.kpiGrid}>
        <KpiCard label="En el taller" value={String(otActivas?.length ?? 0)} color={colors.primary} />
        <KpiCard label="En cola" value={String(enCola ?? 0)} color={colors.text1} />
        <KpiCard label="Cotizaciones" value={String(sesiones?.length ?? 0)} color={colors.text1} />
      </View>

      {/* ACCIÓN RÁPIDA */}
      <TouchableOpacity style={styles.cotizarBtn} onPress={() => router.push('/(tabs)/cotizador')}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}><Feather name="camera" size={20} color={colors.onGold} /></View>
        <View>
          <Text style={styles.cotizarTitle}>Nueva cotización con IA</Text>
          <Text style={styles.cotizarSub}>Sacá una foto del plano o describí el trabajo</Text>
        </View>
        <Feather name="chevron-right" size={22} color={colors.gold} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      {/* OTs EN PRODUCCIÓN */}
      {otActivas && otActivas.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>En producción</Text>
          {otActivas.slice(0, 3).map((ot: Record<string, unknown>) => (
            <TouchableOpacity key={ot.numero_ot as string} style={styles.otCard} onPress={() => router.push('/(tabs)/produccion')}>
              <View style={styles.otHeader}>
                <Text style={styles.otNum}>{ot.numero_ot as string}</Text>
                <Text style={styles.otPct}>{ot.avance_pct as number}%</Text>
              </View>
              <Text style={styles.otName}>{(ot.proyectos as { tipo_trabajo?: string } | null)?.tipo_trabajo ?? '—'}</Text>
              <Text style={styles.otClient}>{(ot.proyectos as { clientes?: { nombre?: string } } | null)?.clientes?.nombre ?? '—'}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${ot.avance_pct as number}%` }]} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* COTIZACIONES RECIENTES */}
      {sesiones && sesiones.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cotizaciones recientes</Text>
          {sesiones.map((s: Record<string, unknown>) => (
            <TouchableOpacity key={s.id as string} style={styles.sesionCard} onPress={() => router.push(`/cotizador/${s.id}`)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sesionTipo}>{(s.tipo_trabajo as string) ?? 'Sin tipo'}</Text>
                <Text style={styles.sesionCliente}>{(s.cliente_nombre as string) ?? 'Sin cliente'}</Text>
                <Text style={styles.sesionFecha}>{new Date(s.created_at as string).toLocaleDateString('es-AR')}</Text>
              </View>
              <EstadoPill estado={s.estado as string} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.kpiCard, { borderColor: `${color}30` }]}>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function EstadoPill({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    iniciada: colors.text3, procesando: colors.honey,
    borrador: colors.copper, revisada: colors.honey,
    aprobada: colors.green, descartada: colors.red,
  };
  return (
    <View style={[styles.pill, { backgroundColor: `${map[estado] ?? colors.text3}20` }]}>
      <Text style={[styles.pillText, { color: map[estado] ?? colors.text3 }]}>{estado}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  greeting: { fontSize: 28, fontFamily: 'InstrumentSans_600SemiBold', color: colors.text1 },
  subtitle: { fontSize: 13, color: colors.text2, marginTop: 3, textTransform: 'capitalize', fontFamily: 'InstrumentSans_400Regular' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  kpiCard: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, borderWidth: 1 },
  kpiValue: { fontSize: 24, fontFamily: 'InstrumentSans_600SemiBold', marginBottom: 4 },
  kpiLabel: { fontSize: 12, color: colors.text2, fontFamily: 'InstrumentSans_400Regular' },
  cotizarBtn: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.borderGold, marginBottom: spacing.xl },
  cotizarTitle: { fontSize: 15, fontFamily: 'InstrumentSans_600SemiBold', color: colors.text1 },
  cotizarSub: { fontSize: 12, color: colors.text3, marginTop: 2 },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: 14, fontFamily: 'InstrumentSans_600SemiBold', color: colors.text2, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: spacing.sm },
  otCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  otHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  otNum: { fontSize: 10, fontFamily: 'InstrumentSans_400Regular', color: colors.text3 },
  otPct: { fontSize: 12, color: colors.green, fontFamily: 'InstrumentSans_600SemiBold' },
  otName: { fontSize: 14, fontFamily: 'InstrumentSans_600SemiBold', color: colors.text1 },
  otClient: { fontSize: 12, color: colors.text3, marginTop: 2, marginBottom: 8 },
  progressBar: { height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.green, borderRadius: 2 },
  sesionCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' },
  sesionTipo: { fontSize: 14, fontFamily: 'InstrumentSans_600SemiBold', color: colors.text1, textTransform: 'capitalize' },
  sesionCliente: { fontSize: 12, color: colors.text3, marginTop: 2 },
  sesionFecha: { fontSize: 10, color: colors.text3, marginTop: 4, fontFamily: 'InstrumentSans_400Regular' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillText: { fontSize: 10, fontFamily: 'InstrumentSans_400Regular' },
});
