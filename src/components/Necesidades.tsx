// src/components/Necesidades.tsx — lo que necesita cada OT contra el stock (como StockCompras.jsx de la web).
// El usuario decide si compra o usa stock; "Usar" descuenta el stock (ot_consumir_necesidad).
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useTema } from '@/lib/theme';
import { Vidrio, T, Badge, Boton, Segmentado, Aviso, Cargando, Vacio, num, tonoEstado } from '@/components/ui';

interface Nec { id: string; ot_id: string; insumo_id: string | null; descripcion: string; cantidad: number; unidad: string | null; origen: string | null; decision: 'comprar' | 'stock' | null; estado: string; ordenes_trabajo?: { numero_ot: string } | null }

export default function Necesidades({ otId }: { otId?: string }) {
  const { c } = useTema();
  const [rows, setRows] = useState<Nec[] | null>(null);
  const [stock, setStock] = useState<Record<string, { disponible: number }>>({});
  const [error, setError] = useState('');
  const cargar = useCallback(async () => {
    let q = supabase.from('ot_necesidades').select('*, ordenes_trabajo(numero_ot)').order('origen').order('descripcion');
    q = otId ? q.eq('ot_id', otId) : q.neq('estado', 'consumido');
    const [a, b] = await Promise.all([q, supabase.from('stock_actual').select('insumo_id,disponible')]);
    if (a.error) setError(a.error.message);
    setRows((a.data ?? []) as Nec[]);
    setStock(Object.fromEntries((b.data ?? []).map((s) => [s.insumo_id, { disponible: Number(s.disponible) }])));
  }, [otId]);
  useEffect(() => { cargar(); }, [cargar]);

  const accion = async (fn: () => PromiseLike<{ error: { message: string } | null }>) => { setError(''); const { error: e } = await fn(); if (e) setError(e.message); cargar(); };
  // "comprar" pasa a pedido; "stock" queda pendiente hasta que se use.
  const decidir = (r: Nec, d: 'comprar' | 'stock') => accion(() => supabase.from('ot_necesidades').update({ decision: d, estado: d === 'comprar' ? 'pedido' : 'pendiente' }).eq('id', r.id));
  const usar = (r: Nec) => accion(() => supabase.rpc('ot_consumir_necesidad', { p_id: r.id }));

  if (!rows) return <Cargando />;
  if (!rows.length) return <Vacio icono="package-variant" titulo={otId ? 'Esta OT no tiene necesidades calculadas' : 'No hay necesidades pendientes'} texto="Se calculan solas cuando se aprueba una cotización." />;
  const faltan = rows.filter((r) => r.estado !== 'consumido' && (stock[r.insumo_id ?? '']?.disponible ?? 0) < Number(r.cantidad)).length;

  return (
    <View style={{ gap: 10 }}>
      {!!error && <Aviso texto={error} />}
      <T v="chico">{faltan ? `${faltan} renglón${faltan > 1 ? 'es' : ''} sin stock suficiente.` : 'Todo se puede cubrir con stock.'} Elegí si se compra o se usa stock; al usarlo se descuenta.</T>
      {rows.map((r) => {
        const disp = stock[r.insumo_id ?? '']?.disponible ?? 0, alcanza = disp >= Number(r.cantidad);
        return (
          <Vidrio key={r.id} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 14.5 }}>{r.descripcion}</T>
                <T v="chico">{!otId && r.ordenes_trabajo ? `${r.ordenes_trabajo.numero_ot} · ` : ''}necesita {num(r.cantidad)} {r.unidad ?? ''} · en stock <T v="chico" color={alcanza ? undefined : c.error}>{r.insumo_id ? num(disp) : '—'}</T></T>
              </View>
              <View style={{ gap: 4, alignItems: 'flex-end' }}>
                <Badge texto={r.estado === 'pedido' ? 'A comprar' : r.estado} tono={tonoEstado(r.estado)} />
                {!r.insumo_id && <Badge texto="sin insumo" tono="aviso" />}
              </View>
            </View>
            {r.estado !== 'consumido' && <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Segmentado opciones={[['comprar', 'Comprar'], ['stock', 'Usar stock']]} valor={(r.decision ?? '') as 'comprar' | 'stock'} onChange={(d) => decidir(r, d)} />
              </View>
              {r.insumo_id && <Boton chico tipo="secundario" texto="Usar" disabled={!alcanza} onPress={() => usar(r)} />}
            </View>}
          </Vidrio>
        );
      })}
    </View>
  );
}
