import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Image, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
  Modal, Dimensions, Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { llamarFuncion } from '@/lib/supabase';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '@/lib/theme';
import { comprimir, tomarFoto, type Foto } from '@/lib/imagen';

const { width: SW, height: SH } = Dimensions.get('window');
const C = {
  bg:'#0E141B', card:'#161F28', raised:'#1C2733',
  gold:'#E2A848', honey:'#E2A848', amber:'#E8C88E',
  green:'#2EB89E', red:'#F07064', teak:'#8b5e3c',
  t1:'#E6EBF0', t2:'#9AA8B5',
  t3:'#7D8B99', border:'#263240',
  borderGold:'rgba(226,168,72,0.35)',
};

// ─── HELPERS ──────────────────────────────────────────────────────
async function transcribirAudio(uri: string): Promise<string | null> {
  try {
    const fd = new FormData();
    fd.append('file', { uri, type: 'audio/m4a', name: 'audio.m4a' } as any);
    const r = await llamarFuncion('zebrano-whisper', fd, false);
    const d = await r.json();
    return d.text ?? null;
  } catch (e) { console.error('Whisper:', e); return null; }
}

async function chatCotizador(params: Record<string, unknown>) {
  const r = await llamarFuncion('zebrano-cotizador', JSON.stringify(params));
  return r.json();
}

// ─── SVG VIEWER: HTML wrapper con pinch-zoom nativo ───────────────
function buildSVGHtml(svgContent: string): string {
  // quitar width/height fijos del SVG para que ocupe el 100%
  const svgFixed = svgContent
    .replace(/<svg\s/i, '<svg style="width:100%;height:auto;display:block;" ')
    .replace(/\s+width="[^"]*"/, '')
    .replace(/\s+height="[^"]*"/, '');

  return `<!DOCTYPE html><html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=10.0,user-scalable=yes"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;background:#fff;overflow:auto;-webkit-overflow-scrolling:touch}
    #wrap{width:100%;padding:12px}
  </style>
</head>
<body>
  <div id="wrap">${svgFixed}</div>
  <script>
    var last=0;
    document.addEventListener('touchend',function(){
      var now=Date.now();
      if(now-last<300){
        window.scrollTo(0,0);
        document.querySelector('meta[name=viewport]')
          .setAttribute('content','width=device-width,initial-scale=1.0,maximum-scale=10.0,user-scalable=yes');
      }
      last=now;
    });
  </script>
</body></html>`;
}

// ─── COMPONENTE SVG VIEWER ────────────────────────────────────────
function NogalSVGViewer({
  svgContent, sesionId, onAjustar, onAprobar, aprobando, onVerPlano,
}: {
  svgContent: string; sesionId: string;
  onAjustar: () => void; onAprobar: () => void; aprobando: boolean; onVerPlano: () => void;
}) {
  const [cargando, setCargando] = useState(true);
  return (
    <View style={sv.wrap}>
      <View style={sv.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={sv.title}>Plano leído</Text>
          <TouchableOpacity onPress={onVerPlano} style={{ backgroundColor: 'rgba(201,168,76,0.15)', padding: 6, borderRadius: 6 }}>
            <Text style={{ color: C.green, fontSize: 12, fontFamily: fonts.semibold }}>Ampliar</Text>
          </TouchableOpacity>
        </View>
        <Text style={sv.sub}>Pellizcá para hacer zoom</Text>
      </View>
      <View style={sv.wvBox}>
        {cargando && (
          <View style={sv.loading}>
            <ActivityIndicator size="large" color={C.gold} />
            <Text style={{ color: C.t3, fontSize: 12, marginTop: 6 }}>Cargando plano...</Text>
          </View>
        )}
        <WebView
          source={{ html: buildSVGHtml(svgContent) }}
          style={{ flex: 1, backgroundColor: '#fff' }}
          scrollEnabled
          bounces={false}
          scalesPageToFit={false}
          androidLayerType="hardware"
          onLoadEnd={() => setCargando(false)}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        />
      </View>
      <View style={sv.actions}>
        <TouchableOpacity style={[sv.btn, sv.btnSec]} onPress={onAjustar} activeOpacity={0.75}>
          <Text style={sv.btnSecTxt}>Ajustar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[sv.btn, sv.btnPri, aprobando && sv.btnDis]}
          onPress={onAprobar}
          disabled={aprobando}
          activeOpacity={0.75}
        >
          {aprobando
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={sv.btnPriTxt}>Aprobar y ver render</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const sv = StyleSheet.create({
  wrap:    { backgroundColor: C.card, borderRadius: 12, overflow: 'hidden', marginVertical: 10, borderWidth: 1, borderColor: C.borderGold },
  header:  { padding: 10, backgroundColor: C.raised, borderBottomWidth: 1, borderBottomColor: C.border },
  title:   { color: C.amber, fontSize: 14, fontFamily: fonts.semibold },
  sub:     { color: C.t3, fontSize: 11, marginTop: 2 },
  wvBox:   { height: SH * 0.42, backgroundColor: '#fff', position: 'relative' },
  loading: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  actions: { flexDirection: 'row', gap: 8, padding: 10, backgroundColor: C.raised, borderTopWidth: 1, borderTopColor: C.border },
  btn:     { flex: 1, paddingVertical: 11, borderRadius: 8, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  btnSec:  { backgroundColor: C.card, borderWidth: 1, borderColor: C.borderGold },
  btnSecTxt: { color: C.t2, fontSize: 13, fontFamily: fonts.medium },
  btnPri:  { backgroundColor: C.green },
  btnPriTxt: { color: '#04211C', fontSize: 14, fontFamily: fonts.bold },
  btnDis:  { opacity: 0.6 },
});

// ─── TIPOS ────────────────────────────────────────────────────────
interface Msg {
  id: string; rol: 'user' | 'agent'; texto: string;
  imagenes?: string[]; renderUrl?: string | null;
  svgTecnico?: string | null; timestamp: string;
}

// ─── PANTALLA PRINCIPAL ───────────────────────────────────────────
export default function CotizadorScreen() {
  const scrollRef  = useRef<ScrollView>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const [sesionId, setSesionId]       = useState<string | null>(null);
  const [msgs, setMsgs]               = useState<Msg[]>([]);
  const [input, setInput]             = useState('');
  const [imgs, setImgs]               = useState<Foto[]>([]);
  const [loading, setLoading]         = useState(false);
  const [grabando, setGrabando]       = useState(false);
  const [transcribiendo, setTrans]    = useState(false);
  const [resumen, setResumen]         = useState<Record<string, any> | null>(null);
  const [renderUrl, setRenderUrl]     = useState<string | null>(null);
  const [modalImg, setModalImg]       = useState<string | null>(null);
  const [aprobando, setAprobando]     = useState(false);
  const [aprobandoSVG, setAprobSVG]   = useState(false);
  const [modalSvg, setModalSvg]         = useState<string | null>(null);
  const [otCreada, setOtCreada]       = useState<string | null>(null);
  const [pdfUrl, setPdfUrl]           = useState<string | null>(null);
  const [hojaUrl, setHojaUrl]         = useState<string | null>(null);

  const insets = useSafeAreaInsets();
  // Etapa actual para la barra de progreso: Plano → Render → Presupuesto → A la cola
  const etapa = otCreada ? 3 : (resumen || pdfUrl) ? 2 : renderUrl ? 1 : 0;
  const scroll = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);

  // ── GRABAR AUDIO ───────────────────────────────────────────────
  const iniciarGrabacion = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Sin permiso de micrófono'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording; setGrabando(true);
    } catch (e) { console.error('Grab:', e); }
  };
  const detenerGrabacion = async () => {
    if (!recordingRef.current) return;
    setGrabando(false); setTrans(true);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI()!;
      recordingRef.current = null;
      const texto = await transcribirAudio(uri);
      if (texto) setInput(p => p ? p + ' ' + texto : texto);
      else Alert.alert('No se pudo transcribir', 'Intentá de nuevo o escribí el texto');
    } catch (e) { console.error('Stop:', e); }
    setTrans(false);
  };

  // ── ENVIAR MENSAJE A NOGAL ─────────────────────────────────────
  const enviar = useCallback(async () => {
    if (loading || (!input.trim() && imgs.length === 0)) return;
    setLoading(true);
    const localImgs = [...imgs]; const msgTxt = input;
    setInput(''); setImgs([]);
    setMsgs(p => [...p, { id: Date.now().toString(), rol: 'user', texto: msgTxt || '(imágenes)', imagenes: localImgs.map(f => f.uri), timestamp: new Date().toISOString() }]);
    scroll();

    const b64s = localImgs.map(f => f.base64);

    try {
      const resp = await chatCotizador({ sesion_id: sesionId ?? undefined, mensaje: msgTxt, imagenes_base64: b64s, origen: 'app' });
      if (resp.ok) {
        if (!sesionId) setSesionId(resp.sesion_id);
        if (resp.render_url) setRenderUrl(resp.render_url);
        if (resp.resumen?.listo_para_aprobar) setResumen(resp.resumen);
        if (resp.resumen?.documento_url) setPdfUrl(resp.resumen.documento_url);
        setMsgs(p => [...p, {
          id: (Date.now() + 1).toString(), rol: 'agent',
          texto: resp.respuesta,
          renderUrl: resp.render_url ?? null,
          svgTecnico: resp.svg_tecnico ?? null,   // ← SVG técnico de Nogal
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch {
      setMsgs(p => [...p, { id: Date.now().toString(), rol: 'agent', texto: 'Error de conexión.', timestamp: new Date().toISOString() }]);
    }
    setLoading(false); scroll();
  }, [loading, input, imgs, sesionId]);

  // ── APROBAR SVG → dispara render fotorrealista ─────────────────
  const aprobarSVG = useCallback(async () => {
    if (!sesionId || aprobandoSVG) return;
    setAprobSVG(true);
    setMsgs(p => [...p, { id: Date.now().toString(), rol: 'user', texto: 'Apruebo el plano técnico: generá el render', timestamp: new Date().toISOString() }]);
    scroll();
    try {
      const resp = await chatCotizador({ sesion_id: sesionId, aprobar_svg: true });
      if (resp.ok) {
        if (resp.render_url) setRenderUrl(resp.render_url);
        setMsgs(p => [...p, {
          id: (Date.now() + 1).toString(), rol: 'agent',
          texto: resp.respuesta,
          renderUrl: resp.render_url ?? null,
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch { }
    setAprobSVG(false); scroll();
  }, [sesionId, aprobandoSVG]);

  // ── APROBAR COTIZACIÓN → crea OT ──────────────────────────────
  const aprobar = useCallback(async () => {
    if (!sesionId || aprobando) return;
    Alert.alert(
      'Aprobar cotización',
      `Precio: $${resumen?.precioSugerido?.toLocaleString('es-AR')}\n¿Generar Orden de Trabajo?`,
      [{ text: 'Cancelar', style: 'cancel' }, {
        text: 'Aprobar y mandar a la cola', onPress: async () => {
          setAprobando(true);
          try {
            const resp = await chatCotizador({ sesion_id: sesionId, aprobar_cotizacion: true });
            if (resp.ok && resp.ot_creada) {
              setOtCreada(resp.numero_ot); setResumen(null); setHojaUrl(resp.hoja_taller_url ?? null);
              setMsgs(p => [...p, { id: Date.now().toString(), rol: 'agent', texto: resp.respuesta, timestamp: new Date().toISOString() }]);
              scroll();
            }
          } catch { }
          setAprobando(false);
        }
      }]
    );
  }, [sesionId, resumen, aprobando]);

  // ── IMÁGENES ──────────────────────────────────────────────────
  const pickImg = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsMultipleSelection: true, selectionLimit: 3 });
    if (!r.canceled) { const fs = await Promise.all(r.assets.map(comprimir)); setImgs(p => [...p, ...fs]); }
  };
  const takePhoto = async () => {
    const f = await tomarFoto('camara');
    if (f) setImgs(p => [...p, f]);
  };

  const canSend = !loading && (input.trim().length > 0 || imgs.length > 0);

  // ─── RENDER ─────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.container}>

        {/* HEADER */}
        <View style={[s.header, { paddingTop: insets.top + 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, color: C.t1, fontSize: 22, fontFamily: fonts.bold }}>{sesionId ? 'Cotización' : 'Nueva cotización'}</Text>
            {sesionId && (
              <TouchableOpacity style={s.headerBtn} onPress={() => { setSesionId(null); setMsgs([]); setResumen(null); setRenderUrl(null); setOtCreada(null); setPdfUrl(null); setHojaUrl(null); }}>
                <Feather name="plus" size={16} color={C.green} />
                <Text style={{ color: C.green, fontSize: 13, fontFamily: fonts.semibold }}>Nueva</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {['Plano', 'Render', 'Presupuesto', 'A la cola'].map((e, i) => (
              <View key={e} style={{ flex: 1, gap: 6 }}>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: i <= etapa ? C.green : C.border }} />
                <Text style={{ fontSize: 12, fontFamily: i === etapa ? fonts.semibold : fonts.regular, color: i === etapa ? C.green : C.t2 }}>{e}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CHAT */}
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 12, gap: 6 }} keyboardShouldPersistTaps="handled">

          {msgs.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 50 }}>
              <Text style={{ fontSize: 48, color: C.gold }}>◇</Text>
              <Text style={{ fontSize: 18, color: C.t1, fontFamily: fonts.semibold, marginTop: 8 }}>Nogal</Text>
              <Text style={{ fontSize: 13, color: C.t3, textAlign: 'center', marginTop: 6 }}>
                Describí el mueble y genero el plano técnico{'\n'}con cotas reales antes del render
              </Text>
              {['Placard 2 cuerpos melamina blanco 2.4x2.2m', 'Cocina en L rovere 3x2.5m', 'Biblioteca living con escritorio'].map(ex => (
                <TouchableOpacity key={ex} style={[s.exBtn, { marginTop: 8, width: '100%' }]} onPress={() => setInput(ex)}>
                  <Text style={{ color: C.t2, fontSize: 13, textAlign: 'center' }}>{ex}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {msgs.map(m => (
            <View key={m.id}>
              <View style={[s.bubble, m.rol === 'user' ? s.bubbleUser : s.bubbleAgent]}>
                {m.rol === 'agent' && <Text style={{ fontSize: 9, color: C.gold, letterSpacing: 1, marginBottom: 4 }}>NOGAL</Text>}
                {m.imagenes?.map((uri, i) => (
                  <TouchableOpacity key={i} onPress={() => setModalImg(uri)} activeOpacity={0.85}>
                    <Image source={{ uri }} style={{ width: '100%', height: 180, borderRadius: 8, marginBottom: 6 }} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
                <Text style={{ color: m.rol === 'user' ? C.t1 : C.t2, fontSize: 14, lineHeight: 20 }}>{m.texto}</Text>

                {/* RENDER FOTORREALISTA */}
                {m.renderUrl && (
                  <View style={{ marginTop: 8 }}>
                    <TouchableOpacity onPress={() => setModalImg(m.renderUrl!)} activeOpacity={0.85}>
                      <Image source={{ uri: m.renderUrl }} style={{ width: '100%', height: 220, borderRadius: 10 }} resizeMode="cover" />
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                      <TouchableOpacity style={s.renderAction} onPress={() => setModalImg(m.renderUrl!)}>
                        <Text style={{ color: C.gold, fontSize: 11 }}>Ampliar</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ color: C.t3, fontSize: 10, marginTop: 4 }}>Render DALL-E 3</Text>
                  </View>
                )}

                <Text style={{ color: C.t3, fontSize: 9, marginTop: 6, alignSelf: 'flex-end' }}>
                  {new Date(m.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              {/* SVG TÉCNICO — debajo del bubble del agente */}
              {m.rol === 'agent' && m.svgTecnico && !m.renderUrl && sesionId && (
                <NogalSVGViewer
                  svgContent={m.svgTecnico}
                  sesionId={sesionId}
                  onAjustar={() => { setInput('Ajustar: '); }}
                  onAprobar={aprobarSVG}
                  aprobando={aprobandoSVG}
                  onVerPlano={() => setModalSvg(m.svgTecnico!)}
                />
              )}
            </View>
          ))}

          {/* LOADING */}
          {(loading || transcribiendo) && (
            <View style={[s.bubbleAgent, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
              <ActivityIndicator size="small" color={C.gold} />
              <Text style={{ color: C.t3, fontSize: 13 }}>
                {transcribiendo ? 'Transcribiendo audio...' : 'Nogal está generando...'}
              </Text>
            </View>
          )}

          {/* RESUMEN COTIZACIÓN */}
          {resumen && !otCreada && (
            <View style={{ backgroundColor: C.raised, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.borderGold, marginTop: 8 }}>
              <Text style={{ color: C.amber, fontSize: 13, fontFamily: fonts.semibold, marginBottom: 10 }}>Cotización lista</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ color: C.t1, fontSize: 15, fontFamily: fonts.semibold }}>Precio al cliente</Text>
                <Text style={{ color: C.amber, fontSize: 18, fontFamily: fonts.bold }}>${resumen.precioSugerido?.toLocaleString('es-AR')}</Text>
              </View>
              {pdfUrl && (
                <TouchableOpacity style={{ borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: C.borderGold }} onPress={() => Linking.openURL(pdfUrl)}>
                  <Text style={{ color: C.gold, fontSize: 13, fontFamily: fonts.semibold }}>Ver presupuesto (PDF)</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={{ backgroundColor: C.green, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 12 }} onPress={aprobar} disabled={aprobando}>
                {aprobando ? <ActivityIndicator color="#04211C" /> : <Text style={{ color: '#04211C', fontSize: 15, fontFamily: fonts.bold }}>Aprobar y mandar a la cola</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={{ backgroundColor: C.card, borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: C.border }} onPress={() => setInput('Quiero modificar: ')}>
                <Text style={{ color: C.t2, fontSize: 13 }}>Solicitar modificación</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* OT CREADA */}
          {otCreada && (
            <View style={{ backgroundColor: 'rgba(46,184,158,0.10)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(46,184,158,0.35)', marginTop: 8, alignItems: 'center' }}>
              <Feather name="check-circle" size={30} color={C.green} />
              <Text style={{ color: C.green, fontSize: 15, fontFamily: fonts.bold, marginTop: 6 }}>{otCreada} creada</Text>
              <Text style={{ color: C.t3, fontSize: 12, marginTop: 4 }}>Quedó en la cola de fabricación</Text>
              {hojaUrl && (
                <TouchableOpacity onPress={() => Linking.openURL(hojaUrl)} style={{ marginTop: 8 }}>
                  <Text style={{ color: C.gold, fontSize: 13 }}>Hoja de taller (PDF)</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

        </ScrollView>

        {/* PREVIEW IMÁGENES */}
        {imgs.length > 0 && (
          <ScrollView horizontal style={{ maxHeight: 90, backgroundColor: '#121A22', borderTopWidth: 1, borderTopColor: C.border }} contentContainerStyle={{ gap: 8, padding: 8 }}>
            {imgs.map((f, i) => (
              <View key={i} style={{ position: 'relative' }}>
                <Image source={{ uri: f.uri }} style={{ width: 72, height: 72, borderRadius: 8 }} />
                <TouchableOpacity style={{ position: 'absolute', top: 2, right: 2, backgroundColor: C.red, borderRadius: 8, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }} onPress={() => setImgs(p => p.filter((_, idx) => idx !== i))}>
                  <Text style={{ color: '#fff', fontSize: 10 }}>X</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* INPUT */}
        <View style={s.inputArea}>
          <TouchableOpacity onPress={takePhoto} style={s.iconBtn} accessibilityLabel="Sacar foto"><Feather name="camera" size={20} color={C.t1} /></TouchableOpacity>
          <TouchableOpacity onPress={pickImg} style={s.iconBtn} accessibilityLabel="Elegir de la galería"><Feather name="image" size={20} color={C.t1} /></TouchableOpacity>
          <TouchableOpacity
            style={[s.iconBtn, grabando && { backgroundColor: '#e0606030', borderColor: C.red }]}
            onPress={grabando ? detenerGrabacion : iniciarGrabacion}
            disabled={transcribiendo}
          >
            {transcribiendo
              ? <ActivityIndicator size="small" color={C.gold} />
              : <Feather name={grabando ? 'square' : 'mic'} size={20} color={grabando ? C.red : C.gold} />}
          </TouchableOpacity>
          <TextInput
            style={[s.input, grabando && { borderColor: C.red }]}
            value={input}
            onChangeText={setInput}
            placeholder={grabando ? 'Grabando... tocá ⏹️ para detener' : 'Describí el mueble, hablá o subí fotos...'}
            placeholderTextColor={grabando ? C.red : C.t3}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity style={[s.sendBtn, !canSend && { opacity: 0.35 }]} onPress={enviar} disabled={!canSend}>
            {loading ? <ActivityIndicator size="small" color={C.bg} /> : <Feather name="arrow-up" size={22} color="#04211C" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* MODAL SVG PANTALLA COMPLETA */}
      <Modal visible={!!modalSvg} transparent={false} animationType="slide" statusBarTranslucent onRequestClose={() => setModalSvg(null)}>
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#161F28', borderBottomWidth: 1, borderBottomColor: '#263240' }}>
            <Text style={{ color: '#E2A848', fontSize: 14, fontFamily: fonts.semibold }}>Plano técnico</Text>
            <TouchableOpacity
              onPress={() => setModalSvg(null)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ backgroundColor: '#e06060', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 }}>
              <Text style={{ color: '#fff', fontSize: 14, fontFamily: fonts.bold }}>✕ Cerrar</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: '#888', fontSize: 11, textAlign: 'center', paddingVertical: 6, backgroundColor: '#f5f5f5' }}>Pellizcar para zoom · Scroll para mover</Text>
          {modalSvg && (
            <WebView
              source={{ html: buildSVGHtml(modalSvg) }}
              style={{ flex: 1 }}
              scrollEnabled
              scalesPageToFit={false}
              androidLayerType="hardware"
              bounces={false}
            />
          )}
        </View>
      </Modal>

      {/* MODAL IMAGEN CON ZOOM */}
      <Modal visible={!!modalImg} transparent={false} animationType="fade" statusBarTranslucent onRequestClose={() => setModalImg(null)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#111' }}>
            <Text style={{ color: '#E2A848', fontSize: 13 }}>Render fotorrealista</Text>
            <TouchableOpacity
              onPress={() => setModalImg(null)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ backgroundColor: '#e06060', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 }}>
              <Text style={{ color: '#fff', fontSize: 14, fontFamily: fonts.bold }}>✕ Cerrar</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: '#555', fontSize: 11, textAlign: 'center', paddingVertical: 4, backgroundColor: '#111' }}>Pellizcar para zoom</Text>
          {modalImg && (
            <WebView
              source={{ html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=10.0,user-scalable=yes"/><style>*{margin:0;padding:0;background:#000}html,body{width:100%;height:100%;display:flex;align-items:center;justify-content:center}img{max-width:100%;height:auto;touch-action:pinch-zoom}</style></head><body><img src="${modalImg}" /></body></html>` }}
              style={{ flex: 1, backgroundColor: '#000' }}
              scrollEnabled
              scalesPageToFit={false}
              androidLayerType="hardware"
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── ESTILOS ──────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0E141B' },
  header:      { gap: 16, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: '#0E141B', borderBottomWidth: 1, borderBottomColor: '#263240' },
  dot:         { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E2A848' },
  agentLabel:  { color: '#E2A848', fontSize: 13, fontFamily: fonts.semibold },
  headerBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 8 },
  exBtn:       { backgroundColor: '#161F28', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#263240' },
  bubble:      { borderRadius: 16, padding: 12, marginBottom: 4 },
  bubbleUser:  { backgroundColor: '#1C2733', alignSelf: 'flex-end', maxWidth: '88%', borderBottomRightRadius: 4 },
  bubbleAgent: { backgroundColor: '#161F28', alignSelf: 'flex-start', maxWidth: '96%', borderWidth: 1, borderColor: '#263240' },
  renderAction:{ flex: 1, backgroundColor: '#161F28', borderRadius: 8, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#263240' },
  inputArea:   { flexDirection: 'row', alignItems: 'flex-end', gap: 5, padding: 10, backgroundColor: '#121A22', borderTopWidth: 1, borderTopColor: '#263240' },
  iconBtn:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#161F28', borderRadius: 22, borderWidth: 1, borderColor: '#263240' },
  input:       { flex: 1, backgroundColor: '#161F28', borderRadius: 22, borderWidth: 1, borderColor: '#263240', color: '#E6EBF0', paddingHorizontal: 16, paddingVertical: 11, fontSize: 14, maxHeight: 100, fontFamily: fonts.regular },
  sendBtn:     { width: 44, height: 44, backgroundColor: C.green, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  modalBtn:    { backgroundColor: '#161F28', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: '#263240' },
});
