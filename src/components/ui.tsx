// src/components/ui.tsx — piezas del tema Glass v6: fondo con foto, vidrio, botones, badges, segmentado, pasos, campos.
import { useState, type ReactNode } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, ActivityIndicator, StyleSheet, Platform, RefreshControl, type ViewStyle, type StyleProp, type TextInputProps } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema, alfa, fonts, radius, spacing, FONDO_URL, type Tono } from '@/lib/theme';

export type IconoNombre = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
export const Icono = ({ n, size = 20, color }: { n: IconoNombre; size?: number; color?: string }) => {
  const { c } = useTema();
  return <MaterialCommunityIcons name={n} size={size} color={color ?? c.texto2} />;
};

// Foto de fondo a pantalla completa + velo a 160°; se cachea en disco.
export function Fondo() {
  const { c } = useTema();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.respaldo }]} pointerEvents="none">
      <Image source={FONDO_URL} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={300} />
      <LinearGradient colors={c.velo} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
    </View>
  );
}

// Superficie de vidrio. ponytail: en Android sin blur (fondo semitransparente): el blur por tarjeta dentro de listas rinde mal.
export function Vidrio({ children, style, fuerte, destacado }: { children: ReactNode; style?: StyleProp<ViewStyle>; fuerte?: boolean; destacado?: boolean }) {
  const { c, oscuro } = useTema();
  const base: ViewStyle = { borderRadius: radius.md, borderWidth: 1, borderColor: destacado ? 'rgba(255,255,255,0.25)' : c.vidrioBorde, overflow: 'hidden', padding: spacing.md,
    shadowColor: c.sombra, shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 0 };
  if (destacado) return (
    <View style={[base, style]}>
      <LinearGradient colors={[alfa(c.primario, 0.92), alfa(c.primario2, 0.82)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
  return (
    <View style={[base, { backgroundColor: Platform.OS === 'ios' ? 'transparent' : fuerte ? c.vidrioFuerte : c.vidrio }, style]}>
      {Platform.OS === 'ios' && <BlurView intensity={40} tint={oscuro ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, { backgroundColor: fuerte ? c.vidrioFuerte : c.vidrio }]} />}
      {children}
    </View>
  );
}

export function T({ children, v = 'cuerpo', color, style, lineas }: { children: ReactNode; v?: 'titulo' | 'h2' | 'cuerpo' | 'chico' | 'etiqueta' | 'num'; color?: string; style?: StyleProp<import('react-native').TextStyle>; lineas?: number }) {
  const { c } = useTema();
  const e = {
    titulo: { fontSize: 28, fontFamily: fonts.bold, color: c.texto, letterSpacing: -0.6 },
    h2: { fontSize: 17, fontFamily: fonts.semibold, color: c.texto },
    cuerpo: { fontSize: 14.5, fontFamily: fonts.regular, color: c.texto, lineHeight: 21 },
    chico: { fontSize: 12.5, fontFamily: fonts.regular, color: c.texto3 },
    etiqueta: { fontSize: 12, fontFamily: fonts.semibold, color: c.texto3, letterSpacing: 0.6, textTransform: 'uppercase' as const },
    num: { fontSize: 26, fontFamily: fonts.bold, color: c.texto, fontVariant: ['tabular-nums' as const] },
  }[v];
  return <Text numberOfLines={lineas} style={[e, color ? { color } : null, style]}>{children}</Text>;
}

export function Boton({ texto, onPress, tipo = 'primario', icono, disabled, cargando, chico, style }: { texto: string; onPress?: () => void; tipo?: 'primario' | 'secundario' | 'quiet' | 'peligro'; icono?: IconoNombre; disabled?: boolean; cargando?: boolean; chico?: boolean; style?: StyleProp<ViewStyle> }) {
  const { c } = useTema();
  const fg = tipo === 'primario' ? c.sobrePrimario : tipo === 'peligro' ? c.error : tipo === 'quiet' ? c.primario : c.texto;
  return (
    <Pressable onPress={onPress} disabled={disabled || cargando} accessibilityRole="button" accessibilityState={{ disabled: !!(disabled || cargando) }}
      style={({ pressed }) => [{ minHeight: chico ? 40 : 48, paddingHorizontal: chico ? 12 : 18, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: tipo === 'primario' ? c.primario : tipo === 'secundario' ? c.vidrio : 'transparent',
        borderWidth: tipo === 'secundario' ? 1 : 0, borderColor: c.vidrioBorde, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 }, style]}>
      {cargando ? <ActivityIndicator color={fg} /> : <>
        {icono && <MaterialCommunityIcons name={icono} size={chico ? 18 : 20} color={fg} />}
        <Text style={{ color: fg, fontFamily: fonts.semibold, fontSize: chico ? 13.5 : 15 }}>{texto}</Text>
      </>}
    </Pressable>
  );
}

export function Badge({ texto, tono = 'neutro' }: { texto: string; tono?: Tono }) {
  const { c } = useTema();
  const col = tono === 'neutro' ? c.texto2 : c[tono === 'primario' ? 'primario' : tono];
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, backgroundColor: alfa(col, 0.15) }}>
      <Text style={{ color: col, fontSize: 12, fontFamily: fonts.semibold }}>{texto}</Text>
    </View>
  );
}

// Tono de un estado (OT, proyecto, cotización, mensaje) para su badge
export const tonoEstado = (e?: string | null): Tono => ({
  pendiente: 'aviso', en_proceso: 'info', terminada: 'exito', aprobada: 'exito', aprobado: 'exito', entregado: 'exito', enviado: 'exito', consumido: 'exito', ganado: 'exito',
  pedido: 'info', en_fabricacion: 'info', propuesto: 'info', procesando: 'info', cotizado: 'aviso', borrador: 'aviso', iniciada: 'aviso',
  rechazado: 'neutro', descartada: 'neutro', cancelado: 'neutro', bloqueado: 'error', error: 'error', perdido: 'error',
} as Record<string, Tono>)[e ?? ''] ?? 'neutro';

export function Segmentado<K extends string>({ opciones, valor, onChange, envolver }: { opciones: [K, string][]; valor: K; onChange: (k: K) => void; envolver?: boolean }) {
  const { c } = useTema();
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: envolver ? 'wrap' : 'nowrap', gap: 4, padding: 4, borderRadius: radius.sm + 4, backgroundColor: c.vidrio, borderWidth: 1, borderColor: c.vidrioBorde }}>
      {opciones.map(([k, l]) => {
        const activo = k === valor;
        return (
          <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="radio" accessibilityState={{ checked: activo }}
            style={{ flexGrow: 1, minHeight: 38, paddingHorizontal: 10, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: activo ? c.vidrioFuerte : 'transparent',
              shadowColor: c.sombra, shadowOpacity: activo ? 0.6 : 0, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
            <Text style={{ color: activo ? c.texto : c.texto2, fontFamily: activo ? fonts.semibold : fonts.medium, fontSize: 13.5 }}>{l}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Stepper de pasos: los hechos con tilde, el actual resaltado; se puede volver a uno anterior.
export function Pasos({ pasos, actual, onIr, bloqueado }: { pasos: string[]; actual: number; onIr: (i: number) => void; bloqueado?: boolean }) {
  const { c } = useTema();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, padding: 4, borderRadius: radius.sm + 4, backgroundColor: c.vidrio, borderWidth: 1, borderColor: c.vidrioBorde }}>
      {pasos.map((p, i) => {
        const activo = i === actual, hecho = i < actual;
        return (
          <Pressable key={p} disabled={i > actual || bloqueado} onPress={() => onIr(i)} accessibilityRole="button" accessibilityState={{ selected: activo }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 38, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: activo ? c.vidrioFuerte : 'transparent' }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: activo || hecho ? c.primario : c.hundido }}>
              {hecho ? <MaterialCommunityIcons name="check" size={13} color={c.sobrePrimario} /> : <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: activo ? c.sobrePrimario : c.texto3 }}>{i + 1}</Text>}
            </View>
            <Text style={{ color: activo ? c.texto : c.texto2, fontFamily: activo ? fonts.semibold : fonts.medium, fontSize: 13 }}>{p}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Campo({ etiqueta, style, ...p }: TextInputProps & { etiqueta?: string }) {
  const { c } = useTema();
  return (
    <View style={{ gap: 6, flexGrow: 1 }}>
      {etiqueta && <Text style={{ color: c.texto2, fontSize: 12.5, fontFamily: fonts.medium }}>{etiqueta}</Text>}
      <TextInput placeholderTextColor={c.texto3} accessibilityLabel={etiqueta ?? p.placeholder} {...p}
        style={[{ minHeight: 46, borderRadius: radius.sm, borderWidth: 1, borderColor: c.linea, backgroundColor: c.hundido, color: c.texto, paddingHorizontal: 12, paddingVertical: p.multiline ? 10 : 0, fontSize: 15, fontFamily: fonts.regular, textAlignVertical: p.multiline ? 'top' : 'center' }, style]} />
    </View>
  );
}

// Reemplazo del <select>: un campo que abre una lista en un panel de vidrio fuerte.
export function Selector({ etiqueta, valor, opciones, onChange, placeholder = 'Elegí…', disabled }: { etiqueta?: string; valor: string; opciones: { valor: string; texto: string; sub?: string }[]; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  const { c } = useTema();
  const insets = useSafeAreaInsets();
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState('');
  const sel = opciones.find((o) => o.valor === valor);
  const vis = q ? opciones.filter((o) => `${o.texto} ${o.sub ?? ''}`.toLowerCase().includes(q.toLowerCase())) : opciones;
  return (
    <View style={{ gap: 6, flexGrow: 1 }}>
      {etiqueta && <Text style={{ color: c.texto2, fontSize: 12.5, fontFamily: fonts.medium }}>{etiqueta}</Text>}
      <Pressable disabled={disabled} onPress={() => setAbierto(true)} accessibilityRole="button" accessibilityLabel={etiqueta}
        style={{ minHeight: 46, borderRadius: radius.sm, borderWidth: 1, borderColor: c.linea, backgroundColor: c.hundido, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: disabled ? 0.5 : 1 }}>
        <Text numberOfLines={1} style={{ flex: 1, color: sel ? c.texto : c.texto3, fontSize: 15, fontFamily: fonts.regular }}>{sel?.texto ?? placeholder}</Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color={c.texto3} />
      </Pressable>
      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }} onPress={() => setAbierto(false)}>
          <Pressable style={{ maxHeight: '75%', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, backgroundColor: c.vidrioFuerte, paddingBottom: insets.bottom + 8 }} onPress={() => {}}>
            <View style={{ padding: spacing.md, gap: 10 }}>
              <T v="h2">{etiqueta ?? placeholder}</T>
              {opciones.length > 8 && <Campo placeholder="Buscar…" value={q} onChangeText={setQ} autoFocus />}
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {vis.map((o) => (
                <Pressable key={o.valor} onPress={() => { onChange(o.valor); setAbierto(false); setQ(''); }} accessibilityRole="radio" accessibilityState={{ checked: o.valor === valor }}
                  style={{ minHeight: 52, paddingHorizontal: spacing.md, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: c.linea }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.texto, fontSize: 15, fontFamily: o.valor === valor ? fonts.semibold : fonts.regular }}>{o.texto}</Text>
                    {o.sub && <Text style={{ color: c.texto3, fontSize: 12.5, fontFamily: fonts.regular }}>{o.sub}</Text>}
                  </View>
                  {o.valor === valor && <MaterialCommunityIcons name="check" size={20} color={c.primario} />}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function Chips<K extends string>({ opciones, valor, onChange }: { opciones: [K, string][]; valor: K | null; onChange: (k: K) => void }) {
  const { c } = useTema();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {opciones.map(([k, l]) => {
        const a = k === valor;
        return (
          <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="radio" accessibilityState={{ checked: a }}
            style={{ minHeight: 36, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 99, borderWidth: 1, borderColor: a ? c.primario : c.vidrioBorde, backgroundColor: a ? alfa(c.primario, 0.15) : c.vidrioSutil }}>
            <Text style={{ color: a ? c.primario : c.texto2, fontFamily: a ? fonts.semibold : fonts.medium, fontSize: 13 }}>{l}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// −/+ para números chicos (personas, puertas, cajones…)
export function Contador({ valor, onChange, min = 0, max = 99, etiqueta }: { valor: number; onChange: (n: number) => void; min?: number; max?: number; etiqueta: string }) {
  const { c } = useTema();
  const b = (d: number, n: IconoNombre) => (
    <Pressable onPress={() => onChange(Math.max(min, Math.min(max, valor + d)))} accessibilityLabel={`${d > 0 ? 'Más' : 'Menos'} ${etiqueta}`} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name={n} size={20} color={c.texto} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: c.linea, backgroundColor: c.hundido }}>
      {b(-1, 'minus')}<Text accessibilityLabel={`${etiqueta}: ${valor}`} style={{ minWidth: 26, textAlign: 'center', color: c.texto, fontFamily: fonts.semibold, fontSize: 15 }}>{valor}</Text>{b(1, 'plus')}
    </View>
  );
}

// Pantalla con scroll y padding; el fondo lo pone el layout raíz.
export function Pantalla({ children, titulo, sub, accion, onRefresh, refrescando, sinScroll, pie }: { children: ReactNode; titulo?: string; sub?: string; accion?: ReactNode; onRefresh?: () => void; refrescando?: boolean; sinScroll?: boolean; pie?: ReactNode }) {
  const { c } = useTema();
  const insets = useSafeAreaInsets();
  const cab = titulo ? (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 4 }}>
      <View style={{ flex: 1 }}>
        {sub && <T v="chico" style={{ textTransform: 'capitalize' }}>{sub}</T>}
        <T v="titulo">{titulo}</T>
      </View>
      {accion}
    </View>
  ) : null;
  const pad = { padding: spacing.lg, paddingTop: insets.top + spacing.md, gap: 14, paddingBottom: 40 };
  return (
    <View style={{ flex: 1 }}>
      {sinScroll ? <View style={[pad, { flex: 1 }]}>{cab}{children}</View> : (
        <ScrollView contentContainerStyle={pad} keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refrescando} onRefresh={onRefresh} tintColor={c.primario} /> : undefined}>
          {cab}{children}
        </ScrollView>
      )}
      {pie}
    </View>
  );
}

export function Kpi({ etiqueta, valor, detalle, destacado, icono }: { etiqueta: string; valor: string; detalle?: string; destacado?: boolean; icono?: IconoNombre }) {
  const { c } = useTema();
  const col = destacado ? '#ffffff' : undefined;
  return (
    <Vidrio destacado={destacado} style={{ flexGrow: 1, flexBasis: '45%', gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icono && <MaterialCommunityIcons name={icono} size={16} color={col ?? c.texto3} />}
        <T v="chico" color={col}>{etiqueta}</T>
      </View>
      <T v="num" color={col}>{valor}</T>
      {detalle && <T v="chico" color={destacado ? 'rgba(255,255,255,0.85)' : undefined}>{detalle}</T>}
    </Vidrio>
  );
}

export function Aviso({ texto, tono = 'error' }: { texto: string; tono?: Tono }) {
  const { c } = useTema();
  const col = tono === 'neutro' ? c.texto2 : c[tono === 'primario' ? 'primario' : tono];
  return (
    <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 12, borderRadius: radius.sm, backgroundColor: alfa(col, 0.14) }}>
      <MaterialCommunityIcons name={tono === 'error' ? 'alert-circle-outline' : tono === 'aviso' ? 'alert-outline' : 'information-outline'} size={18} color={col} />
      <Text style={{ flex: 1, color: col, fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 19 }}>{texto}</Text>
    </View>
  );
}

export function Cargando({ texto }: { texto?: string }) {
  const { c } = useTema();
  return (
    <View style={{ padding: 24, alignItems: 'center', gap: 10 }} accessibilityLiveRegion="polite">
      <ActivityIndicator color={c.primario} />
      {texto && <T v="chico" style={{ textAlign: 'center' }}>{texto}</T>}
    </View>
  );
}

export function Vacio({ icono, titulo, texto }: { icono: IconoNombre; titulo: string; texto?: string }) {
  const { c } = useTema();
  return (
    <Vidrio style={{ alignItems: 'center', gap: 6, paddingVertical: 28 }}>
      <MaterialCommunityIcons name={icono} size={30} color={c.texto3} />
      <T v="h2" style={{ textAlign: 'center' }}>{titulo}</T>
      {texto && <T v="chico" style={{ textAlign: 'center' }}>{texto}</T>}
    </Vidrio>
  );
}

// Fila tocable dentro de una lista de vidrio
export function Fila({ titulo, sub, derecha, onPress, icono, primera }: { titulo: string; sub?: string; derecha?: ReactNode; onPress?: () => void; icono?: IconoNombre; primera?: boolean }) {
  const { c } = useTema();
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({ minHeight: 56, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: primera ? 0 : 1, borderTopColor: c.linea, opacity: pressed ? 0.7 : 1 })}>
      {icono && <MaterialCommunityIcons name={icono} size={22} color={c.texto2} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: c.texto, fontSize: 15, fontFamily: fonts.semibold }}>{titulo}</Text>
        {sub && <Text numberOfLines={2} style={{ color: c.texto3, fontSize: 12.5, fontFamily: fonts.regular, marginTop: 2 }}>{sub}</Text>}
      </View>
      {derecha}
      {onPress && <MaterialCommunityIcons name="chevron-right" size={20} color={c.texto3} />}
    </Pressable>
  );
}

// Formatos
export const ars = (v?: number | string | null) => v == null || v === '' ? '—' : '$' + Math.round(Number(v)).toLocaleString('es-AR');
export const usd = (v?: number | string | null) => v == null ? '—' : 'USD ' + Math.round(Number(v)).toLocaleString('es-AR');
export const num = (v?: number | string | null, d = 2) => v == null ? '—' : Number(v).toLocaleString('es-AR', { maximumFractionDigits: d });
export const fecha = (d?: string | null) => d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-AR') : '—';
