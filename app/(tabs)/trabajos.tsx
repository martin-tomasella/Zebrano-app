// app/(tabs)/trabajos.tsx — entrada a ventas: Nuevo trabajo, cotizaciones, clientes y obras, prospectos.
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Pantalla, Vidrio, Fila, Boton, T } from '@/components/ui';

export default function Trabajos() {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ['trabajos-cuentas'],
    queryFn: async () => {
      const [s, c, p] = await Promise.all([
        supabase.from('cotizacion_sesiones').select('id', { count: 'exact', head: true }).in('estado', ['iniciada', 'procesando', 'borrador', 'revisada']),
        supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('prospectos').select('id', { count: 'exact', head: true }).eq('activo', true).eq('convertido_a_cliente', false),
      ]);
      return { abiertas: s.count ?? 0, clientes: c.count ?? 0, prospectos: p.count ?? 0 };
    },
  });
  return (
    <Pantalla titulo="Trabajos">
      <Vidrio destacado style={{ gap: 10 }}>
        <T v="h2" color="#ffffff">Nuevo trabajo</T>
        <T color="rgba(255,255,255,0.9)">Plano, foto o medidas → diseño → render → cotización → orden de trabajo.</T>
        <Boton tipo="secundario" icono="plus" texto="Empezar" onPress={() => router.push('/nuevo-trabajo')} />
      </Vidrio>
      <Vidrio style={{ paddingVertical: 4 }}>
        <Fila primera icono="file-document-multiple-outline" titulo="Cotizaciones" sub={`${data?.abiertas ?? '…'} sin aprobar`} onPress={() => router.push('/cotizaciones')} />
        <Fila icono="account-group-outline" titulo="Clientes y obras" sub={`${data?.clientes ?? '…'} clientes activos`} onPress={() => router.push('/clientes')} />
        <Fila icono="account-question-outline" titulo="Prospectos" sub={`${data?.prospectos ?? '…'} abiertos`} onPress={() => router.push('/prospectos')} />
        <Fila icono="chat-processing-outline" titulo="Asistente del cotizador" sub="Chat para pedir cambios en lenguaje natural" onPress={() => router.push('/asistente')} />
      </Vidrio>
    </Pantalla>
  );
}
