// src/components/BarraLiquida.tsx — menú inferior «liquid navigation» sobre vidrio: la burbuja se desliza hasta la pestaña
// elegida, el ícono sube adentro de la burbuja y aparece la etiqueta debajo.
import { useEffect, useState } from 'react';
import { View, Pressable, Platform, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTema, fonts, type Colores } from '@/lib/theme';

type Icono = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
export const ICONOS: Record<string, Icono> = { index: 'home-variant-outline', trabajos: 'clipboard-text-outline', produccion: 'factory', compras: 'cart-outline', mas: 'dots-horizontal' };

const BURBUJA = 56;
const ALTO = 64;
const RESORTE = { damping: 16, stiffness: 160, mass: 0.8 };

export default function BarraLiquida({ state, descriptors, navigation, visibles }: BottomTabBarProps & { visibles: string[] }) {
  const { c, oscuro } = useTema();
  const insets = useSafeAreaInsets();
  const rutas = state.routes.filter((r) => ICONOS[r.name] && visibles.includes(r.name));
  const activa = rutas.findIndex((r) => r.key === state.routes[state.index].key);
  const [ancho, setAncho] = useState(0);
  const tab = ancho / Math.max(1, rutas.length);
  const x = useSharedValue(0);

  useEffect(() => {
    if (tab && activa >= 0) x.value = withSpring(activa * tab + (tab - BURBUJA) / 2, RESORTE);
  }, [activa, tab, x]);

  const burbuja = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: BURBUJA / 2 + 6, paddingBottom: insets.bottom + 10 }}>
      <View
        onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
        style={{ height: ALTO, borderRadius: 22, borderWidth: 1, borderColor: c.vidrioBorde, flexDirection: 'row', backgroundColor: Platform.OS === 'ios' ? 'transparent' : c.vidrioFuerte,
          shadowColor: c.sombra, shadowOpacity: 1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10 }}
      >
        {Platform.OS === 'ios' && <BlurView intensity={40} tint={oscuro ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, { borderRadius: 22, overflow: 'hidden', backgroundColor: c.vidrio }]} />}
        {activa >= 0 && tab > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', top: -BURBUJA / 2 - 4, width: BURBUJA, height: BURBUJA, borderRadius: BURBUJA / 2, backgroundColor: c.primario, borderWidth: 4, borderColor: c.vidrioFuerte,
              shadowColor: c.sombra, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 }, burbuja]}
          />
        )}
        {rutas.map((r, i) => (
          <Item
            key={r.key}
            c={c}
            nombre={r.name}
            etiqueta={String(descriptors[r.key].options.title ?? r.name)}
            activo={i === activa}
            onPress={() => {
              const ev = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
              if (i !== activa && !ev.defaultPrevented) navigation.navigate(r.name);
            }}
          />
        ))}
      </View>
    </View>
  );
}

function Item({ c, nombre, etiqueta, activo, onPress }: { c: Colores; nombre: string; etiqueta: string; activo: boolean; onPress: () => void }) {
  const p = useSharedValue(activo ? 1 : 0);
  useEffect(() => { p.value = withTiming(activo ? 1 : 0, { duration: 320 }); }, [activo, p]);
  const icono = useAnimatedStyle(() => ({ transform: [{ translateY: -p.value * (ALTO / 2 + 4) }] }));
  const texto = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 8 }] }));

  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: activo }} accessibilityLabel={etiqueta} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={icono}>
        <MaterialCommunityIcons name={ICONOS[nombre]} size={24} color={activo ? c.sobrePrimario : c.texto2} />
      </Animated.View>
      <Animated.Text style={[{ position: 'absolute', bottom: 8, fontSize: 11, fontFamily: fonts.semibold, color: c.texto }, texto]}>{etiqueta}</Animated.Text>
    </Pressable>
  );
}
