// src/lib/theme.ts — tema «Glass v6», el mismo de la web (zebrano-web/src/index.css).
// Único lugar con colores: las pantallas usan useTema().c y nunca hex sueltos.
import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const claro = {
  primario: 'rgb(13,118,101)', primario2: 'rgb(9,92,79)', sobrePrimario: '#ffffff',
  texto: 'rgb(20,29,38)', texto2: 'rgb(61,73,86)', texto3: 'rgb(104,116,130)',
  linea: 'rgba(70,52,34,0.12)',
  exito: 'rgb(26,133,74)', aviso: 'rgb(180,112,14)', error: 'rgb(196,52,40)', info: 'rgb(37,99,214)',
  vidrio: 'rgba(255,255,255,0.62)', vidrioBorde: 'rgba(255,255,255,0.55)', vidrioFuerte: 'rgba(255,255,255,0.86)',
  vidrioSutil: 'rgba(255,255,255,0.40)', hundido: 'rgba(255,255,255,0.45)',
  velo: ['rgba(255,250,243,0.30)', 'rgba(236,226,212,0.50)'] as readonly [string, string],
  respaldo: '#cdbba5', sombra: 'rgba(40,28,16,0.25)',
  papel: '#ffffff', // fondo de planos y placas
};
const oscuro: typeof claro = {
  primario: 'rgb(46,184,158)', primario2: 'rgb(80,206,182)', sobrePrimario: 'rgb(4,33,28)',
  texto: 'rgb(230,235,240)', texto2: 'rgb(184,194,204)', texto3: 'rgb(134,148,162)',
  linea: 'rgba(255,255,255,0.09)',
  exito: 'rgb(74,196,124)', aviso: 'rgb(230,172,60)', error: 'rgb(240,112,100)', info: 'rgb(110,160,250)',
  vidrio: 'rgba(22,30,39,0.60)', vidrioBorde: 'rgba(255,255,255,0.10)', vidrioFuerte: 'rgba(20,27,35,0.92)',
  vidrioSutil: 'rgba(255,255,255,0.04)', hundido: 'rgba(0,0,0,0.24)',
  velo: ['rgba(8,12,16,0.38)', 'rgba(8,12,16,0.60)'] as readonly [string, string],
  respaldo: '#0b1015', sombra: 'rgba(0,0,0,0.6)',
  papel: '#ffffff',
};
export type Colores = typeof claro;
export type Tono = 'exito' | 'aviso' | 'error' | 'info' | 'neutro' | 'primario';

// "rgb(13,118,101)" + 0.15 → "rgba(13,118,101,0.15)": badges y fondos tenues
export const alfa = (rgb: string, a: number) => rgb.replace(/^rgba?\(([^)]+?)(,\s*[\d.]+)?\)$/, (_, c) => `rgba(${c.split(',').slice(0, 3).join(',')},${a})`);

export const FONDO_URL = 'https://images.unsplash.com/photo-1769326541248-5e09a8ace25b?w=1600&q=75&auto=format';

export const fonts = {
  regular: 'InstrumentSans_400Regular',
  medium: 'InstrumentSans_500Medium',
  semibold: 'InstrumentSans_600SemiBold',
  bold: 'InstrumentSans_700Bold',
};
export const spacing = { xs: 4, sm: 8, md: 16, lg: 20, xl: 32 };
export const radius = { sm: 10, md: 16, lg: 22 };

type Modo = 'sistema' | 'claro' | 'oscuro';
const CLAVE = 'zebrano.tema';
const Ctx = createContext<{ c: Colores; oscuro: boolean; modo: Modo; setModo: (m: Modo) => void }>({ c: claro, oscuro: false, modo: 'sistema', setModo: () => {} });

export function TemaProvider({ children }: { children: ReactNode }) {
  const sistema = useColorScheme();
  const [modo, setModoE] = useState<Modo>('sistema');
  useEffect(() => { AsyncStorage.getItem(CLAVE).then((v) => { if (v === 'claro' || v === 'oscuro' || v === 'sistema') setModoE(v); }).catch(() => {}); }, []);
  const esOscuro = modo === 'sistema' ? sistema === 'dark' : modo === 'oscuro';
  const valor = useMemo(() => ({
    c: esOscuro ? oscuro : claro, oscuro: esOscuro, modo,
    setModo: (m: Modo) => { setModoE(m); AsyncStorage.setItem(CLAVE, m).catch(() => {}); },
  }), [esOscuro, modo]);
  return createElement(Ctx.Provider, { value: valor }, children);
}

export const useTema = () => useContext(Ctx);
