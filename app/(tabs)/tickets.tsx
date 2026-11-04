// app/(tabs)/tickets.tsx — foto de factura de proveedor (circuito de Compras) o ticket de gasto chico (Caja chica)
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase, llamarFuncion } from '@/lib/supabase';
import { tomarFoto, base64ABytes, type Foto } from '@/lib/imagen';
import { useAppStore } from '@/store';
import { colors, spacing, radius, fonts } from '@/lib/theme';
import { Feather } from '@expo/vector-icons';

type Tipo = 'factura' | 'gasto';
// Mismas categorías que Caja chica en la web
const CATEGORIAS: [string, string][] = [['insumos_menores', 'Insumos menores'], ['viaticos', 'Viáticos'], ['mantenimiento', 'Mantenimiento'], ['limpieza', 'Limpieza'], ['servicios', 'Servicios'], ['otro', 'Otro']];

interface OtOpcion { id: string; numero_ot: string; proyectos: { clientes: { nombre: string } | null } | null }

export default function TicketsScreen() {
  const empleado = useAppStore((s) => s.empleado);
  const [tipo, setTipo] = useState<Tipo>('factura');
  const [foto, setFoto] = useState<Foto | null>(null);
  const [otId, setOtId] = useState<string | null>(null);
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState('insumos_menores');
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando] = useState(false);

  const { data: ots } = useQuery({
    queryKey: ['ots-abiertas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ordenes_trabajo').select('id, numero_ot, proyectos(clientes(nombre))')
        .in('estado', ['pendiente', 'en_proceso']).eq('historica', false).order('numero_ot', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OtOpcion[];
    },
  });

  async function elegir(origen: 'camara' | 'galeria') {
    const f = await tomarFoto(origen);
    if (f) setFoto(f);
  }

  function limpiar() { setFoto(null); setOtId(null); setMonto(''); setDescripcion(''); }

  async function enviar() {
    if (!foto || !empleado) return;
    if (tipo === 'gasto' && (!Number(monto) || !descripcion.trim())) { Alert.alert('Completá el monto y la descripción'); return; }
    setEnviando(true);
    try {
      const hoy = new Date().toISOString().slice(0, 10);
      const path = `${tipo === 'factura' ? 'app' : 'caja-chica'}/${hoy}/${Date.now()}-${empleado.id.slice(0, 8)}.jpg`;
      const { error: eUp } = await supabase.storage.from('facturas').upload(path, base64ABytes(foto.base64), { contentType: 'image/jpeg' });
      if (eUp) throw eUp;

      if (tipo === 'factura') {
        // La IA lee la factura y queda en Compras (pendiente o confirmada sola si los números cierran)
        const r = await llamarFuncion('zebrano-facturas', JSON.stringify({ archivo_path: path }));
        const d = await r.json();
        if (!r.ok || !d.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
        if (otId) {
          const { error } = await supabase.rpc('imputar_factura_completa', { p_factura: d.factura_id, p_ot: otId });
          if (error) throw new Error(`La factura se cargó pero no se pudo imputar: ${error.message}`);
        }
        Alert.alert('Factura cargada', `${d.items ?? 0} renglones leídos${d.confirmada ? ', confirmada' : ', revisala en Compras'}. ${otId ? 'Imputada a la OT.' : 'Queda como stock.'}`);
      } else {
        const { error } = await supabase.from('caja_chica').insert({
          fecha: hoy, monto: Number(monto), categoria, descripcion: descripcion.trim(), creado_por: empleado.id,
          estado: 'pendiente', ot_id: otId, comprobante_path: path,
        });
        if (error) throw error;
        Alert.alert('Gasto registrado', 'Queda pendiente de aprobación en Caja chica.');
      }
      limpiar();
    } catch (e) {
      Alert.alert('No se pudo cargar', (e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  const input = { height: 48, backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: 1, borderRadius: 12, color: colors.text1, paddingHorizontal: 14, fontSize: 15, fontFamily: fonts.regular };
  const listo = !!foto && !enviando;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDeep }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 4, gap: 4 }}>
          <Segmento texto="Factura de proveedor" activo={tipo === 'factura'} onPress={() => setTipo('factura')} />
          <Segmento texto="Gasto chico" activo={tipo === 'gasto'} onPress={() => setTipo('gasto')} />
        </View>

        {foto ? (
          <View>
            <Image source={{ uri: foto.uri }} style={{ width: '100%', height: 200, borderRadius: radius.lg, backgroundColor: colors.bgCard }} resizeMode="cover" />
            <TouchableOpacity onPress={() => setFoto(null)} style={{ position: 'absolute', right: 10, bottom: 10, height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: 'rgba(14,20,27,0.85)', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="camera" size={16} color={colors.text1} />
              <Text style={{ color: colors.text1, fontSize: 13, fontFamily: fonts.medium }}>Sacar otra</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Grande icono="camera" texto="Sacar foto" onPress={() => elegir('camara')} />
            <Grande icono="image" texto="Galería" onPress={() => elegir('galeria')} />
          </View>
        )}
        <Text style={{ color: colors.text2, fontSize: 12, fontFamily: fonts.regular }}>
          {tipo === 'factura' ? 'La IA lee la factura y la carga en Compras, igual que desde la web.' : 'Queda en Caja chica con la foto, pendiente de aprobación.'}
        </Text>

        {tipo === 'gasto' && (
          <>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={etiqueta}>Monto</Text>
                <TextInput style={[input, { fontSize: 18, fontFamily: fonts.semibold }]} placeholder="$ 0" placeholderTextColor={colors.text3} keyboardType="numeric" value={monto} onChangeText={setMonto} />
              </View>
              <View style={{ flex: 1.3 }}>
                <Text style={etiqueta}>Descripción</Text>
                <TextInput style={input} placeholder="Flete, ferretería…" placeholderTextColor={colors.text3} value={descripcion} onChangeText={setDescripcion} />
              </View>
            </View>
            <View>
              <Text style={etiqueta}>Categoría</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {CATEGORIAS.map(([k, l]) => <Chip key={k} texto={l} activo={categoria === k} onPress={() => setCategoria(k)} />)}
              </View>
            </View>
          </>
        )}

        <View>
          <Text style={etiqueta}>¿A qué orden va?</Text>
          <View accessibilityRole="radiogroup" style={{ backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' }}>
            {ots?.map((o) => (
              <Opcion key={o.id} activo={otId === o.id} onPress={() => setOtId(o.id)} titulo={o.proyectos?.clientes?.nombre ?? o.numero_ot} sub={o.numero_ot} />
            ))}
            <Opcion activo={otId === null} onPress={() => setOtId(null)} titulo={tipo === 'factura' ? 'Stock (sin orden)' : 'Sin orden (gasto general)'} ultima />
          </View>
        </View>
      </ScrollView>

      <View style={{ padding: spacing.lg, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bgDeep }}>
        <TouchableOpacity onPress={enviar} disabled={!listo} style={{ height: 52, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: listo ? 1 : 0.4 }}>
          {enviando ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={{ color: colors.onPrimary, fontSize: 15, fontFamily: fonts.bold }}>{tipo === 'factura' ? 'Cargar factura' : 'Registrar gasto'}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const etiqueta = { color: colors.text2, fontSize: 12, fontFamily: fonts.medium, marginBottom: 6 } as const;

function Segmento({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity accessibilityRole="radio" accessibilityState={{ checked: activo }} onPress={onPress} style={{ flex: 1, height: 40, borderRadius: 10, backgroundColor: activo ? colors.border : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: activo ? colors.text1 : colors.text2, fontSize: 14, fontFamily: fonts.semibold }}>{texto}</Text>
    </TouchableOpacity>
  );
}

function Grande({ icono, texto, onPress }: { icono: 'camera' | 'image'; texto: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flex: 1, height: 140, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <Feather name={icono} size={28} color={colors.gold} />
      <Text style={{ color: colors.text1, fontSize: 14, fontFamily: fonts.semibold }}>{texto}</Text>
    </TouchableOpacity>
  );
}

function Opcion({ titulo, sub, activo, onPress, ultima }: { titulo: string; sub?: string; activo: boolean; onPress: () => void; ultima?: boolean }) {
  return (
    <TouchableOpacity accessibilityRole="radio" accessibilityState={{ checked: activo }} onPress={onPress} style={{ minHeight: 52, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: ultima ? 0 : 1, borderBottomColor: colors.border, backgroundColor: activo ? 'rgba(46,184,158,0.08)' : 'transparent' }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: activo ? 6 : 2, borderColor: activo ? colors.primary : colors.text3 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text1, fontSize: 14, fontFamily: fonts.semibold }}>{titulo}</Text>
        {sub && <Text style={{ color: colors.text2, fontSize: 12, fontFamily: fonts.regular }}>{sub}</Text>}
      </View>
    </TouchableOpacity>
  );
}

function Chip({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: activo ? colors.primary : colors.border, backgroundColor: activo ? 'rgba(46,184,158,0.12)' : 'transparent' }}>
      <Text style={{ color: activo ? colors.primary : colors.text2, fontSize: 13, fontFamily: fonts.medium }}>{texto}</Text>
    </TouchableOpacity>
  );
}
