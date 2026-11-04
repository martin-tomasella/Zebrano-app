// app/(tabs)/_layout.tsx — cinco pestañas; Cotizar va al centro como botón dorado de cámara
import { Tabs } from 'expo-router';
import { View, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts } from '@/lib/theme';

type Icono = React.ComponentProps<typeof Feather>['name'];
const icono = (name: Icono) => ({ color }: { color: string }) => <Feather name={name} size={22} color={color} />;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: colors.bgMid, borderTopColor: colors.border, height: 72, paddingBottom: 12, paddingTop: 8 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text2,
        tabBarLabelStyle: { fontSize: 11, fontFamily: fonts.medium },
        headerStyle: { backgroundColor: colors.bgDeep },
        headerShadowVisible: false,
        headerTintColor: colors.text1,
        headerTitleStyle: { fontFamily: fonts.bold, fontSize: 20 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', headerShown: false, tabBarIcon: icono('home') }} />
      <Tabs.Screen name="produccion" options={{ title: 'Producción', headerShown: false, tabBarIcon: icono('layers') }} />
      <Tabs.Screen
        name="cotizador"
        options={{
          title: 'Cotizar',
          headerShown: false,
          tabBarLabel: () => null,
          tabBarAccessibilityLabel: 'Cotizar desde un plano',
          tabBarButton: (p) => (
            <TouchableOpacity onPress={p.onPress} accessibilityRole="button" accessibilityLabel="Cotizar desde un plano" style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ marginTop: -22, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.gold, borderWidth: 4, borderColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="camera" size={24} color={colors.onGold} />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen name="tickets" options={{ title: 'Tickets', tabBarIcon: icono('file-text') }} />
      <Tabs.Screen name="mas" options={{ title: 'Más', tabBarIcon: icono('more-horizontal') }} />
      <Tabs.Screen name="proyectos" options={{ href: null, title: 'Proyectos' }} />
      <Tabs.Screen name="clientes" options={{ href: null, title: 'Clientes' }} />
    </Tabs>
  );
}
