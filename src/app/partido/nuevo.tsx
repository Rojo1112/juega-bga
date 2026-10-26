import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Chip, ChipRow, ErrorText, Screen, Section, TextField } from '@/components/ui';
import { LEVELS, SPORTS, sportById } from '@/constants/sports';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { SkillLevel, SportId, Venue } from '@/lib/types';

const OTHER_PLACE = 'otro';

// Horarios de 6:00 a. m. a 10:00 p. m., cada media hora.
const TIMES = Array.from({ length: 33 }, (_, index) => ({
  hour: 6 + Math.floor(index / 2),
  minute: index % 2 === 0 ? 0 : 30,
}));

function nextDays(count: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() + index);
    return day;
  });
}

function dayLabel(day: Date, index: number) {
  if (index === 0) return 'Hoy';
  if (index === 1) return 'Mañana';
  return day.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
}

function timeLabel({ hour, minute }: { hour: number; minute: number }) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
}

export default function NewMatchScreen() {
  const userId = useUserId();
  const days = useMemo(() => nextDays(14), []);

  const [sport, setSport] = useState<SportId>('futbol');
  const [dayIndex, setDayIndex] = useState(0);
  const [timeIndex, setTimeIndex] = useState(26); // 7:00 p. m.
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueId, setVenueId] = useState<string>(OTHER_PLACE);
  const [placeText, setPlaceText] = useState('');
  const [spots, setSpots] = useState(SPORTS[0].defaultPlayers - 1);
  const [level, setLevel] = useState<SkillLevel | null>(null);
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('venues')
      .select('*')
      .order('name')
      .returns<Venue[]>()
      .then(({ data }) => setVenues(data ?? []));
  }, []);

  const sportVenues = venues.filter((venue) => venue.sport_ids.includes(sport));

  function chooseSport(id: SportId) {
    setSport(id);
    setSpots((sportById(id)?.defaultPlayers ?? 2) - 1);
    setVenueId(OTHER_PLACE);
  }

  async function create() {
    setError(null);
    const startsAt = new Date(days[dayIndex]);
    startsAt.setHours(TIMES[timeIndex].hour, TIMES[timeIndex].minute, 0, 0);
    if (startsAt.getTime() < Date.now()) {
      setError('Esa hora ya pasó. Elige otra.');
      return;
    }
    if (venueId === OTHER_PLACE && placeText.trim().length < 3) {
      setError('Escribe dónde se juega o elige una cancha.');
      return;
    }
    const pricePerPlayer = Number(price.replace(/\D/g, '') || '0');

    setSaving(true);
    const { data, error } = await supabase
      .from('matches')
      .insert({
        creator_id: userId,
        sport_id: sport,
        venue_id: venueId === OTHER_PLACE ? null : venueId,
        place_text: venueId === OTHER_PLACE ? placeText.trim() : null,
        starts_at: startsAt.toISOString(),
        players_needed: spots,
        price_per_player: pricePerPlayer,
        level,
        notes: notes.trim() || null,
      })
      .select('id')
      .single<{ id: string }>();
    setSaving(false);
    if (error) setError(error.message);
    else router.replace(`/partido/${data.id}`);
  }

  return (
    <Screen>
      <Section title="Deporte">
        <ChipRow>
          {SPORTS.map((item) => (
            <Chip
              key={item.id}
              label={`${item.emoji} ${item.name}`}
              selected={sport === item.id}
              onPress={() => chooseSport(item.id)}
            />
          ))}
        </ChipRow>
      </Section>

      <Section title="Día">
        <ChipRow>
          {days.map((day, index) => (
            <Chip
              key={day.toISOString()}
              label={dayLabel(day, index)}
              selected={dayIndex === index}
              onPress={() => setDayIndex(index)}
            />
          ))}
        </ChipRow>
      </Section>

      <Section title="Hora">
        <ChipRow>
          {TIMES.map((time, index) => (
            <Chip
              key={`${time.hour}:${time.minute}`}
              label={timeLabel(time)}
              selected={timeIndex === index}
              onPress={() => setTimeIndex(index)}
            />
          ))}
        </ChipRow>
      </Section>

      <Section title="Cancha">
        <ChipRow>
          {sportVenues.map((venue) => (
            <Chip
              key={venue.id}
              label={venue.name}
              selected={venueId === venue.id}
              onPress={() => setVenueId(venue.id)}
            />
          ))}
          <Chip label="Otro lugar" selected={venueId === OTHER_PLACE} onPress={() => setVenueId(OTHER_PLACE)} />
        </ChipRow>
        {venueId === OTHER_PLACE && (
          <TextField placeholder="Nombre de la cancha y barrio" value={placeText} onChangeText={setPlaceText} />
        )}
      </Section>

      <Section title="Jugadores que faltan">
        <View style={styles.stepper}>
          <StepButton label="−" onPress={() => setSpots((value) => Math.max(1, value - 1))} />
          <ThemedText type="subtitle" style={styles.spots}>
            {spots}
          </ThemedText>
          <StepButton label="+" onPress={() => setSpots((value) => Math.min(30, value + 1))} />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Sin contarte a ti.
        </ThemedText>
      </Section>

      <Section title="Nivel">
        <ChipRow>
          <Chip label="Cualquiera" selected={!level} onPress={() => setLevel(null)} />
          {LEVELS.map((item) => (
            <Chip key={item.id} label={item.name} selected={level === item.id} onPress={() => setLevel(item.id)} />
          ))}
        </ChipRow>
      </Section>

      <TextField
        label="Costo por persona (pesos)"
        placeholder="0 si es gratis"
        value={price}
        onChangeText={setPrice}
        keyboardType="number-pad"
      />
      <TextField
        label="Notas"
        placeholder="Ej: traer petos oscuros, cancha sintética"
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <ErrorText message={error} />
      <Button title="Publicar partido" icon="megaphone-outline" onPress={create} loading={saving} />
    </Screen>
  );
}

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.stepButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText type="subtitle" style={styles.stepLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  spots: {
    minWidth: 40,
    textAlign: 'center',
  },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: Radius.medium,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 24,
    lineHeight: 28,
  },
});
