const locale = 'es-CO';

export function formatMatchDate(iso: string) {
  return `${formatMatchDay(iso)} · ${formatTime(new Date(iso))}`;
}

export function formatMatchDay(iso: string) {
  return new Date(iso).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
}

export function formatPrice(pesos: number) {
  if (pesos === 0) return 'Gratis';
  return `$${pesos.toLocaleString(locale)} por persona`;
}

export function formatRelative(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}
