// app/nuevo-trabajo.tsx — "Nuevo trabajo" como en la web (src/pages/NuevoTrabajo.jsx):
// para quién → diseño editable → render → cotización → OT en cola. Cada paso es una acción de zebrano-cotizador v66.
import { useEffect, useState } from 'react';
import { View, Pressable, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { SvgXml } from 'react-native-svg';
import { supabase, cotizador } from '@/lib/supabase';
import { tomarFoto, elegirFotos, girar, type Foto } from '@/lib/imagen';
import VistaPrevia, { useVistaPrevia, useAlCostado } from '@/components/VistaPrevia';
import { useDictado } from '@/lib/voz';
import { useTema, radius } from '@/lib/theme';
import { Pantalla, Vidrio, T, Boton, Segmentado, Pasos, Campo, Selector, Chips, Contador, Aviso, Cargando, Icono, ars, usd } from '@/components/ui';

const PASOS = ['Para quién', 'Diseño', 'Render', 'Cotización', 'OT'];
const FAMILIAS = ['bajo', 'alacena', 'columna', 'placard', 'cajonera', 'abierto'] as const;
const ETAPAS_MO = ['corte', 'canteado', 'armado', 'terminacion', 'instalacion'] as const;
// Cotizador v68: el laqueado y el lustrado se cotizan como material por receta (terminacion_receta × precio del insumo).
const TERMINACIONES = [{ valor: 'sin definir', texto: 'Sin definir (preguntar)' }, { valor: 'melamina', texto: 'Melamina (sin pintar)' }, { valor: 'laqueado sintetico', texto: 'Laqueado sintético' }, { valor: 'laqueado al agua', texto: 'Laqueado al agua' }, { valor: 'lustrado', texto: 'Lustrado poliuretano' }];
const MAX_FOTOS = 6;

interface Modulo { nombre: string; familia: string; ancho_mm: number; alto_mm: number; prof_mm: number; puertas: number; cajones: number; estantes: number; frentes: string; patas: number; zocalo_mm: number; terminaciones: number; cantidad: number; material: string }
interface ManoObra { etapa: string; horas_estimadas: number; operarios: number }
interface Resumen { precioSugerido?: number; precioUsd?: number; tcUsd?: number; costoTotal?: number; margen?: number; documento_url?: string; version?: number }
interface Persona { id: string; nombre: string; apellido?: string | null; telefono?: string | null; email?: string | null; tipo_trabajo?: string | null; descripcion_proyecto?: string | null }

const nuevoModulo = (mat?: string): Modulo => ({ nombre: 'Módulo', familia: 'bajo', ancho_mm: 600, alto_mm: 720, prof_mm: 550, puertas: 2, cajones: 0, estantes: 1, frentes: 'superpuestos', patas: 0, zocalo_mm: 0, terminaciones: 0, cantidad: 1, material: mat || 'Melamina blanco mate 18mm' });
const entero = (t: string) => Number(t.replace(/[^\d]/g, '')) || 0;
const nombreDe = (p?: Persona) => p ? [p.nombre, p.apellido].filter(Boolean).join(' ') : '';

export default function NuevoTrabajo() {
  const params = useLocalSearchParams<{ cliente?: string; obra?: string; prospecto?: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { c } = useTema();
  const [paso, setPaso] = useState(0);
  const [ocupado, setOcupado] = useState('');
  const [error, setError] = useState('');
  const [sid, setSid] = useState<string | null>(null);
  // Paso 1
  const [para, setPara] = useState<'cliente' | 'prospecto' | 'nuevo'>(params.prospecto ? 'prospecto' : 'cliente');
  const [clienteId, setClienteId] = useState(params.cliente ?? '');
  const [obraId, setObraId] = useState(params.obra ?? '');
  const [prospectoId, setProspectoId] = useState(params.prospecto ?? '');
  const [texto, setTexto] = useState('');
  const [fotos, setFotos] = useState<Foto[]>([]);
  // Paso 2+
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [manoObra, setManoObra] = useState<ManoObra[]>([]);
  const [estilo, setEstilo] = useState('');
  const [terminacion, setTerminacion] = useState('sin definir');
  const [m2Term, setM2Term] = useState('');
  const [tipo, setTipo] = useState('');
  const [preguntas, setPreguntas] = useState<string[]>([]);
  const [svg, setSvg] = useState<string | null>(null);
  const [render, setRender] = useState<string | null>(null);
  const [cambio, setCambio] = useState('');
  const [cot, setCot] = useState<{ respuesta: string; resumen?: Resumen } | null>(null);
  const [ot, setOt] = useState<{ respuesta?: string } | null>(null);
  const dictado = useDictado((t) => setTexto((x) => (x ? `${x} ${t}` : t)));

  const { data: clientes } = useQuery({ queryKey: ['clientes-activos'], queryFn: async () => (await supabase.from('clientes').select('id,nombre,telefono,email').eq('activo', true).order('nombre')).data as Persona[] ?? [] });
  const { data: prospectos } = useQuery({ queryKey: ['prospectos-abiertos'], queryFn: async () => (await supabase.from('prospectos').select('id,nombre,apellido,telefono,email,tipo_trabajo,descripcion_proyecto').eq('activo', true).eq('convertido_a_cliente', false).order('created_at', { ascending: false }).limit(300)).data as Persona[] ?? [] });
  const { data: obras } = useQuery({ queryKey: ['obras', clienteId], enabled: para === 'cliente' && !!clienteId, queryFn: async () => (await supabase.from('obras').select('id,nombre,direccion').eq('cliente_id', clienteId).order('created_at', { ascending: false })).data ?? [] });

  // El prospecto ya trae lo que pidió: arranca el texto con eso
  useEffect(() => {
    const p = prospectos?.find((x) => x.id === prospectoId);
    if (para === 'prospecto' && p && !texto) setTexto([p.tipo_trabajo, p.descripcion_proyecto].filter(Boolean).join('. '));
  }, [prospectoId, prospectos]); // eslint-disable-line react-hooks/exhaustive-deps

  async function correr(nombre: string, fn: () => Promise<void>) {
    setOcupado(nombre); setError('');
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setOcupado(''); }
  }

  const leer = () => correr('Leyendo el plano y armando los módulos…', async () => {
    if (!texto.trim() && !fotos.length) throw new Error('Escribí las medidas o agregá un plano, foto o bosquejo.');
    const d = await cotizador<{ sesion_id: string; modulos: Modulo[]; mano_obra?: ManoObra[]; estilo?: string; tipo_trabajo?: string; preguntas?: string[]; svg_tecnico?: string | null; terminacion?: string }>({
      accion: 'leer', origen: 'app', mensaje: texto, imagenes_base64: fotos.map((f) => f.base64),
      ...(para === 'cliente' ? { cliente_id: clienteId || null, obra_id: obraId || null } : {}),
      ...(para === 'prospecto' ? { prospecto_id: prospectoId || null } : {}),
    });
    setSid(d.sesion_id);
    const p = para === 'cliente' ? clientes?.find((x) => x.id === clienteId) : para === 'prospecto' ? prospectos?.find((x) => x.id === prospectoId) : undefined;
    if (p) await supabase.from('cotizacion_sesiones').update({ cliente_nombre: nombreDe(p), cliente_telefono: p.telefono || null, cliente_email: p.email || null }).eq('id', d.sesion_id);
    setModulos(d.modulos); setManoObra(d.mano_obra ?? []); setEstilo(d.estilo ?? ''); setTipo(d.tipo_trabajo ?? ''); setTerminacion(d.terminacion || 'sin definir'); setPreguntas(d.preguntas ?? []); setSvg(d.svg_tecnico ?? null);
    setPaso(1);
  });

  const guardar = async () => {
    const d = await cotizador<{ modulos: Modulo[]; svg_tecnico: string | null }>({ accion: 'guardar_diseno', sesion_id: sid, modulos, mano_obra: manoObra, estilo, tipo_trabajo: tipo, terminacion, laqueado_m2: Number(m2Term.replace(',', '.')) || 0 });
    setModulos(d.modulos); setSvg(d.svg_tecnico);
  };
  const pedirRender = (conCambio: boolean) => correr('Generando el render. Puede tardar hasta un minuto…', async () => {
    if (!conCambio) await guardar();
    setPaso(2);
    try {
      const d = await cotizador<{ render_url: string }>({ accion: 'render', sesion_id: sid, cambio: conCambio ? cambio : undefined });
      setRender(d.render_url); setCambio('');
    } catch (e) { setError(`${(e as Error).message} Podés cotizar igual.`); }
  });
  const cotizar = (guardarAntes: boolean) => correr('Calculando materiales, herrajes y mano de obra…', async () => {
    if (guardarAntes) await guardar();
    setCot(await cotizador<{ respuesta: string; resumen?: Resumen }>({ accion: 'cotizar', sesion_id: sid, mano_obra: manoObra, terminacion, laqueado_m2: Number(m2Term.replace(',', '.')) || 0 }));
    setPaso(3);
  });
  const aprobar = () => Alert.alert('¿Aprobar la cotización?', 'Se crean la obra, el trabajo y la orden de trabajo. La OT queda en la cola de fábrica, sin fecha de inicio.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Aprobar', onPress: () => correr('Creando obra, trabajo y orden de trabajo…', async () => {
      setOt(await cotizador<{ respuesta?: string }>({ aprobar_cotizacion: true, sesion_id: sid }));
      setPaso(4); qc.invalidateQueries();
    }) },
  ]);

  const setMod = <K extends keyof Modulo>(i: number, k: K, v: Modulo[K]) => setModulos((ms) => ms.map((m, j) => (j === i ? { ...m, [k]: v } : m)));
  const setMo = <K extends keyof ManoObra>(i: number, k: K, v: ManoObra[K]) => setManoObra((ms) => ms.map((m, j) => (j === i ? { ...m, [k]: v } : m)));
  const horasPersona = manoObra.reduce((a, m) => a + (Number(m.horas_estimadas) || 0) * (Number(m.operarios) || 1), 0);
  const resumen = cot?.resumen;
  const listo1 = para === 'nuevo' || (para === 'cliente' ? !!clienteId : !!prospectoId);
  // Vista previa arriba de los pasos (o al costado en tablet horizontal): render, plano técnico y lo que se subió.
  const alCostado = useAlCostado();
  const prev = useVistaPrevia(sid, `${paso}|${render}|${svg?.length}|${resumen?.version}`, fotos.map((f) => f.uri));
  const panel = <VistaPrevia vistas={prev.vistas} precio={prev.precio} precioUsd={prev.precioUsd} alto={alCostado ? 420 : 220} />;

  const pasos = (
    <Pantalla>
      {!alCostado && panel}
      <Pasos pasos={PASOS} actual={paso} onIr={setPaso} bloqueado={!!ot || !!ocupado} />
      {!!error && <Aviso texto={error} />}
      {!!ocupado && <Vidrio><Cargando texto={ocupado} /></Vidrio>}

      {paso === 0 && <>
        <Vidrio style={{ gap: 12 }}>
          <T v="h2">¿Para quién es?</T>
          <Segmentado opciones={[['cliente', 'Cliente'], ['prospecto', 'Prospecto'], ['nuevo', 'Cliente nuevo']]} valor={para} onChange={setPara} />
          {para === 'cliente' && <>
            <Selector etiqueta="Cliente" valor={clienteId} onChange={(v) => { setClienteId(v); setObraId(''); }} placeholder="Elegí un cliente…"
              opciones={(clientes ?? []).map((x) => ({ valor: x.id, texto: x.nombre, sub: x.telefono ?? undefined }))} />
            <Selector etiqueta="Obra" valor={obraId} onChange={setObraId} disabled={!clienteId}
              opciones={[{ valor: '', texto: 'Obra nueva (se crea al aprobar)' }, ...(obras ?? []).map((o) => ({ valor: o.id as string, texto: o.nombre as string, sub: (o.direccion as string) || undefined }))]} />
          </>}
          {para === 'prospecto' && <Selector etiqueta="Prospecto" valor={prospectoId} onChange={setProspectoId} placeholder="Elegí un prospecto…"
            opciones={(prospectos ?? []).map((p) => ({ valor: p.id, texto: nombreDe(p), sub: p.tipo_trabajo ?? undefined }))} />}
          {para === 'nuevo' && <T v="chico">Poné nombre y teléfono en el texto: el cliente se crea al aprobar la cotización.</T>}
        </Vidrio>

        <Vidrio style={{ gap: 12 }}>
          <T v="h2">¿Qué hay que hacer?</T>
          <Campo multiline value={texto} onChangeText={setTexto} style={{ minHeight: 120 }} accessibilityLabel="Descripción y medidas"
            placeholder="Ej.: cocina con bajo mesada de 2,40 m (720 x 550) con cajonera de 3 cajones, alacena de 1,80 m (700 x 350), melamina blanca, patas regulables." />
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Boton chico tipo="secundario" icono={dictado.grabando ? 'stop-circle-outline' : 'microphone-outline'} texto={dictado.grabando ? 'Terminar dictado' : 'Dictar'} cargando={dictado.transcribiendo} onPress={dictado.alternar} />
            <Boton chico tipo="secundario" icono="camera-outline" texto="Foto" disabled={fotos.length >= MAX_FOTOS} onPress={async () => { const f = await tomarFoto('camara'); if (f) setFotos((x) => [...x, f].slice(0, MAX_FOTOS)); }} />
            <Boton chico tipo="secundario" icono="image-multiple-outline" texto="Galería" disabled={fotos.length >= MAX_FOTOS} onPress={async () => { const fs = await elegirFotos(MAX_FOTOS - fotos.length); setFotos((x) => [...x, ...fs].slice(0, MAX_FOTOS)); }} />
          </View>
          {fotos.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {fotos.map((f, i) => (
              <View key={f.uri} style={{ gap: 4, alignItems: 'center' }}>
                <Image source={{ uri: f.uri }} style={{ width: 84, height: 84, borderRadius: radius.sm }} accessibilityLabel={`Adjunto ${i + 1}`} />
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <Pressable onPress={async () => { const g = await girar(f); setFotos((x) => x.map((y, j) => (j === i ? g : y))); }} accessibilityRole="button" accessibilityLabel={`Girar adjunto ${i + 1} 90 grados`}
                    style={{ width: 40, height: 36, borderRadius: radius.sm, backgroundColor: c.vidrioFuerte, alignItems: 'center', justifyContent: 'center' }}><Icono n="rotate-right" size={20} color={c.texto} /></Pressable>
                  <Pressable onPress={() => setFotos((x) => x.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel={`Quitar adjunto ${i + 1}`}
                    style={{ width: 40, height: 36, borderRadius: radius.sm, backgroundColor: c.vidrioFuerte, alignItems: 'center', justifyContent: 'center' }}><Icono n="close" size={18} color={c.texto} /></Pressable>
                </View>
              </View>
            ))}
          </View>}
          <T v="chico">Plano, foto o bosquejo: hasta {MAX_FOTOS}, se mandan comprimidos.</T>
          {fotos.length > 0 && <T v="chico">Si el plano está de costado, giralo con ↻ hasta que los textos se lean derechos: el agente lo lee mucho mejor.</T>}
        </Vidrio>
        <Boton icono="auto-fix" texto="Leer y armar el diseño" onPress={leer} disabled={!!ocupado || !listo1} />
      </>}

      {paso === 1 && <>
        {preguntas.length > 0 && <Vidrio style={{ gap: 6 }}>
          <T v="h2">Para confirmar con el cliente</T>
          {preguntas.map((p, i) => <T key={i}>• {p}</T>)}
        </Vidrio>}

        <Vidrio style={{ gap: 8 }}>
          <T v="h2">Plano</T>
          {svg ? <View style={{ backgroundColor: c.papel, borderRadius: radius.sm, padding: 6 }}><SvgXml xml={svg} width="100%" height={240} /></View> : <T v="chico">Sin plano.</T>}
          <Boton chico tipo="quiet" icono="refresh" texto="Actualizar plano" disabled={!!ocupado} onPress={() => correr('Actualizando el plano…', guardar)} />
        </Vidrio>

        <T v="etiqueta">Módulos · medidas del casco en mm</T>
        {modulos.map((m, i) => (
          <Vidrio key={i} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
              <Campo etiqueta={`Módulo ${i + 1}`} value={m.nombre} onChangeText={(v) => setMod(i, 'nombre', v)} />
              <Boton chico tipo="quiet" icono="trash-can-outline" texto="Quitar" onPress={() => setModulos((ms) => ms.filter((_, j) => j !== i))} />
            </View>
            <Chips opciones={FAMILIAS.map((f) => [f, f[0].toUpperCase() + f.slice(1)] as [string, string])} valor={m.familia} onChange={(v) => setMod(i, 'familia', v)} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['ancho_mm', 'alto_mm', 'prof_mm'] as const).map((k) => (
                <View key={k} style={{ flex: 1 }}><Campo etiqueta={{ ancho_mm: 'Ancho', alto_mm: 'Alto', prof_mm: 'Prof.' }[k]} keyboardType="number-pad" value={String(m[k] ?? '')} onChangeText={(t) => setMod(i, k, entero(t))} /></View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {(['puertas', 'cajones', 'estantes', 'patas', 'terminaciones', 'cantidad'] as const).map((k) => (
                <View key={k} style={{ gap: 4 }}>
                  <T v="chico">{{ puertas: 'Puertas', cajones: 'Cajones', estantes: 'Estantes', patas: 'Patas', terminaciones: 'Lat. term.', cantidad: 'Cantidad' }[k]}</T>
                  <Contador etiqueta={k} valor={Number(m[k]) || 0} onChange={(n) => setMod(i, k, n)} min={k === 'cantidad' ? 1 : 0} max={k === 'terminaciones' ? 2 : 50} />
                </View>
              ))}
            </View>
            <Segmentado opciones={[['superpuestos', 'Frentes superpuestos'], ['embutidos', 'Embutidos']]} valor={m.frentes === 'embutidos' ? 'embutidos' : 'superpuestos'} onChange={(v) => setMod(i, 'frentes', v)} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ width: 100 }}><Campo etiqueta="Zócalo mm" keyboardType="number-pad" value={String(m.zocalo_mm ?? 0)} onChangeText={(t) => setMod(i, 'zocalo_mm', entero(t))} /></View>
              <View style={{ flex: 1 }}><Campo etiqueta="Material" value={m.material} onChangeText={(v) => setMod(i, 'material', v)} /></View>
            </View>
          </Vidrio>
        ))}
        <Boton tipo="secundario" icono="plus" texto="Agregar módulo" onPress={() => setModulos((ms) => [...ms, nuevoModulo(ms[0]?.material)])} />

        <Vidrio style={{ gap: 10 }}>
          <T v="h2">Mano de obra · {horasPersona.toFixed(1)} h-persona</T>
          {manoObra.map((m, i) => (
            <View key={i} style={{ gap: 8, paddingTop: i ? 10 : 0, borderTopWidth: i ? 1 : 0, borderTopColor: c.linea }}>
              <Chips opciones={ETAPAS_MO.map((e) => [e, e === 'terminacion' ? 'Terminación' : e === 'instalacion' ? 'Instalación' : e[0].toUpperCase() + e.slice(1)] as [string, string])} valor={m.etapa} onChange={(v) => setMo(i, 'etapa', v)} />
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
                <View style={{ width: 110 }}><Campo etiqueta="Horas" keyboardType="decimal-pad" value={String(m.horas_estimadas ?? 0)} onChangeText={(t) => setMo(i, 'horas_estimadas', Number(t.replace(',', '.')) || 0)} /></View>
                <View style={{ gap: 4 }}><T v="chico">Personas</T><Contador etiqueta="personas" valor={Number(m.operarios) || 1} min={1} max={20} onChange={(n) => setMo(i, 'operarios', n)} /></View>
                <Boton chico tipo="quiet" icono="close" texto="Quitar" onPress={() => setManoObra((ms) => ms.filter((_, j) => j !== i))} />
              </View>
            </View>
          ))}
          <Boton chico tipo="quiet" icono="plus" texto="Etapa" onPress={() => setManoObra((ms) => [...ms, { etapa: 'armado', horas_estimadas: 0, operarios: 1 }])} />
          <Selector etiqueta="Terminación" valor={terminacion} onChange={setTerminacion} opciones={TERMINACIONES} />
          {/laque|lustr/.test(terminacion) && <Campo etiqueta="m² a terminar (vacío = frentes de ambas caras + laterales a la vista)" keyboardType="decimal-pad" value={m2Term} onChangeText={setM2Term} placeholder="Automático" />}
          <Campo etiqueta="Estilo para el render" value={estilo} onChangeText={setEstilo} placeholder="Ej.: nórdico, tiradores negros" />
        </Vidrio>

        <Boton icono="image-outline" texto="Aprobar diseño y generar render" disabled={!!ocupado || !modulos.length} onPress={() => pedirRender(false)} />
        <Boton tipo="secundario" texto="Cotizar sin render" disabled={!!ocupado || !modulos.length} onPress={() => cotizar(true)} />
      </>}

      {paso === 2 && <Vidrio style={{ gap: 12 }}>
        {render ? <Image source={{ uri: render }} style={{ width: '100%', aspectRatio: 1, borderRadius: radius.sm }} contentFit="contain" accessibilityLabel="Render del mueble" />
          : !ocupado && <T v="chico">No hay render; podés cotizar igual.</T>}
        <Campo value={cambio} onChangeText={setCambio} placeholder="Pedir un cambio (ej.: tiradores negros, sin alacena del medio)" />
        <Boton tipo="secundario" icono="pencil-outline" texto="Rehacer render" disabled={!!ocupado || !cambio.trim()} onPress={() => pedirRender(true)} />
        <Boton icono="calculator-variant-outline" texto="Cotizar" disabled={!!ocupado} onPress={() => cotizar(false)} />
        <T v="chico">Para cambiar medidas o módulos volvé al paso 2: el render es solo la imagen.</T>
      </Vidrio>}

      {paso === 3 && cot && <>
        {resumen && <View style={{ gap: 10 }}>
          <Vidrio destacado style={{ gap: 2 }}><T v="chico" color="rgba(255,255,255,0.85)">Precio sin IVA</T><T v="num" color="#ffffff" style={{ fontSize: 30 }}>{ars(resumen.precioSugerido)}</T></Vidrio>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Vidrio style={{ flex: 1, gap: 2 }}><T v="chico">En dólares</T><T v="num" style={{ fontSize: 20 }}>{usd(resumen.precioUsd)}</T><T v="chico">oficial BCRA {resumen.tcUsd ? ars(resumen.tcUsd) : '—'}</T></Vidrio>
            <Vidrio style={{ flex: 1, gap: 2 }}><T v="chico">Costo directo · margen</T><T v="num" style={{ fontSize: 20 }}>{ars(resumen.costoTotal)}</T><T v="chico">margen {resumen.margen ?? '—'}%</T></Vidrio>
          </View>
        </View>}
        <Vidrio><T>{cot.respuesta}</T></Vidrio>
        {resumen?.documento_url && <Boton tipo="secundario" icono="file-pdf-box" texto="Presupuesto para el cliente" onPress={() => Linking.openURL(resumen.documento_url!)} />}
        <Boton tipo="quiet" texto="Ajustar diseño u horas" onPress={() => setPaso(1)} />
        <Boton icono="check-decagram-outline" texto="Aprobar y crear la OT" disabled={!!ocupado} onPress={aprobar} />
      </>}

      {paso === 4 && ot && <Vidrio style={{ gap: 12 }}>
        <T v="h2">Listo</T>
        <T>{ot.respuesta ?? 'Se creó la orden de trabajo y quedó en la cola de fábrica.'}</T>
        <Boton icono="factory" texto="Ver la cola de fábrica" onPress={() => router.replace('/(tabs)/produccion')} />
        <Boton tipo="secundario" texto="Ver clientes y obras" onPress={() => router.replace('/clientes')} />
      </Vidrio>}
    </Pantalla>
  );
  if (!alCostado || !prev.vistas.length) return pasos;
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View style={{ flex: 55, padding: 20, paddingRight: 0 }}>{panel}</View>
      <View style={{ flex: 45 }}>{pasos}</View>
    </View>
  );
}
