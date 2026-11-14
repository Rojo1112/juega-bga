import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Court } from '@/components/court';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, ChipRow, EmptyState, ErrorText, Loading, Screen } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { BOGOTA_TZ, daySlots, nextDays } from '@/lib/bookings';
import { formatMatchDay, formatPesos, formatTime } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';
import type { Court as CourtRow, CourtHours, Venue } from '@/lib/types';

type CourtDetail = CourtRow & { venue: Venue | null; hours: CourtHours[] };

export default function BookCourtScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [days] = useState(() => nextDays(14));
  const [court, setCourt] = useState<CourtDetail | null | undefined>(undefined);
  const [day, setDay] = useState(days[0]);
  const [busy, setBusy] = useState<{ date: string; turns: { starts_at: string }[] } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from('courts')
      .select('*, venue:venues(*), hours:court_hours(*)')
      .eq('id', id)
      .maybeSingle<CourtDetail>()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError(error.message);
        setCourt(data);
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;
    supabase
      .rpc('court_busy', { court: id, day: day.date })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError(error.message);
        setBusy({ date: day.date, turns: (data as { starts_at: string }[] | null) ?? [] });
      });
    return () => {
      active = false;
    };
  }, [id, day.date, version]);

  if (court === undefined) return <Loading />;
  if (court === null) {
    return (
      <Screen>
        <EmptyState icon="tennisball-outline" title="Esta cancha ya no está disponible" />
        <ErrorText message={error} />
      </Screen>
    );
  }

  const venue = court.venue;
  const hours = court.hours.find((item) => item.weekday === day.weekday);
  const turns = busy?.date === day.date ? busy.turns : null;
  const slots = turns ? daySlots(hours, court.slot_minutes, day.date, turns) : [];
  // Ancho de la tarjeta menos su relleno y borde: pantalla (con tope), margen de 16 y relleno de 16 por lado.
  const courtWidth = Math.min(windowWidth, MaxContentWidth) - Spacing.three * 4 - 2;

  function chooseDay(next: (typeof days)[number]) {
    setDay(next);
    setSelected(null);
    setError(null);
  }

  async function book() {
    if (!selected) return;
    setBooking(true);
    setError(null);
    const { error } = await supabase.rpc('book_court', { court: id, starts: selected });
    setBooking(false);
    setSelected(null);
    setVersion((value) => value + 1);
    if (error) setError(error.message);
    else router.push('/reservas');
  }

  return (
    <Screen>
      <Card>
        <Court sport={court.sport_id} animate width={courtWidth} />
        <ThemedText type="subtitle">{venue?.name ?? 'Sede'}</ThemedText>
        <ThemedText type="smallBold">{court.name}</ThemedText>
        {venue?.address && (
          <ThemedText type="small" themeColor="textSecondary">
            {venue.address}
            {venue.neighborhood ? ` · ${venue.neighborhood}` : ''}
          </ThemedText>
        )}
        {venue?.phone && <ThemedText type="small">Tel. {venue.phone}</ThemedText>}
        <ThemedText type="small" themeColor="textSecondary">
          {`${formatPesos(court.price_per_slot)} por ${court.slot_minutes} min`}
        </ThemedText>
      </Card>

      <ChipRow>
        {days.map((item) => (
          <Chip key={item.date} label={item.label} selected={item.date === day.date} onPress={() => chooseDay(item)} />
        ))}
      </ChipRow>

      <ErrorText message={error} />

      {turns === null ? (
        <ActivityIndicator color={theme.primary} />
      ) : !hours ? (
        <EmptyState icon="moon-outline" title="Este día no abre" />
      ) : (
        <View style={styles.grid}>
          {slots.map((slot) =>
            slot.free ? (
              <Chip
                key={slot.starts}
                label={slot.label}
                selected={selected === slot.starts}
                onPress={() => setSelected(slot.starts)}
              />
            ) : (
              <View
                key={slot.starts}
                accessible
                accessibilityState={{ disabled: true }}
                style={[styles.taken, { borderColor: theme.border }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  {slot.label}
                </ThemedText>
              </View>
            ),
          )}
        </View>
      )}

      {selected && (
        <Card>
          <ThemedText type="smallBold">Tu turno</ThemedText>
          <ThemedText>
            {formatMatchDay(selected, BOGOTA_TZ)} · {formatTime(new Date(selected), BOGOTA_TZ)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {`Duración: ${court.slot_minutes} min`}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {`Precio: ${formatPesos(court.price_per_slot)}`}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Se paga en la cancha
          </ThemedText>
          <Button title="Reservar" icon="checkmark" onPress={book} loading={booking} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  taken: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    opacity: 0.35,
  },
});
