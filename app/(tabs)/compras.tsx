// app/(tabs)/compras.tsx — tickets con foto (como la v7), necesidades de las OT y stock con conteo físico.
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Pantalla, Segmentado, Vidrio, T, Campo, Boton, Cargando, Vacio, Aviso, num } from '@/components/ui';
import Tickets from '@/components/Tickets';
import Necesidades from '@/components/Necesidades';

export default function Compras() {
  const [vista, setVista] = useState<'tickets' | 'necesidades' | 'stock'>('tickets');
  return (
    <Pantalla titulo="Compras">
      <Segmentado opciones={[['tickets', 'Tickets'], ['necesidades', 'Necesidades'], ['stock', 'Stock']]} valor={vista} onChange={setVista} />
      {vista === 'tickets' && <Tickets />}
      {vista === 'necesidades' && <Necesidades />}
      {vista === 'stock' && <Stock />}
    </Pantalla>
  );
}

interface Fila { insumo_id: string; nombre: string; categoria: string | null; unidad: string | null; disponible: number; reservado: number }

// Entra con las facturas (desde el 10/11/2026), sale cuando una OT usa stock y se corrige con el conteo físico.
function Stock() {
  const [rows, setRows] = useState<Fila[] | null>(null);
  const [q, setQ] = useState('');
  const [conteo, setConteo] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const cargar = () => supabase.from('stock_actual').select('*').order('categoria').order('nombre').then(({ data, error: e }) => { if (e) setError(e.message); setRows((data ?? []) as Fila[]); });
  useEffect(() => { cargar(); }, []);

  async function ajustar(r: Fila) {
    const txt = conteo[r.insumo_id];
    const real = Number(String(txt ?? '').replace(',', '.'));
    if (txt == null || txt === '' || Number.isNaN(real)) return;
    const dif = real - Number(r.disponible);
    if (dif) {
      const { error: e } = await supabase.from('stock_movimientos').insert({ insumo_id: r.insumo_id, cantidad: dif, tipo: 'ajuste', notas: `Conteo: ${real}` });
      if (e) { setError(e.message); return; }
    }
    setConteo((x) => ({ ...x, [r.insumo_id]: '' })); cargar();
  }

  if (!rows) return <Cargando />;
  const vis = rows.filter((r) => !q || r.nombre.toLowerCase().includes(q.toLowerCase()));
  return (
    <View style={{ gap: 10 }}>
      <T v="chico">Entra con las facturas de compra, sale cuando una OT usa stock y se corrige con el conteo físico: cargá lo que hay y se registra la diferencia.</T>
      {!!error && <Aviso texto={error} />}
      <Campo placeholder="Buscar insumo…" value={q} onChangeText={setQ} />
      {vis.length === 0 ? <Vacio icono="package-variant-closed" titulo="Sin insumos con ese nombre" /> : vis.slice(0, 200).map((r) => (
        <Vidrio key={r.insumo_id} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <T style={{ fontSize: 14.5 }}>{r.nombre}</T>
              <T v="chico">{r.categoria ?? '—'}{Number(r.reservado) ? ` · reservado ${num(r.reservado)}` : ''}</T>
            </View>
            <T v="h2">{num(r.disponible)} <T v="chico">{r.unidad ?? ''}</T></T>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={{ flex: 1 }}><Campo placeholder="Conteo físico" keyboardType="decimal-pad" value={conteo[r.insumo_id] ?? ''} onChangeText={(t) => setConteo((x) => ({ ...x, [r.insumo_id]: t }))} onSubmitEditing={() => ajustar(r)} accessibilityLabel={`Conteo de ${r.nombre}`} /></View>
            <Boton chico tipo="secundario" texto="Guardar" disabled={!conteo[r.insumo_id]} onPress={() => ajustar(r)} />
          </View>
        </Vidrio>
      ))}
      {vis.length > 200 && <T v="chico">Se muestran 200 de {vis.length}; buscá para ver el resto.</T>}
    </View>
  );
}
