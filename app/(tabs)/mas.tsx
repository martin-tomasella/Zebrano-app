// app/(tabs)/mas.tsx — prospección (admin y gestión), tema y salir.
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store';
import { puede } from '@/lib/permisos';
import { useTema } from '@/lib/theme';
import { Pantalla, Vidrio, T, Fila, Boton, Segmentado } from '@/components/ui';

export default function Mas() {
  const router = useRouter();
  const empleado = useAppStore((s) => s.empleado);
  const { modo, setModo } = useTema();
  return (
    <Pantalla titulo="Más">
      <Vidrio style={{ gap: 2 }}>
        <T v="h2">{empleado?.nombre}</T>
        <T v="chico" style={{ textTransform: 'capitalize' }}>{empleado?.rol}</T>
      </Vidrio>
      {puede(empleado?.rol, 'prospeccion') && <Vidrio style={{ paddingVertical: 4 }}>
        <Fila primera icono="email-search-outline" titulo="Prospección" sub="Bandeja de mails para aprobar" onPress={() => router.push('/prospeccion')} />
      </Vidrio>}
      <Vidrio style={{ gap: 10 }}>
        <T v="h2">Tema</T>
        <Segmentado opciones={[['sistema', 'Del sistema'], ['claro', 'Claro'], ['oscuro', 'Oscuro']]} valor={modo} onChange={setModo} />
      </Vidrio>
      <Boton tipo="secundario" icono="logout" texto="Cerrar sesión" onPress={() => supabase.auth.signOut()} />
    </Pantalla>
  );
}
