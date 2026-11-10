// src/lib/voz.ts — dictado: graba con el micrófono y transcribe con zebrano-whisper (JWT del empleado).
import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import { llamarFuncion } from '@/lib/supabase';

export function useDictado(alTexto: (t: string) => void) {
  const rec = useRef<Audio.Recording | null>(null);
  const [grabando, setGrabando] = useState(false);
  const [transcribiendo, setTranscribiendo] = useState(false);

  async function alternar() {
    if (!grabando) {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Sin permiso de micrófono'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      rec.current = recording; setGrabando(true);
      return;
    }
    const r = rec.current; rec.current = null;
    setGrabando(false); setTranscribiendo(true);
    try {
      await r?.stopAndUnloadAsync();
      const uri = r?.getURI();
      if (!uri) throw new Error('sin audio');
      const fd = new FormData();
      fd.append('file', { uri, type: 'audio/m4a', name: 'audio.m4a' } as unknown as Blob);
      const res = await llamarFuncion('zebrano-whisper', fd, false);
      const d = await res.json();
      if (d.text) alTexto(String(d.text)); else throw new Error(d.error ?? 'sin texto');
    } catch {
      Alert.alert('No se pudo transcribir', 'Intentá de nuevo o escribí el texto.');
    } finally { setTranscribiendo(false); }
  }
  return { grabando, transcribiendo, alternar };
}
