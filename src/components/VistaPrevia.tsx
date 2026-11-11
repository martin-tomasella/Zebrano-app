// src/components/VistaPrevia.tsx — vista previa del diseño (como el panel "z-cot-prev" y el Visor de Cotizador.jsx en la web):
// pestañas Render / Plano técnico / Plano subido, precio sin IVA y en USD, y visor a pantalla completa con zoom y paneo.
import { useEffect, useState } from 'react';
import { View, Modal, Pressable, Alert, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { SvgXml } from 'react-native-svg';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTema, radius } from '@/lib/theme';
import { Vidrio, T, Boton, Segmentado, Icono, ars, usd } from '@/components/ui';

export interface Vista { key: string; label: string; uri?: string; svg?: string; blanco?: boolean }
const ALTO = 220;

// Lo guardado de la sesión: render (diseño o resumen), plano técnico y precio. `clave` fuerza a releer tras cada paso.
export function useVistaPrevia(sesionId: string | null, clave: unknown, subidos: string[]) {
  const { data } = useQuery({
    queryKey: ['vista-previa', sesionId, clave], enabled: !!sesionId,
    queryFn: async () => {
      const [d, r] = await Promise.all([
        supabase.from('cotizacion_diseno').select('render_fotorrealista_url,svg_tecnico').eq('sesion_id', sesionId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('cotizacion_resumen').select('render_url,precio_sugerido,precio_usd').eq('sesion_id', sesionId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      return { diseno: d.data, resumen: r.data };
    },
  });
  const render = data?.diseno?.render_fotorrealista_url || data?.resumen?.render_url;
  const vistas: Vista[] = !sesionId ? [] : [
    ...(render ? [{ key: 'render', label: 'Render', uri: render }] : []),
    ...(data?.diseno?.svg_tecnico ? [{ key: 'plano', label: 'Plano técnico', svg: data.diseno.svg_tecnico, blanco: true }] : []),
    ...subidos.map((u, i) => ({ key: `subido${i}`, label: subidos.length > 1 ? `Plano subido ${i + 1}` : 'Plano subido', uri: u, blanco: true })),
  ];
  return { vistas, precio: data?.resumen?.precio_sugerido as number | null | undefined, precioUsd: data?.resumen?.precio_usd as number | null | undefined };
}

// Tablet en horizontal: la vista previa va al costado (55%) y el chat o los pasos al lado (45%).
export const useAlCostado = () => { const { width, height } = useWindowDimensions(); return width >= 900 && width > height; };

// Proporción ancho/alto: del viewBox del SVG o del tamaño de la imagen.
const proporcionSvg = (svg: string) => {
  const m = svg.match(/viewBox="[\d.\s-]*?\s([\d.]+)\s+([\d.]+)"/) ?? svg.match(/width="([\d.]+)[^"]*"\s+height="([\d.]+)/);
  return m ? Number(m[1]) / Number(m[2]) || 1.6 : 1.6;
};

function Contenido({ v, ancho, alto, onAspecto }: { v: Vista; ancho: number; alto: number; onAspecto?: (a: number) => void }) {
  if (v.svg) return <SvgXml xml={v.svg} width={ancho} height={alto} />;
  return <Image source={{ uri: v.uri }} style={{ width: ancho, height: alto }} contentFit="contain" cachePolicy="memory-disk"
    onLoad={(e) => onAspecto?.(e.source.width / e.source.height)} accessibilityLabel={v.label} />;
}

export default function VistaPrevia({ vistas, precio, precioUsd, alto = ALTO }: { vistas: Vista[]; precio?: number | null; precioUsd?: number | null; alto?: number }) {
  const { c } = useTema();
  const [key, setKey] = useState<string | null>(null);
  const [ampliar, setAmpliar] = useState(false);
  const [ancho, setAncho] = useState(0);
  if (!vistas.length) return null;
  const vista = vistas.find((v) => v.key === key) ?? vistas[0];
  return (
    <View style={{ gap: 10 }}>
      <Vidrio style={{ padding: 10, gap: 10 }}>
        {vistas.length > 1 && <Segmentado envolver opciones={vistas.map((v) => [v.key, v.label] as [string, string])} valor={vista.key} onChange={setKey} />}
        <Pressable onPress={() => setAmpliar(true)} accessibilityRole="button" accessibilityLabel={`Ampliar ${vista.label}`} onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
          style={{ height: alto, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: vista.blanco ? c.papel : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
          {ancho > 0 && <Contenido v={vista} ancho={ancho - 8} alto={alto - 8} />}
          <View style={{ position: 'absolute', right: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: c.vidrioFuerte }}>
            <Icono n="magnify-plus-outline" size={16} color={c.texto} /><T v="chico" color={c.texto}>Ampliar</T>
          </View>
        </Pressable>
      </Vidrio>
      {!!precio && precio > 0 && (
        <Vidrio style={{ flexDirection: 'row', gap: 24, paddingVertical: 12 }}>
          <View><T v="chico">Precio sin IVA</T><T v="num" style={{ fontSize: 20 }}>{ars(precio)}</T></View>
          {!!precioUsd && precioUsd > 0 && <View><T v="chico">En dólares</T><T v="num" style={{ fontSize: 20 }}>{usd(precioUsd)}</T></View>}
        </Vidrio>
      )}
      <Visor visible={ampliar} vistas={vistas} inicial={vista.key} onCerrar={() => setAmpliar(false)} />
    </View>
  );
}

// Visor a pantalla completa: pellizcar para zoom, arrastrar para moverse; Ajustar / 100% / 200% / 300% como en la web.
function Visor({ visible, vistas, inicial, onCerrar }: { visible: boolean; vistas: Vista[]; inicial: string; onCerrar: () => void }) {
  const { c } = useTema();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const [key, setKey] = useState(inicial);
  const [aspecto, setAspecto] = useState(1.6);
  const [zoom, setZoom] = useState(0);
  const vista = vistas.find((v) => v.key === key) ?? vistas[0];
  useEffect(() => { if (visible) setKey(inicial); }, [visible, inicial]);
  useEffect(() => { if (vista?.svg) setAspecto(proporcionSvg(vista.svg)); }, [vista]);

  const altoLienzo = H - insets.top - insets.bottom - 120;
  const base = { w: W, h: W / aspecto }; // a lo ancho de la pantalla = 100%
  const ajustar = Math.min(1, altoLienzo / base.h);
  const escala = useSharedValue(ajustar), guardada = useSharedValue(ajustar);
  const tx = useSharedValue(0), ty = useSharedValue(0), gx = useSharedValue(0), gy = useSharedValue(0);
  const fijar = (z: number) => {
    setZoom(z);
    const s = z === 0 ? ajustar : z;
    escala.value = withTiming(s); guardada.value = s; tx.value = withTiming(0); ty.value = withTiming(0); gx.value = 0; gy.value = 0;
  };
  useEffect(() => { fijar(0); }, [key, aspecto, visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const pinch = Gesture.Pinch()
    .onUpdate((e) => { escala.value = Math.max(ajustar * 0.8, Math.min(4, guardada.value * e.scale)); })
    .onEnd(() => { guardada.value = escala.value; });
  const pan = Gesture.Pan()
    .onUpdate((e) => { tx.value = gx.value + e.translationX; ty.value = gy.value + e.translationY; })
    .onEnd(() => { gx.value = tx.value; gy.value = ty.value; });
  const estilo = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: escala.value }] }));

  async function compartir() {
    try {
      let uri = vista.uri ?? '';
      if (vista.svg) { uri = `${FileSystem.cacheDirectory}plano-tecnico.svg`; await FileSystem.writeAsStringAsync(uri, vista.svg); }
      else if (/^https?:/.test(uri)) { uri = (await FileSystem.downloadAsync(uri, `${FileSystem.cacheDirectory}render-${Date.now()}.jpg`)).uri; }
      await Sharing.shareAsync(uri, { dialogTitle: vista.label, mimeType: vista.svg ? 'image/svg+xml' : 'image/jpeg' });
    } catch (e) { Alert.alert('No se pudo compartir', (e as Error).message); }
  }

  if (!vista) return null;
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onCerrar} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.respaldo }}>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 12, gap: 8, backgroundColor: c.vidrioFuerte }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>{vistas.length > 1 && <Segmentado envolver opciones={vistas.map((v) => [v.key, v.label] as [string, string])} valor={vista.key} onChange={setKey} />}</View>
            <Boton chico tipo="primario" icono="close" texto="Cerrar" onPress={onCerrar} />
          </View>
          <View style={{ flexDirection: 'row', gap: 6, paddingBottom: 8, flexWrap: 'wrap' }}>
            <Segmentado opciones={[['0', 'Ajustar'], ['1', '100%'], ['2', '200%'], ['3', '300%']]} valor={String(zoom) as '0'} onChange={(z) => fijar(Number(z))} />
            <Boton chico tipo="secundario" icono="share-variant-outline" texto="Compartir" onPress={compartir} />
          </View>
        </View>
        <GestureDetector gesture={Gesture.Simultaneous(pinch, pan)}>
          <View style={{ flex: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }} accessibilityHint="Pellizcá para acercar y arrastrá para moverte">
            <Animated.View style={[{ width: base.w, height: base.h, backgroundColor: vista.blanco ? c.papel : 'transparent' }, estilo]}>
              <Contenido v={vista} ancho={base.w} alto={base.h} onAspecto={setAspecto} />
            </Animated.View>
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}
