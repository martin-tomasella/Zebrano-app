// app/(tabs)/index.tsx — Inicio: KPIs reales y "Nuevo trabajo". El taller no ve montos.
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store';
import { puede } from '@/lib/permisos';
import { Pantalla, Kpi, Boton, Vidrio, Fila, T, Badge, ars, tonoEstado } from '@/components/ui';

export default function Inicio() {
  const router = useRouter();
  const empleado = useAppStore((s) => s.empleado);
  const ventas = puede(empleado?.rol, 'ventas');
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['inicio', ventas],
    queryFn: async () => {
      const [ots, cot, nec] = await Promise.all([
        supabase.from('ordenes_trabajo').select('id,numero_ot,estado,proyectos(clientes(nombre))').in('estado', ['pendiente', 'en_proceso']).or('historica.is.null,historica.eq.false').order('numero_ot', { ascending: false }),
        ventas ? supabase.from('cotizacion_sesiones').select('id,cliente_nombre,tipo_trabajo,estado,cotizacion_resumen(precio_sugerido)').in('estado', ['iniciada', 'procesando', 'borrador', 'revisada']).order('created_at', { ascending: false }).limit(5) : Promise.resolve({ data: [] }),
        supabase.from('ot_necesidades').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente').is('decision', null),
      ]);
      const o = (ots.data ?? []) as unknown as { id: string; numero_ot: string; estado: string; proyectos: { clientes: { nombre: string } | null } | null }[];
      return { taller: o.filter((x) => x.estado === 'en_proceso'), cola: o.filter((x) => x.estado === 'pendiente'), cot: (cot.data ?? []) as { id: string; cliente_nombre: string | null; tipo_trabajo: string | null; estado: string; cotizacion_resumen: { precio_sugerido: number | null }[] | { precio_sugerido: number | null } | null }[], sinDecidir: nec.count ?? 0 };
    },
  });
  const nombre = (empleado?.nombre ?? '').split(' ')[0];
  return (
    <Pantalla titulo={`Hola, ${nombre}`} sub={new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} onRefresh={refetch} refrescando={isRefetching}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Kpi destacado etiqueta="En el taller" valor={String(data?.taller.length ?? '…')} icono="hammer-wrench" />
        <Kpi etiqueta="En cola" valor={String(data?.cola.length ?? '…')} icono="tray-full" />
        {ventas && <Kpi etiqueta="Cotizaciones abiertas" valor={String(data?.cot.length ?? '…')} icono="file-document-edit-outline" />}
        <Kpi etiqueta="Materiales sin decidir" valor={String(data?.sinDecidir ?? '…')} icono="package-variant" />
      </View>
      {ventas && <Boton icono="plus" texto="Nuevo trabajo" onPress={() => router.push('/nuevo-trabajo')} />}

      {(data?.taller.length ?? 0) > 0 && <>
        <T v="etiqueta">En el taller</T>
        <Vidrio style={{ paddingVertical: 4 }}>
          {data!.taller.map((o, i) => <Fila key={o.id} primera={i === 0} icono="hammer-wrench" titulo={o.proyectos?.clientes?.nombre ?? o.numero_ot} sub={o.numero_ot} onPress={() => router.push(`/ot/${o.id}`)} />)}
        </Vidrio>
      </>}

      {ventas && (data?.cot.length ?? 0) > 0 && <>
        <T v="etiqueta">Cotizaciones sin aprobar</T>
        <Vidrio style={{ paddingVertical: 4 }}>
          {data!.cot.map((s, i) => {
            const r = Array.isArray(s.cotizacion_resumen) ? s.cotizacion_resumen[0] : s.cotizacion_resumen;
            return <Fila key={s.id} primera={i === 0} titulo={s.cliente_nombre || 'Sin cliente'} sub={[s.tipo_trabajo, r?.precio_sugerido ? ars(r.precio_sugerido) : null].filter(Boolean).join(' · ')} derecha={<Badge texto={s.estado} tono={tonoEstado(s.estado)} />} onPress={() => router.push('/cotizaciones')} />;
          })}
        </Vidrio>
      </>}
    </Pantalla>
  );
}
