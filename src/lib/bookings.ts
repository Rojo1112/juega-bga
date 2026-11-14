import type { CourtHours } from '@/lib/types';

/** Zona de Bogotá: UTC-5 fijo, sin horario de verano. */
export const BOGOTA_TZ = 'America/Bogota';

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const pad = (value: number) => String(value).padStart(2, '0');

/** "HH:MM:SS" (o "HH:MM") a minutos desde medianoche. */
function minutesOf(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Turnos del día (hora de Bogotá) desde la apertura hasta el cierre. */
export function daySlots(
  hours: CourtHours | undefined,
  slotMinutes: number,
  day: string,
  busy: { starts_at: string }[],
) {
  if (!hours) return [];
  const taken = new Set(busy.map((turn) => new Date(turn.starts_at).getTime()));
  const now = Date.now();
  const closes = minutesOf(hours.closes);
  const slots: { starts: string; label: string; free: boolean }[] = [];

  for (let start = minutesOf(hours.opens); start + slotMinutes <= closes; start += slotMinutes) {
    const hour24 = Math.floor(start / 60);
    const minute = pad(start % 60);
    const starts = `${day}T${pad(hour24)}:${minute}:00-05:00`;
    const instant = new Date(starts).getTime();
    slots.push({
      starts,
      label: `${hour24 % 12 || 12}:${minute} ${hour24 < 12 ? 'a. m.' : 'p. m.'}`,
      free: instant > now && !taken.has(instant),
    });
  }
  return slots;
}

/** Próximos n días en hora de Bogotá, empezando hoy. */
export function nextDays(n: number) {
  const today = new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
  const first = Date.parse(`${today}T00:00:00Z`);
  return Array.from({ length: n }, (_, index) => {
    const day = new Date(first + index * 86_400_000);
    const weekday = day.getUTCDay();
    return {
      date: day.toISOString().slice(0, 10),
      weekday,
      label: `${WEEKDAYS[weekday]} ${day.getUTCDate()}`,
    };
  });
}
