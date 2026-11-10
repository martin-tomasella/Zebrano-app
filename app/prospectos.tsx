// app/prospectos.tsx — prospectos activos que todavía no son clientes; "Cotizar trabajo" abre Nuevo trabajo con el prospecto.
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Pantalla, Vidrio, T, Badge, Boton, Campo, Cargando, Vacio, fecha, tonoEstado } from '@/components/ui';

export default function Prospectos() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['prospectos-lista'],
    queryFn: async () => (await supabase.from('prospectos').select('id,nombre,apellido,telefono,email,estado,canal_origen,tipo_trabajo,descripcion_proyecto,created_at').eq('activo', true).eq('convertido_a_cliente', false).order('created_at', { ascending: false }).limit(300)).data ?? [],
  });
  const vis = (data ?? []).filter((p) => !q || `${p.nombre} ${p.apellido ?? ''} ${p.tipo_trabajo ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Pantalla onRefresh={refetch} refrescando={isRefetching}>
      <Campo placeholder="Buscar prospecto…" value={q} onChangeText={setQ} />
      {isLoading ? <Cargando /> : vis.length === 0 ? <Vacio icono="account-question-outline" titulo="Sin prospectos abiertos" /> : vis.map((p) => (
        <Vidrio key={p.id} style={{ gap: 6 }}>
          <T v="h2">{[p.nombre, p.apellido].filter(Boolean).join(' ')}</T>
          <Badge texto={String(p.estado ?? 'nuevo').replace('_', ' ')} tono={tonoEstado(p.estado)} />
          <T v="chico">{[p.tipo_trabajo, p.canal_origen, p.telefono, fecha(p.created_at)].filter(Boolean).join(' · ')}</T>
          {!!p.descripcion_proyecto && <T lineas={3}>{p.descripcion_proyecto}</T>}
          <Boton chico tipo="secundario" icono="calculator-variant-outline" texto="Cotizar trabajo" onPress={() => router.push({ pathname: '/nuevo-trabajo', params: { prospecto: p.id } })} />
        </Vidrio>
      ))}
    </Pantalla>
  );
}
