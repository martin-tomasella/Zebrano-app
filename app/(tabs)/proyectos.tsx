// app/(tabs)/proyectos.tsx
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { db } from '@/lib/supabase';
import { colors, spacing, radius } from '@/lib/theme';

const ESTADO_COLOR: Record<string, string> = {
  borrador: colors.text3, cotizando: colors.honey,
  propuesta_enviada: colors.gold, aprobado: colors.green,
  en_produccion: colors.green, entregado: colors.copper, cancelado: colors.red,
};

export default function ProyectosScreen() {
  const router = useRouter();
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['proyectos'],
    queryFn: () => db.proyectos.list().then(r => r.data ?? []),
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={data ?? []}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.gold} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Proyectos</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(tabs)/cotizador')}>
              <Text style={styles.addBtnText}>+ Nuevo</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={<EmptyState label="Sin proyectos aún" sub="Iniciá una cotización para crear el primero" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/proyecto/${item.id}`)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardName}>{item.nombre}</Text>
              <View style={[styles.pill, { backgroundColor: `${ESTADO_COLOR[item.estado] ?? colors.text3}20` }]}>
                <Text style={[styles.pillText, { color: ESTADO_COLOR[item.estado] ?? colors.text3 }]}>{item.estado}</Text>
              </View>
            </View>
            <Text style={styles.cardClient}>{item.clientes?.nombre ?? '—'}</Text>
            {item.valor_estimado && (
              <Text style={styles.cardValue}>${Number(item.valor_estimado).toLocaleString('es-AR')}</Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function EmptyState({ label, sub }: { label: string; sub: string }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 60 }}>
      <Text style={{ fontSize: 32, marginBottom: 12 }}>◻</Text>
      <Text style={{ color: colors.text1, fontSize: 16, fontFamily: 'InstrumentSans_600SemiBold' }}>{label}</Text>
      <Text style={{ color: colors.text3, fontSize: 13, marginTop: 6, textAlign: 'center' }}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { fontSize: 22, fontFamily: 'InstrumentSans_600SemiBold', color: colors.text1 },
  addBtn: { backgroundColor: colors.gold, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: colors.bgDeep, fontSize: 13, fontFamily: 'InstrumentSans_600SemiBold' },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { fontSize: 15, fontFamily: 'InstrumentSans_600SemiBold', color: colors.text1, flex: 1, marginRight: 8 },
  cardClient: { fontSize: 12, color: colors.text3 },
  cardValue: { fontSize: 16, fontFamily: 'InstrumentSans_600SemiBold', color: colors.honey, marginTop: 6 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  pillText: { fontSize: 10 },
});
