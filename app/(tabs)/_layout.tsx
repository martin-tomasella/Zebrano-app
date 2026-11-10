// app/(tabs)/_layout.tsx — Inicio · Trabajos · Producción · Compras · Más, con el menú «liquid».
// El taller no ve Trabajos ni Compras (precios y ventas), como en la web (src/lib/permisos.js).
import { Tabs } from 'expo-router';
import BarraLiquida from '@/components/BarraLiquida';
import { useAppStore } from '@/store';
import { puede } from '@/lib/permisos';

export default function TabLayout() {
  const rol = useAppStore((s) => s.empleado?.rol);
  const visibles = ['index', 'produccion', 'mas', ...(puede(rol, 'ventas') ? ['trabajos'] : []), ...(puede(rol, 'compras') ? ['compras'] : [])];
  return (
    <Tabs tabBar={(p) => <BarraLiquida {...p} visibles={visibles} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}>
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="trabajos" options={{ title: 'Trabajos', href: visibles.includes('trabajos') ? undefined : null }} />
      <Tabs.Screen name="produccion" options={{ title: 'Producción' }} />
      <Tabs.Screen name="compras" options={{ title: 'Compras', href: visibles.includes('compras') ? undefined : null }} />
      <Tabs.Screen name="mas" options={{ title: 'Más' }} />
    </Tabs>
  );
}
