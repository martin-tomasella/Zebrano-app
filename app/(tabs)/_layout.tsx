// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { colors } from '@/lib/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.bgMid,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.text3,
        tabBarLabelStyle: { fontSize: 10, fontFamily: 'Syne_400Regular' },
        headerStyle: { backgroundColor: colors.bgMid },
        headerTintColor: colors.text1,
        headerTitleStyle: { fontFamily: 'Syne_600SemiBold' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarIcon: ({ color }) => <TabIcon label="◈" color={color} /> }}
      />
      <Tabs.Screen
        name="cotizador"
        options={{ title: 'Cotizador', tabBarIcon: ({ color }) => <TabIcon label="◇" color={color} /> }}
      />
      <Tabs.Screen
        name="proyectos"
        options={{ title: 'Proyectos', tabBarIcon: ({ color }) => <TabIcon label="◻" color={color} /> }}
      />
      <Tabs.Screen
        name="produccion"
        options={{ title: 'Producción', tabBarIcon: ({ color }) => <TabIcon label="⬡" color={color} /> }}
      />
      <Tabs.Screen
        name="tickets"
        options={{ title: 'Tickets', tabBarIcon: ({ color }) => <TabIcon label="▣" color={color} /> }}
      />
      <Tabs.Screen
        name="clientes"
        options={{ title: 'Clientes', tabBarIcon: ({ color }) => <TabIcon label="○" color={color} /> }}
      />
    </Tabs>
  );
}

function TabIcon({ label, color }: { label: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ color, fontSize: 18, marginTop: 4 }}>{label}</Text>;
}
