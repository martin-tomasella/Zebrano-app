// app/ot/[id].tsx — una OT: despiece por módulo, corte de placas (src/lib/corte.js, igual que la web) y materiales.
import { useState } from 'react';
import { View, Alert } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SvgXml } from 'react-native-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/lib/supabase';
import { optimizarPorMaterial, type Placa, type PiezaCorte } from '@/lib/corte';
import { useTema, radius } from '@/lib/theme';
import { Pantalla, Vidrio, T, Badge, Boton, Segmentado, Cargando, Vacio, num, fecha, tonoEstado } from '@/components/ui';
import Necesidades from '@/components/Necesidades';

interface Pieza { id: string; modulo_id: string; nombre_pieza: string; material_nombre: string; largo_mm: number; ancho_mm: number; espesor_mm: number; cantidad: number; cantos_largo?: number | null; cantos_ancho?: number | null; lectura_dudosa?: boolean; observacion?: string | null; origen: string }
interface Mod { id: string; nombre: string; material?: string | null; ml?: number | null }

const cantos = (p: Pieza) => [p.cantos_largo ? `${p.cantos_largo}L` : '', p.cantos_ancho ? `${p.cantos_ancho}A` : ''].filter(Boolean).join(' + ') || '—';
const pct = (x: number) => Math.round(x * 100) + '%';
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] as string));

// Las del taller si las cargó; si no, las del agente.
function piezasDeModulo(m: Mod, piezas: Pieza[]) {
  const todas = piezas.filter((p) => p.modulo_id === m.id);
  return todas.some((p) => p.origen === 'taller') ? todas.filter((p) => p.origen === 'taller') : todas;
}

// Dibujo de una placa (mismo SVG que la hoja de corte de la web): un color por módulo, ↻ = pieza girada.
const COLORES = ['#d9c3a5', '#c8d6c1', '#c9d3e3', '#e6c9c9', '#e3dcc0', '#d4c9e3'];
function svgPlaca(pl: Placa, largo: number, ancho: number) {
  const mods = [...new Set(pl.piezas.map((p) => p.modulo))];
  const rects = pl.piezas.map((p) => {
    const fs = Math.max(28, Math.min(70, Math.min(p.w, p.h) / 4));
    return `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${COLORES[mods.indexOf(p.modulo) % COLORES.length]}" stroke="#333" stroke-width="4"/>` +
      `<text x="${p.x + p.w / 2}" y="${p.y + p.h / 2}" font-size="${fs}" text-anchor="middle" font-family="Arial" fill="#222">${p.rot ? `${p.h}×${p.w} ↻` : `${p.w}×${p.h}`}</text>` +
      (p.h > fs * 3 && p.w > 300 ? `<text x="${p.x + p.w / 2}" y="${p.y + p.h / 2 + fs * 1.2}" font-size="${fs * 0.7}" text-anchor="middle" font-family="Arial" fill="#555">${esc(p.nombre)}</text>` : '');
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 ${largo + 20} ${ancho + 20}"><rect x="0" y="0" width="${largo}" height="${ancho}" fill="#f4f4f4" stroke="#000" stroke-width="6"/>${rects}</svg>`;
}

export default function OtDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTema();
  const [vista, setVista] = useState<'despiece' | 'corte' | 'materiales'>('despiece');
  const { data, isLoading } = useQuery({
    queryKey: ['ot', id],
    queryFn: async () => {
      const [o, m, p, cfg] = await Promise.all([
        supabase.from('ordenes_trabajo').select('id,numero_ot,estado,presupuesto,fecha_inicio,fecha_entrega_estimada,proyectos(nombre,notas_internas,clientes(nombre))').eq('id', id).single(),
        supabase.from('ot_modulos_resumen').select('id,nombre,material,ml').eq('orden_trabajo_id', id),
        supabase.from('ot_piezas').select('*').eq('orden_trabajo_id', id).order('orden'),
        supabase.from('config_placas').select('material,largo_mm,ancho_mm').eq('activo', true),
      ]);
      if (o.error) throw o.error;
      return { ot: o.data as unknown as { numero_ot: string; estado: string; presupuesto?: string; fecha_inicio?: string; fecha_entrega_estimada?: string; proyectos?: { nombre?: string; notas_internas?: string; clientes?: { nombre: string } } }, mods: (m.data ?? []) as Mod[], piezas: (p.data ?? []) as Pieza[], cfg: cfg.data ?? [] };
    },
  });

  if (isLoading || !data) return <Pantalla><Cargando /></Pantalla>;
  const { ot, mods, piezas, cfg } = data;
  const deCorte: PiezaCorte[] = mods.flatMap((m) => piezasDeModulo(m, piezas).map((p) => ({ nombre: p.nombre_pieza, modulo: m.nombre, largo_mm: p.largo_mm, ancho_mm: p.ancho_mm, cantidad: p.cantidad, material: p.material_nombre })));
  const grupos = vista === 'corte' ? optimizarPorMaterial(deCorte, cfg) : [];

  async function hojaDeCorte(compartir: boolean) {
    const html = `<!doctype html><meta charset="utf-8"><style>body{font:12px system-ui;margin:20px}h1{font-size:18px;margin:0 0 4px}h2{font-size:15px;margin:18px 0 4px}.p{page-break-inside:avoid;margin:8px 0 16px}.s{color:#555}svg{width:100%;height:auto}</style>
      <h1>Hoja de corte ${esc(ot.numero_ot)}</h1><p class="s">Sierra 4 mm. Medidas largo × ancho en mm; ↻ = pieza girada. Las piezas del mismo color son del mismo módulo.</p>` +
      grupos.map((g) => `<h2>${esc(g.material)} — ${g.placas.length} placa${g.placas.length > 1 ? 's' : ''} de ${g.largo}×${g.ancho}${g.veta ? ' (con veta, sin girar)' : ''} · aprovechamiento ${pct(g.uso)}</h2>` +
        g.placas.map((pl, i) => `<div class="p"><b>Placa ${i + 1}</b> · ${pct(pl.uso)} · ${pl.piezas.length} piezas${pl.retazos.length ? ` · retazos: ${pl.retazos.map((r) => `${Math.round(r.w)}×${Math.round(r.h)}`).join(', ')}` : ''}${svgPlaca(pl, g.largo, g.ancho)}</div>`).join('')).join('');
    try {
      if (!compartir) { await Print.printAsync({ html }); return; }
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Hoja de corte ${ot.numero_ot}`, UTI: 'com.adobe.pdf' });
    } catch (e) { Alert.alert('No se pudo armar la hoja', (e as Error).message); }
  }

  return (
    <Pantalla>
      <Stack.Screen options={{ title: ot.numero_ot }} />
      <Vidrio style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T v="h2">{ot.proyectos?.clientes?.nombre ?? 'Sin cliente'}</T>
          <Badge texto={ot.estado === 'pendiente' ? 'En cola' : ot.estado === 'en_proceso' ? 'En taller' : ot.estado} tono={tonoEstado(ot.estado)} />
        </View>
        <T v="chico">{ot.proyectos?.nombre ?? ''}{ot.presupuesto ? ` · presupuesto ${ot.presupuesto}` : ''}</T>
        <T v="chico">Inicio {fecha(ot.fecha_inicio)} · entrega estimada {fecha(ot.fecha_entrega_estimada)}</T>
        {!!ot.proyectos?.notas_internas && <T style={{ marginTop: 6 }}>{ot.proyectos.notas_internas}</T>}
      </Vidrio>
      <Segmentado opciones={[['despiece', 'Despiece'], ['corte', 'Corte'], ['materiales', 'Materiales']]} valor={vista} onChange={setVista} />

      {vista === 'despiece' && (mods.length === 0 ? <Vacio icono="view-grid-outline" titulo="Sin despiece" /> : mods.map((m) => {
        const ps = piezasDeModulo(m, piezas);
        const delAgente = ps.length > 0 && ps.every((p) => p.origen === 'agente');
        return (
          <Vidrio key={m.id} style={{ gap: 6 }}>
            <T v="h2">{m.nombre}</T>
            <T v="chico">{m.material ?? ''}{m.ml ? ` · ${num(m.ml)} ml` : ''}</T>
            {delAgente && <Badge texto="Despiece propuesto por el agente" tono="info" />}
            {ps.length === 0 ? <T v="chico">Sin piezas.</T> : ps.map((p) => (
              <View key={p.id} style={{ flexDirection: 'row', gap: 10, paddingTop: 6, borderTopWidth: 1, borderTopColor: c.linea }}>
                <T style={{ width: 28, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{p.cantidad}×</T>
                <View style={{ flex: 1 }}>
                  <T style={{ fontSize: 14 }}>{p.nombre_pieza}{p.lectura_dudosa ? '  ' : ''}{p.lectura_dudosa && <T v="chico" color={c.aviso}>verificar</T>}</T>
                  <T v="chico">{p.largo_mm} × {p.ancho_mm}{p.espesor_mm !== 18 ? ` × ${p.espesor_mm}` : ''} · canto {cantos(p)}</T>
                  {!!p.observacion && <T v="chico">{p.observacion}</T>}
                </View>
              </View>
            ))}
          </Vidrio>
        );
      }))}

      {vista === 'corte' && (deCorte.length === 0 ? <Vacio icono="content-cut" titulo="Esta orden no tiene piezas para cortar" /> : <>
        <T v="chico">Corte en guillotina, sierra de 4 mm. Las melaminas con veta no se giran. Los retazos de más de 30 × 30 cm quedan anotados.</T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Boton chico tipo="secundario" icono="printer-outline" texto="Imprimir hoja" onPress={() => hojaDeCorte(false)} style={{ flex: 1 }} />
          <Boton chico tipo="secundario" icono="share-variant-outline" texto="Compartir PDF" onPress={() => hojaDeCorte(true)} style={{ flex: 1 }} />
        </View>
        {grupos.map((g) => (
          <View key={g.material} style={{ gap: 10 }}>
            <Vidrio style={{ gap: 2 }}>
              <T v="h2">{g.material}</T>
              <T v="chico">{g.placas.length} placa{g.placas.length > 1 ? 's' : ''} de {g.largo} × {g.ancho} · aprovechamiento {pct(g.uso)}{g.veta ? ' · con veta' : ''}</T>
              {g.noEntran.length > 0 && <T v="chico" color={c.error}>{g.noEntran.length} pieza(s) más grandes que la placa</T>}
            </Vidrio>
            {g.placas.map((pl, i) => (
              <Vidrio key={i} style={{ gap: 6 }}>
                <View style={{ backgroundColor: c.papel, borderRadius: radius.sm, padding: 4 }} accessible accessibilityLabel={`Placa ${i + 1} de ${g.material}: ${pl.piezas.length} piezas`}>
                  <SvgXml xml={svgPlaca(pl, g.largo, g.ancho)} width="100%" height={undefined} style={{ aspectRatio: (g.largo + 20) / (g.ancho + 20) }} />
                </View>
                <T v="chico">Placa {i + 1} · {pct(pl.uso)} · {pl.piezas.length} piezas{pl.retazos.length ? ` · retazos: ${pl.retazos.map((r) => `${Math.round(r.w)}×${Math.round(r.h)}`).join(', ')}` : ''}</T>
              </Vidrio>
            ))}
          </View>
        ))}
      </>)}

      {vista === 'materiales' && <Necesidades otId={id} />}
    </Pantalla>
  );
}
