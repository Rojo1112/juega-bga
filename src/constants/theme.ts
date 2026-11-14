import '@/global.css';

import type { SportId } from '@/lib/types';

// Identidad única: cancha de noche bajo reflectores. No hay tema claro.
export const Colors = {
  text: '#F4F6FB', // cal de las líneas
  background: '#070B1A', // noche
  backgroundElement: '#0F1630', // grada
  backgroundSelected: '#1A2347',
  textSecondary: '#8D97BD', // bruma
  border: '#26305A', // línea
  primary: '#FFC247', // reflector
  onPrimary: '#1A1200',
  primarySoft: '#2A2410',
  danger: '#FF6B6B',
  bubbleMine: '#FFC247',
  onBubbleMine: '#1A1200',
} as const;

export type ThemeColor = keyof typeof Colors;

/** Color de la superficie donde se juega cada deporte. */
export const SportColors: Record<SportId, string> = {
  futbol: '#35D07F',
  padel: '#3E8BFF',
  pickleball: '#19D3C5',
  tenis: '#D9F23D',
  baloncesto: '#FF7A1A',
  voleibol: '#EBD3A0',
};

export const Fonts = {
  display: 'Unbounded_500Medium',
  displayBold: 'Unbounded_700Bold',
  body: 'Manrope_500Medium',
  bodySemi: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 6,
  medium: 10,
  large: 18,
  pill: 999,
} as const;

export const MaxContentWidth = 720;
/** Ancho máximo de las pantallas con rejilla de tarjetas (partidos y canchas). */
export const MaxWideContentWidth = 1200;
