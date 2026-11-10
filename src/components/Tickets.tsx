// src/components/Tickets.tsx — foto de factura de proveedor (circuito de Compras) o ticket de gasto chico (Caja chica)
import { useState } from 'react';
import { View, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { supabase, llamarFuncion } from '@/lib/supabase';
import { tomarFoto, base64ABytes, type Foto } from '@/lib/imagen';
import { useAppStore } from '@/store';
import { radius } from '@/lib/theme';
import { Segmentado, Boton, T, Vidrio, Campo, Chips, Selector } from '@/components/ui';

type Tipo = 'factura' | 'gasto';
// Mismas categorías que Caja chica en la web
const CATEGORIAS: [string, string][] = [['insumos_menores', 'Insumos menores'], ['viaticos', 'Viáticos'], ['mantenimiento', 'Mantenimiento'], ['limpieza', 'Limpieza'], ['servicios', 'Servicios'], ['otro', 'Otro']];

interface OtOpcion { id: string; numero_ot: string; proyectos: { clientes: { nombre: string } | null } | null }

export default function Tickets() {
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

  return (
    <View style={{ gap: 14 }}>
      <Segmentado opciones={[['factura', 'Factura de proveedor'], ['gasto', 'Gasto chico']]} valor={tipo} onChange={setTipo} />
      {foto ? (
        <View>
          <Image source={{ uri: foto.uri }} style={{ width: '100%', height: 220, borderRadius: radius.md }} contentFit="cover" accessibilityLabel="Foto del comprobante" />
          <View style={{ position: 'absolute', right: 10, bottom: 10 }}><Boton chico tipo="secundario" icono="camera-retake-outline" texto="Sacar otra" onPress={() => setFoto(null)} /></View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Boton tipo="secundario" icono="camera-outline" texto="Sacar foto" onPress={() => elegir('camara')} style={{ flex: 1, minHeight: 96 }} />
          <Boton tipo="secundario" icono="image-outline" texto="Galería" onPress={() => elegir('galeria')} style={{ flex: 1, minHeight: 96 }} />
        </View>
      )}
      <T v="chico">{tipo === 'factura' ? 'La IA lee la factura y la carga en Compras; los renglones con insumo suman al stock.' : 'Queda en Caja chica con la foto, pendiente de aprobación.'}</T>
      {tipo === 'gasto' && (
        <Vidrio style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Campo etiqueta="Monto" placeholder="$ 0" keyboardType="numeric" value={monto} onChangeText={setMonto} /></View>
            <View style={{ flex: 1.3 }}><Campo etiqueta="Descripción" placeholder="Flete, ferretería…" value={descripcion} onChangeText={setDescripcion} /></View>
          </View>
          <Chips opciones={CATEGORIAS} valor={categoria} onChange={setCategoria} />
        </Vidrio>
      )}
      <Selector etiqueta="¿A qué orden va?" valor={otId ?? ''} onChange={(v) => setOtId(v || null)}
        opciones={[{ valor: '', texto: tipo === 'factura' ? 'Stock (sin orden)' : 'Sin orden (gasto general)' }, ...(ots ?? []).map((o) => ({ valor: o.id, texto: `${o.numero_ot} · ${o.proyectos?.clientes?.nombre ?? ''}` }))]} />
      <Boton texto={tipo === 'factura' ? 'Cargar factura' : 'Registrar gasto'} icono="upload" onPress={enviar} cargando={enviando} disabled={!foto} />
    </View>
  );
}
