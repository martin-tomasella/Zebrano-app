// src/lib/theme.ts — dirección «Veta», la misma de la web (src/index.css, modo oscuro)
export const colors = {
  bgDeep:    '#0E141B',  // fondo
  bgMid:     '#121A22',  // barras
  bgCard:    '#161F28',  // tarjetas
  bgRaised:  '#1C2733',  // controles sobre tarjeta
  primary:   '#2EB89E',  // verde laca: acción principal
  onPrimary: '#04211C',
  gold:      '#E2A848',  // veta: acento (cotizar) y avisos suaves
  onGold:    '#2A1C05',
  goldSoft:  '#E8C88E',
  honey:     '#E2A848',
  amber:     '#E8C88E',
  teak:      '#8b5e3c',
  copper:    '#F0884E',
  sage:      '#4a7c59',
  green:     '#2EB89E',
  red:       '#F07064',
  text1:     '#E6EBF0',
  text2:     '#9AA8B5',
  text3:     '#7D8B99',
  border:    '#263240',
  borderMid: '#263240',
  borderGold:'rgba(226,168,72,0.35)',
};

// Instrument Sans (cargada en app/_layout.tsx)
export const fonts = {
  regular:  'InstrumentSans_400Regular',
  medium:   'InstrumentSans_500Medium',
  semibold: 'InstrumentSans_600SemiBold',
  bold:     'InstrumentSans_700Bold',
  display:  'InstrumentSans_700Bold',
  body:     'InstrumentSans_400Regular',
  bodySB:   'InstrumentSans_600SemiBold',
  mono:     'InstrumentSans_400Regular',
};

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  20,
  xl:  32,
  xxl: 48,
};

export const radius = {
  sm: 12,
  md: 14,
  lg: 18,
  xl: 24,
};
