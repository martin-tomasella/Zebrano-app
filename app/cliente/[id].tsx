// app/cliente/[id].tsx — ficha de cliente (como FichaCliente.jsx de la web): obras con sus trabajos,
// cotizaciones (precio, cierre, descuento, USD, PDF firmado) y vendido / cobrado / saldo.
import { View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase, abrirDocumento } from '@/lib/supabase';
import { useTema } from '@/lib/theme';
import { Pantalla, Vidrio, T, Badge, Boton, Kpi, Cargando, ars, usd, fecha, tonoEstado } from '@/components/ui';

interface Trabajo { id: string; nombre?: string | null; tipo_trabajo?: string | null; estado: string; obra_id?: string | null; valor_final?: number | null; valor_estimado?: number | null; fecha_cotizado?: string | null; fecha_creacion?: string | null }
interface Res { precio_sugerido?: number | null; precio_final?: number | null; precio_usd?: number | null; pdf_presupuesto_url?: string | null }
interface Cot { id: string; created_at: string; tipo_trabajo?: string | null; ambiente?: string | null; version?: number | null; estado: string; precio_aprobado?: number | null; cotizacion_resumen: Res | Res[] | null }

export default function FichaCliente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTema();
  const { data: d } = useQuery({
    queryKey: ['ficha-cliente', id],
    queryFn: async () => {
      const [cl, o, t, s, p, tc] = await Promise.all([
        supabase.from('clientes').select('id,nombre,telefono,email,direccion_obra').eq('id', id).single(),
        supabase.from('obras').select('id,nombre,direccion').eq('cliente_id', id).order('created_at', { ascending: false }),
        supabase.from('proyectos').select('id,nombre,tipo_trabajo,estado,obra_id,valor_final,valor_estimado,fecha_cotizado,fecha_creacion').eq('cliente_id', id).order('created_at', { ascending: false }),
        supabase.from('cotizacion_sesiones').select('id,created_at,tipo_trabajo,ambiente,version,estado,precio_aprobado,cotizacion_resumen(precio_sugerido,precio_final,precio_usd,pdf_presupuesto_url)').eq('cliente_id', id).order('created_at', { ascending: false }),
        supabase.from('pagos').select('monto,moneda,estado').eq('cliente_id', id),
        supabase.from('tipos_cambio').select('fecha,oficial_venta').not('oficial_venta', 'is', null).order('fecha', { ascending: false }).limit(1000),
      ]);
      if (cl.error) throw cl.error;
      return { cliente: cl.data, obras: o.data ?? [], trabajos: (t.data ?? []) as Trabajo[], cot: (s.data ?? []) as Cot[], pagos: p.data ?? [], tc: (tc.data ?? []).reverse() };
    },
  });
  if (!d) return <Pantalla><Cargando /></Pantalla>;

  // Oficial BCRA del día (o el último anterior) para pasar a USD lo cotizado antes del 10/11.
  const tcDe = (f?: string | null) => { if (!f) return null; let r: number | null = null; for (const t of d.tc) { if (t.fecha <= String(f).slice(0, 10)) r = Number(t.oficial_venta); else break; } return r; };
  const valor = (t: Trabajo) => Number(t.valor_final || t.valor_estimado || 0);
  const usdDe = (t: Trabajo) => { const x = tcDe(t.fecha_cotizado || t.fecha_creacion); return x && valor(t) ? valor(t) / x : null; };
  const grupos = [...d.obras.map((o) => ({ ...o, trabajos: d.trabajos.filter((t) => t.obra_id === o.id) })), { id: null as string | null, nombre: 'Sin obra', direccion: null as string | null, trabajos: d.trabajos.filter((t) => !t.obra_id) }].filter((g) => g.id || g.trabajos.length);
  const cobrado = d.pagos.filter((p) => p.estado !== 'pendiente' && (p.moneda || 'ARS') === 'ARS').reduce((a, p) => a + Number(p.monto || 0), 0);
  const vendido = d.trabajos.filter((t) => !['cancelado', 'prospecto', 'cotizado'].includes(t.estado)).reduce((a, t) => a + valor(t), 0);
  const pdf = (path: string) => abrirDocumento(path).catch((e: Error) => Alert.alert('No se pudo abrir', e.message));

  return (
    <Pantalla>
      <Stack.Screen options={{ title: d.cliente.nombre }} />
      <Vidrio style={{ gap: 2 }}>
        <T v="h2">{d.cliente.nombre}</T>
        <T v="chico">{[d.cliente.telefono, d.cliente.email, d.cliente.direccion_obra].filter(Boolean).join(' · ') || 'Sin datos de contacto'}</T>
      </Vidrio>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Kpi destacado etiqueta="Saldo" valor={ars(vendido - cobrado)} />
        <Kpi etiqueta="Vendido" valor={ars(vendido)} detalle={`cobrado ${ars(cobrado)}`} />
      </View>
      <Boton icono="plus" texto="Nuevo trabajo" onPress={() => router.push({ pathname: '/nuevo-trabajo', params: { cliente: id } })} />

      <T v="etiqueta">Obras ({d.obras.length})</T>
      {grupos.map((g) => (
        <Vidrio key={g.id ?? 'sin'} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ flex: 1 }}><T v="h2">{g.nombre}</T>{!!g.direccion && <T v="chico">{g.direccion}</T>}</View>
            <T style={{ fontVariant: ['tabular-nums'] }}>{ars(g.trabajos.reduce((a, t) => a + valor(t), 0))}</T>
          </View>
          {g.trabajos.length === 0 ? <T v="chico">Sin trabajos todavía.</T> : g.trabajos.map((t) => (
            <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.linea }}>
              <View style={{ flex: 1, gap: 3 }}>
                <T style={{ fontSize: 14 }}>{t.nombre || t.tipo_trabajo || 'Trabajo'}</T>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Badge texto={t.estado.replace('_', ' ')} tono={tonoEstado(t.estado)} /><T v="chico">{fecha(t.fecha_cotizado || t.fecha_creacion)}</T></View>
              </View>
              <View style={{ alignItems: 'flex-end' }}><T style={{ fontVariant: ['tabular-nums'] }}>{ars(valor(t))}</T><T v="chico">{usd(usdDe(t))}</T></View>
            </View>
          ))}
          {g.id && <Boton chico tipo="quiet" icono="plus" texto="Trabajo" onPress={() => router.push({ pathname: '/nuevo-trabajo', params: { cliente: id, obra: g.id as string } })} />}
        </Vidrio>
      ))}

      <T v="etiqueta">Cotizaciones ({d.cot.length})</T>
      {d.cot.length === 0 ? <T v="chico">Sin cotizaciones del cotizador para este cliente.</T> : d.cot.map((s) => {
        const r = Array.isArray(s.cotizacion_resumen) ? s.cotizacion_resumen[0] : s.cotizacion_resumen;
        const lista = Number(r?.precio_sugerido || 0), cierre = Number(s.precio_aprobado || r?.precio_final || 0);
        const desc = lista && cierre && cierre < lista ? Math.round((1 - cierre / lista) * 100) : null;
        const enUsd = r?.precio_usd ?? (lista && tcDe(s.created_at) ? lista / (tcDe(s.created_at) as number) : null);
        return (
          <Vidrio key={s.id} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T style={{ flex: 1, fontSize: 14.5 }}>{[s.tipo_trabajo, s.ambiente].filter(Boolean).join(' · ') || 'Cotización'} · v{s.version || 1}</T>
              <Badge texto={s.estado} tono={tonoEstado(s.estado)} />
            </View>
            <T v="chico">{fecha(s.created_at)} · precio {ars(lista || null)}{cierre ? ` · cerrado ${ars(cierre)}` : ''}{desc != null ? ` (−${desc}%)` : ''} · {usd(enUsd)}</T>
            {!!r?.pdf_presupuesto_url && <Boton chico tipo="quiet" icono="file-pdf-box" texto="Presupuesto PDF" onPress={() => pdf(r.pdf_presupuesto_url as string)} />}
          </Vidrio>
        );
      })}
    </Pantalla>
  );
}
