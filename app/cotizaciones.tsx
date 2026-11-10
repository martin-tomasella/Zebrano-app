// app/cotizaciones.tsx — las últimas cotizaciones (las mismas sesiones que ve el Cotizador de la web).
import { Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase, abrirDocumento } from '@/lib/supabase';
import { Pantalla, Vidrio, T, Badge, Boton, Cargando, Vacio, ars, usd, fecha, tonoEstado } from '@/components/ui';

interface Res { precio_sugerido?: number | null; precio_usd?: number | null; pdf_presupuesto_url?: string | null }

export default function Cotizaciones() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['cotizaciones'],
    queryFn: async () => (await supabase.from('cotizacion_sesiones').select('id,created_at,cliente_nombre,tipo_trabajo,ambiente,version,estado,origen,cotizacion_resumen(precio_sugerido,precio_usd,pdf_presupuesto_url)').neq('estado', 'descartada').order('created_at', { ascending: false }).limit(60)).data ?? [],
  });
  return (
    <Pantalla onRefresh={refetch} refrescando={isRefetching}>
      {isLoading ? <Cargando /> : !data?.length ? <Vacio icono="file-document-outline" titulo="Sin cotizaciones" /> : data.map((s) => {
        const r = (Array.isArray(s.cotizacion_resumen) ? s.cotizacion_resumen[0] : s.cotizacion_resumen) as Res | null;
        return (
          <Vidrio key={s.id} style={{ gap: 6 }}>
            <T v="h2">{s.cliente_nombre || 'Sin cliente'}</T>
            <Badge texto={s.estado} tono={tonoEstado(s.estado)} />
            <T v="chico">{[s.tipo_trabajo, s.ambiente, `v${s.version || 1}`, fecha(s.created_at), s.origen].filter(Boolean).join(' · ')}</T>
            {r?.precio_sugerido ? <T>{ars(r.precio_sugerido)} · {usd(r.precio_usd)}</T> : null}
            {!!r?.pdf_presupuesto_url && <Boton chico tipo="quiet" icono="file-pdf-box" texto="Presupuesto PDF" onPress={() => abrirDocumento(r.pdf_presupuesto_url as string).catch((e: Error) => Alert.alert('No se pudo abrir', e.message))} />}
          </Vidrio>
        );
      })}
    </Pantalla>
  );
}
