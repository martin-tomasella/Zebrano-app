// app/(tabs)/tickets.tsx — foto de factura de proveedor (circuito de Compras) o ticket de gasto chico (Caja chica)
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase, llamarFuncion } from '@/lib/supabase';
import { tomarFoto, base64ABytes, type Foto } from '@/lib/imagen';
import { useAppStore } from '@/store';
import { colors, spacing, radius } from '@/lib/theme';

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

  const input = { backgroundColor: colors.bgCard, borderColor: colors.borderMid, borderWidth: 1, borderRadius: radius.md, color: colors.text1, padding: spacing.md };
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgDeep }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Opcion texto="Factura de proveedor" activo={tipo === 'factura'} onPress={() => setTipo('factura')} />
        <Opcion texto="Ticket de gasto" activo={tipo === 'gasto'} onPress={() => setTipo('gasto')} />
      </View>
      <Text style={{ color: colors.text3, fontSize: 12 }}>
        {tipo === 'factura' ? 'La IA lee la factura y la carga en Compras, igual que desde la web.' : 'Gasto chico: queda en Caja chica con la foto, pendiente de aprobación.'}
      </Text>

      {foto ? (
        <TouchableOpacity onPress={() => setFoto(null)}>
          <Image source={{ uri: foto.uri }} style={{ width: '100%', height: 260, borderRadius: radius.md }} resizeMode="contain" />
          <Text style={{ color: colors.text3, fontSize: 12, textAlign: 'center', marginTop: 4 }}>Tocá para sacar otra</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Opcion texto="📷 Sacar foto" onPress={() => elegir('camara')} />
          <Opcion texto="🖼 Galería" onPress={() => elegir('galeria')} />
        </View>
      )}

      {tipo === 'gasto' && (
        <>
          <TextInput style={input} placeholder="Monto (ARS)" placeholderTextColor={colors.text3} keyboardType="numeric" value={monto} onChangeText={setMonto} />
          <TextInput style={input} placeholder="¿En qué se gastó?" placeholderTextColor={colors.text3} value={descripcion} onChangeText={setDescripcion} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {CATEGORIAS.map(([k, l]) => <Chip key={k} texto={l} activo={categoria === k} onPress={() => setCategoria(k)} />)}
          </View>
        </>
      )}

      <Text style={{ color: colors.text2, fontWeight: '700' }}>¿A qué orden va?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        <Chip texto={tipo === 'factura' ? 'Stock (sin OT)' : 'Sin OT'} activo={otId === null} onPress={() => setOtId(null)} />
        {ots?.map((o) => <Chip key={o.id} texto={`${o.numero_ot} · ${o.proyectos?.clientes?.nombre ?? ''}`} activo={otId === o.id} onPress={() => setOtId(o.id)} />)}
      </View>

      <TouchableOpacity
        onPress={enviar}
        disabled={!foto || enviando}
        style={{ backgroundColor: colors.gold, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', opacity: !foto || enviando ? 0.4 : 1 }}
      >
        {enviando ? <ActivityIndicator color={colors.bgDeep} /> : <Text style={{ color: colors.bgDeep, fontWeight: '700' }}>{tipo === 'factura' ? 'Cargar factura' : 'Registrar gasto'}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

function Opcion({ texto, activo, onPress }: { texto: string; activo?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flex: 1, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: activo ? colors.gold : colors.borderMid, backgroundColor: activo ? `${colors.gold}20` : colors.bgCard, alignItems: 'center' }}>
      <Text style={{ color: activo ? colors.gold : colors.text1, fontWeight: '600' }}>{texto}</Text>
    </TouchableOpacity>
  );
}

function Chip({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: activo ? colors.gold : colors.borderMid, backgroundColor: activo ? `${colors.gold}20` : 'transparent' }}>
      <Text style={{ color: activo ? colors.gold : colors.text2, fontSize: 12 }}>{texto}</Text>
    </TouchableOpacity>
  );
}
