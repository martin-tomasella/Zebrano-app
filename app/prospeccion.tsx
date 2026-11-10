// app/prospeccion.tsx — bandeja de mails de prospección (como la función Bandeja de Prospeccion.jsx).
// Aprobar NO envía: no hay casilla conectada. RLS de prosp_*: admin y gestión.
import { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store';
import { puede } from '@/lib/permisos';
import { useTema } from '@/lib/theme';
import { Pantalla, Vidrio, T, Badge, Boton, Campo, Segmentado, Aviso, Cargando, Vacio, fecha, tonoEstado } from '@/components/ui';

interface Msj { id: string; empresa_id: string; para: string; asunto: string; cuerpo: string; estado: string; gate: string[] | null; error: string | null; created_at: string; prosp_empresas: { nombre: string; segmento: string | null } | null }
type Filtro = 'pendientes' | 'aprobados' | 'enviados' | 'descartados';
const GRUPOS: Record<Filtro, (m: Msj) => boolean> = {
  pendientes: (m) => ['borrador', 'propuesto'].includes(m.estado),
  aprobados: (m) => m.estado === 'aprobado',
  enviados: (m) => m.estado === 'enviado',
  descartados: (m) => ['rechazado', 'bloqueado', 'error'].includes(m.estado),
};

export default function Prospeccion() {
  const { c } = useTema();
  const rol = useAppStore((s) => s.empleado?.rol);
  const [filtro, setFiltro] = useState<Filtro>('pendientes');
  const [edit, setEdit] = useState<Record<string, { asunto?: string; cuerpo?: string } | undefined>>({});
  const [msg, setMsg] = useState('');
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['prosp-mensajes'], enabled: puede(rol, 'prospeccion'),
    queryFn: async () => (await supabase.from('prosp_mensajes').select('*, prosp_empresas(nombre,segmento)').order('created_at', { ascending: false }).limit(300)).data as Msj[] ?? [],
  });
  if (!puede(rol, 'prospeccion')) return <Pantalla><Vacio icono="lock-outline" titulo="Solo para administración y gestión" /></Pantalla>;

  const guardar = async (m: Msj, cambios: Record<string, unknown>) => {
    const e = edit[m.id] ?? {};
    const { error } = await supabase.from('prosp_mensajes').update({ asunto: e.asunto ?? m.asunto, cuerpo: e.cuerpo ?? m.cuerpo, ...cambios }).eq('id', m.id);
    if (error) { setMsg(error.message); return; }
    setEdit((x) => ({ ...x, [m.id]: undefined })); refetch();
  };
  const aProspecto = async (m: Msj) => {
    const { data: e } = await supabase.from('prosp_empresas').select('id,nombre,email,telefono,segmento,rubro,prospecto_id').eq('id', m.empresa_id).single();
    if (e?.prospecto_id) { setMsg('Esta empresa ya es prospecto.'); return; }
    const { data: p, error } = await supabase.from('prospectos').insert({ nombre: e?.nombre || m.prosp_empresas?.nombre, email: e?.email || m.para, telefono: e?.telefono || null, canal_origen: 'prospeccion', estado: 'nuevo', tipo_trabajo: e?.segmento || null, descripcion_proyecto: `Respondió el mail de prospección (${e?.rubro || ''}).`, activo: true }).select('id').single();
    if (error) { setMsg(error.message); return; }
    await supabase.from('prosp_empresas').update({ estado: 'respondio', prospecto_id: p.id }).eq('id', m.empresa_id);
    setMsg(`${e?.nombre || 'La empresa'} pasó a Prospectos.`); refetch();
  };

  const lista = (data ?? []).filter(GRUPOS[filtro]);
  const cuenta = (k: Filtro) => (data ?? []).filter(GRUPOS[k]).length;
  return (
    <Pantalla onRefresh={refetch} refrescando={isRefetching}>
      <Aviso tono="info" texto="Todavía no hay casilla conectada: aprobar deja el mail listo, pero no se envía nada. Si una empresa contesta, pasala a Prospectos." />
      {!!msg && <Aviso tono="primario" texto={msg} />}
      <Segmentado envolver valor={filtro} onChange={setFiltro} opciones={(Object.keys(GRUPOS) as Filtro[]).map((k) => [k, `${k[0].toUpperCase()}${k.slice(1)} ${cuenta(k)}`])} />
      {isLoading ? <Cargando /> : lista.length === 0 ? <Vacio icono="inbox-outline" titulo="No hay mails en esta bandeja" /> : lista.map((m) => {
        const e = edit[m.id];
        return (
          <Vidrio key={m.id} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T v="h2" style={{ flex: 1 }} lineas={1}>{m.prosp_empresas?.nombre ?? m.para}</T>
              <Badge texto={m.estado} tono={tonoEstado(m.estado)} />
            </View>
            <T v="chico">{[m.para, m.prosp_empresas?.segmento, fecha(m.created_at)].filter(Boolean).join(' · ')}</T>
            {e ? <>
              <Campo etiqueta="Asunto" value={e.asunto ?? m.asunto} onChangeText={(t) => setEdit((x) => ({ ...x, [m.id]: { ...e, asunto: t } }))} />
              <Campo etiqueta="Cuerpo" multiline value={e.cuerpo ?? m.cuerpo} onChangeText={(t) => setEdit((x) => ({ ...x, [m.id]: { ...e, cuerpo: t } }))} style={{ minHeight: 180 }} />
            </> : <>
              <T style={{ fontFamily: undefined }}>{m.asunto}</T>
              <T v="chico" style={{ color: c.texto2, fontSize: 13.5, lineHeight: 19 }}>{m.cuerpo}</T>
            </>}
            {(m.gate ?? []).length > 0 && <T v="chico" color={c.error}>Frenado por el control: {(m.gate ?? []).join(' · ')}</T>}
            {!!m.error && <T v="chico">{m.error}</T>}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {['borrador', 'propuesto', 'bloqueado'].includes(m.estado) && <Boton chico texto={e ? 'Guardar y aprobar' : 'Aprobar'} disabled={m.estado === 'bloqueado' && !e} onPress={() => guardar(m, { estado: 'aprobado', gate: [] })} />}
              {m.estado !== 'enviado' && (e ? <Boton chico tipo="secundario" texto="Guardar" onPress={() => guardar(m, {})} /> : <Boton chico tipo="secundario" texto="Editar" onPress={() => setEdit((x) => ({ ...x, [m.id]: {} }))} />)}
              {['borrador', 'propuesto', 'aprobado', 'bloqueado'].includes(m.estado) && <Boton chico tipo="quiet" texto="Descartar" onPress={() => guardar(m, { estado: 'rechazado' })} />}
              {['aprobado', 'rechazado'].includes(m.estado) && <Boton chico tipo="quiet" texto="Volver a pendientes" onPress={() => guardar(m, { estado: 'propuesto' })} />}
              <Boton chico tipo="quiet" icono="account-arrow-right-outline" texto="Respondió → Prospecto" onPress={() => aProspecto(m)} />
            </View>
          </Vidrio>
        );
      })}
    </Pantalla>
  );
}
