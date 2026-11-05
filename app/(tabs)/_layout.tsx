// app/(tabs)/_layout.tsx — cinco pestañas con el menú «liquid» (src/components/BarraLiquida.tsx)
import { Tabs } from 'expo-router';
import BarraLiquida from '@/components/BarraLiquida';
import { colors, fonts } from '@/lib/theme';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(p) => <BarraLiquida {...p} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgDeep },
        headerShadowVisible: false,
        headerTintColor: colors.text1,
        headerTitleStyle: { fontFamily: fonts.bold, fontSize: 20 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', headerShown: false }} />
      <Tabs.Screen name="produccion" options={{ title: 'Producción', headerShown: false }} />
      <Tabs.Screen name="cotizador" options={{ title: 'Cotizar', headerShown: false }} />
      <Tabs.Screen name="tickets" options={{ title: 'Tickets' }} />
      <Tabs.Screen name="mas" options={{ title: 'Más' }} />
      <Tabs.Screen name="proyectos" options={{ href: null, title: 'Proyectos' }} />
      <Tabs.Screen name="clientes" options={{ href: null, title: 'Clientes' }} />
    </Tabs>
  );
}
