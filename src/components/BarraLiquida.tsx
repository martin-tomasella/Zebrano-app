// src/components/BarraLiquida.tsx — menú inferior «liquid navigation»: la burbuja se desliza hasta la pestaña
// elegida, el ícono sube adentro de la burbuja y aparece la etiqueta debajo.
import { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, fonts } from '@/lib/theme';

type Icono = React.ComponentProps<typeof Feather>['name'];
export const ICONOS: Record<string, Icono> = { index: 'home', produccion: 'layers', cotizador: 'camera', tickets: 'file-text', mas: 'more-horizontal' };

const BURBUJA = 56;
const ALTO = 64;
const RESORTE = { damping: 16, stiffness: 160, mass: 0.8 };

export default function BarraLiquida({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const rutas = state.routes.filter((r) => ICONOS[r.name]);
  const activa = rutas.findIndex((r) => r.key === state.routes[state.index].key);
  const [ancho, setAncho] = useState(0);
  const tab = ancho / rutas.length;
  const x = useSharedValue(0);

  useEffect(() => {
    if (tab && activa >= 0) x.value = withSpring(activa * tab + (tab - BURBUJA) / 2, RESORTE);
  }, [activa, tab, x]);

  const burbuja = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    // En el flujo normal (no flotante): las pantallas se achican solas y nada queda tapado
    <View style={{ backgroundColor: colors.bgDeep, paddingHorizontal: 12, paddingTop: BURBUJA / 2 + 6, paddingBottom: insets.bottom + 10 }}>
      <View
        onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
        style={{ height: ALTO, borderRadius: 18, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12 }}
      >
        {/* La burbuja con un borde del color del fondo: simula el hueco en la barra */}
        {activa >= 0 && tab > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', top: -BURBUJA / 2 - 4, width: BURBUJA, height: BURBUJA, borderRadius: BURBUJA / 2, backgroundColor: colors.primary, borderWidth: 5, borderColor: colors.bgDeep }, burbuja]}
          />
        )}
        {rutas.map((r, i) => (
          <Item
            key={r.key}
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

function Item({ nombre, etiqueta, activo, onPress }: { nombre: string; etiqueta: string; activo: boolean; onPress: () => void }) {
  const p = useSharedValue(activo ? 1 : 0);
  useEffect(() => { p.value = withTiming(activo ? 1 : 0, { duration: 320 }); }, [activo, p]);
  const icono = useAnimatedStyle(() => ({ transform: [{ translateY: -p.value * (ALTO / 2 + 4) }] }));
  const texto = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 8 }] }));
  const reposo = nombre === 'cotizador' ? colors.gold : colors.text2;

  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: activo }} accessibilityLabel={etiqueta} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={icono}>
        <Feather name={ICONOS[nombre]} size={22} color={activo ? colors.onPrimary : reposo} />
      </Animated.View>
      <Animated.Text style={[{ position: 'absolute', bottom: 8, fontSize: 11, fontFamily: fonts.semibold, color: colors.text1 }, texto]}>{etiqueta}</Animated.Text>
    </Pressable>
  );
}
