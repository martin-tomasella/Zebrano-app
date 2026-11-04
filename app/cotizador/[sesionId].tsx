// app/cotizador/[sesionId].tsx
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/supabase';
import { colors, spacing, radius } from '@/lib/theme';

export default function SesionDetailScreen() {
  const { sesionId } = useLocalSearchParams<{ sesionId: string }>();
  const router = useRouter();

  const { data: sesion, isLoading } = useQuery({
    queryKey: ['sesion', sesionId],
    queryFn: () => db.sesiones.get(sesionId).then(r => r.data),
    enabled: !!sesionId,
  });

  if (isLoading) return <View style={styles.container}><Text style={styles.loading}>Cargando...</Text></View>;
  if (!sesion) return <View style={styles.container}><Text style={styles.loading}>Sesión no encontrada</Text></View>;

  const resumen = sesion.cotizacion_resumen?.[0];
  const piezas  = sesion.cotizacion_piezas ?? [];
  const hojas   = sesion.cotizacion_hojas ?? [];
  const herrajes= sesion.cotizacion_herrajes ?? [];
  const mo      = sesion.cotizacion_mano_obra ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.tipo}>{sesion.tipo_trabajo ?? 'Trabajo a medida'}</Text>
        <Text style={styles.cliente}>{sesion.cliente_nombre ?? 'Sin cliente'}</Text>
        <Text style={styles.fecha}>{new Date(sesion.created_at).toLocaleDateString('es-AR', { day:'numeric', month:'long', year:'numeric' })}</Text>
      </View>

      {/* RESUMEN ECONÓMICO */}
      {resumen && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen económico</Text>
          <EconRow label="Materiales" value={resumen.costo_materiales} />
          <EconRow label="Herrajes" value={resumen.costo_herrajes} />
          <EconRow label="Mano de obra" value={resumen.costo_mano_obra} />
          <View style={styles.divider} />
          <EconRow label="Costo interno total" value={resumen.costo_total_interno} />
          <EconRow label={`Margen ${resumen.margen_pct}%`} value={resumen.precio_sugerido - resumen.costo_total_interno} />
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Precio al cliente</Text>
            <Text style={styles.totalValue}>${Number(resumen.precio_final ?? resumen.precio_sugerido).toLocaleString('es-AR')}</Text>
          </View>
          {resumen.horas_totales_est && (
            <Text style={styles.horas}>⏱ {resumen.horas_totales_est} horas estimadas de producción</Text>
          )}
        </View>
      )}

      {/* HOJAS DE MATERIAL */}
      {hojas.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Materiales — por hojas</Text>
          <View style={styles.tableHeader}>
            {['Material','Hojas','Subtotal'].map(h => <Text key={h} style={styles.th}>{h}</Text>)}
          </View>
          {hojas.map((h: Record<string,unknown>) => (
            <View key={h.id as string} style={styles.tableRow}>
              <Text style={[styles.td, { flex: 2 }]}>{h.material as string}</Text>
              <Text style={styles.td}>{h.hojas_reales as number}</Text>
              <Text style={[styles.td, { color: colors.honey }]}>${Number(h.subtotal).toLocaleString('es-AR')}</Text>
            </View>
          ))}
        </View>
      )}

      {/* DESPIECE DE CORTE */}
      {piezas.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lista de corte ({piezas.length} piezas)</Text>
          {Array.from(new Set(piezas.map((p: Record<string,unknown>) => p.modulo_nombre as string))).map(modulo => (
            <View key={modulo} style={{ marginBottom: spacing.md }}>
              <Text style={styles.moduloTitle}>{modulo}</Text>
              <View style={styles.tableHeader}>
                {['Pieza','Largo','Ancho','Cant.','CL','CA'].map(h => <Text key={h} style={styles.th}>{h}</Text>)}
              </View>
              {piezas
                .filter((p: Record<string,unknown>) => p.modulo_nombre === modulo)
                .map((p: Record<string,unknown>) => (
                  <View key={p.id as string} style={styles.tableRow}>
                    <Text style={[styles.td, { flex: 2 }]}>{p.nombre_pieza as string}</Text>
                    <Text style={styles.td}>{p.largo_mm as number}</Text>
                    <Text style={styles.td}>{p.ancho_mm as number}</Text>
                    <Text style={styles.td}>{p.cantidad as number}</Text>
                    <Text style={[styles.td, { color: p.con_canto_largo ? colors.green : colors.text3 }]}>{p.con_canto_largo ? '✓' : '—'}</Text>
                    <Text style={[styles.td, { color: p.con_canto_ancho ? colors.green : colors.text3 }]}>{p.con_canto_ancho ? '✓' : '—'}</Text>
                  </View>
                ))}
            </View>
          ))}
        </View>
      )}

      {/* MANO DE OBRA */}
      {mo.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mano de obra</Text>
          {mo.map((m: Record<string,unknown>) => (
            <View key={m.id as string} style={styles.tableRow}>
              <Text style={[styles.td, { flex: 2 }]}>{m.operacion as string}</Text>
              <Text style={styles.td}>{m.horas_estimadas as number} hs</Text>
              <Text style={[styles.td, { color: colors.honey }]}>${Number(m.subtotal ?? 0).toLocaleString('es-AR')}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ACCIONES */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnPrimary}>
          <Text style={styles.btnPrimaryText}>Aprobar y crear OT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnGhost}>
          <Text style={styles.btnGhostText}>Exportar PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnGhost} onPress={() => router.back()}>
          <Text style={styles.btnGhostText}>← Volver al chat</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function EconRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text style={{ color: colors.text2, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: colors.text1, fontSize: 13, fontFamily: 'InstrumentSans_400Regular' }}>${Number(value ?? 0).toLocaleString('es-AR')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  loading: { color: colors.text3, textAlign: 'center', marginTop: 60 },
  header: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.borderGold },
  tipo: { fontSize: 20, fontFamily: 'InstrumentSans_600SemiBold', color: colors.text1, textTransform: 'capitalize' },
  cliente: { fontSize: 14, color: colors.honey, marginTop: 4 },
  fecha: { fontSize: 11, color: colors.text3, marginTop: 4, fontFamily: 'InstrumentSans_400Regular' },
  section: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: colors.text3, fontFamily: 'InstrumentSans_400Regular', marginBottom: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 },
  totalLabel: { fontSize: 15, fontFamily: 'InstrumentSans_600SemiBold', color: colors.text1 },
  totalValue: { fontSize: 18, fontFamily: 'InstrumentSans_600SemiBold', color: colors.amber },
  horas: { fontSize: 11, color: colors.text3, marginTop: 8, fontFamily: 'InstrumentSans_400Regular' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border, paddingBottom: 6, marginBottom: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderColor: `${colors.border}50` },
  th: { flex: 1, fontSize: 9, color: colors.text3, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'InstrumentSans_400Regular' },
  td: { flex: 1, fontSize: 12, color: colors.text2, fontFamily: 'InstrumentSans_400Regular' },
  moduloTitle: { fontSize: 13, fontFamily: 'InstrumentSans_600SemiBold', color: colors.gold, marginBottom: 6 },
  actions: { gap: spacing.sm, marginBottom: spacing.xl },
  btnPrimary: { backgroundColor: colors.gold, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  btnPrimaryText: { color: colors.bgDeep, fontSize: 15, fontFamily: 'InstrumentSans_600SemiBold' },
  btnGhost: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  btnGhostText: { color: colors.text2, fontSize: 13 },
});
