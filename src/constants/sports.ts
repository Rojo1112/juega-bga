import type { SkillLevel, SportId } from '@/lib/types';

// Debe coincidir con los deportes que inserta supabase/schema.sql.
export const SPORTS: { id: SportId; name: string; emoji: string; defaultPlayers: number }[] = [
  { id: 'futbol', name: 'Fútbol', emoji: '⚽', defaultPlayers: 10 },
  { id: 'padel', name: 'Pádel', emoji: '🎾', defaultPlayers: 4 },
  { id: 'pickleball', name: 'Pickleball', emoji: '🏓', defaultPlayers: 4 },
  { id: 'tenis', name: 'Tenis', emoji: '🎾', defaultPlayers: 2 },
  { id: 'baloncesto', name: 'Baloncesto', emoji: '🏀', defaultPlayers: 10 },
  { id: 'voleibol', name: 'Voleibol', emoji: '🏐', defaultPlayers: 12 },
];

export function sportById(id: SportId | null | undefined) {
  return SPORTS.find((sport) => sport.id === id);
}

export const LEVELS: { id: SkillLevel; name: string }[] = [
  { id: 'principiante', name: 'Principiante' },
  { id: 'intermedio', name: 'Intermedio' },
  { id: 'avanzado', name: 'Avanzado' },
];

export function levelName(id: SkillLevel | null | undefined) {
  return LEVELS.find((level) => level.id === id)?.name ?? 'Cualquier nivel';
}

// Se usa cuando la cancha no tiene su propio enlace de EasyCancha.
export const EASYCANCHA_URL = 'https://www.easycancha.com';
