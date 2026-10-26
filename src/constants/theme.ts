import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0B1A12',
    background: '#FFFFFF',
    backgroundElement: '#F1F4F2',
    backgroundSelected: '#DDE5E0',
    textSecondary: '#5B6660',
    border: '#D9E0DC',
    primary: '#15803D',
    onPrimary: '#FFFFFF',
    primarySoft: '#DCFCE7',
    danger: '#B91C1C',
    bubbleMine: '#15803D',
    onBubbleMine: '#FFFFFF',
  },
  dark: {
    text: '#F2F5F3',
    background: '#0B0F0D',
    backgroundElement: '#18201B',
    backgroundSelected: '#243029',
    textSecondary: '#A3B0A8',
    border: '#2A352E',
    primary: '#22C55E',
    onPrimary: '#04210F',
    primarySoft: '#123222',
    danger: '#F87171',
    bubbleMine: '#16A34A',
    onBubbleMine: '#FFFFFF',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

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
  small: 8,
  medium: 12,
  large: 20,
  pill: 999,
} as const;

export const MaxContentWidth = 720;
