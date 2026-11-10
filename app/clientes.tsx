// app/clientes.tsx — clientes activos; cada uno abre su ficha con obras, trabajos, cotizaciones y saldo.
import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Pantalla, Vidrio, Campo, Fila, Cargando, Vacio } from '@/components/ui';

export default function Clientes() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['clientes-lista'],
    queryFn: async () => (await supabase.from('clientes').select('id,nombre,telefono,email,obras(id)').eq('activo', true).order('nombre')).data ?? [],
  });
  const vis = (data ?? []).filter((c) => !q || `${c.nombre} ${c.telefono ?? ''} ${c.email ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Pantalla onRefresh={refetch} refrescando={isRefetching}>
      <Campo placeholder="Buscar cliente…" value={q} onChangeText={setQ} />
      {isLoading ? <Cargando /> : vis.length === 0 ? <Vacio icono="account-search-outline" titulo="Sin clientes con ese nombre" /> : (
        <Vidrio style={{ paddingVertical: 4 }}>
          {vis.map((c, i) => (
            <Fila key={c.id} primera={i === 0} titulo={c.nombre} icono="account-outline"
              sub={[c.telefono, `${(c.obras as unknown[] | null)?.length ?? 0} obra(s)`].filter(Boolean).join(' · ')}
              onPress={() => router.push(`/cliente/${c.id}`)} />
          ))}
        </Vidrio>
      )}
      <View style={{ height: 8 }} />
    </Pantalla>
  );
}
