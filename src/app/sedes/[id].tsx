import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';

import { CourtHoursForm } from '@/components/court-hours-form';
import { ThemedText } from '@/components/themed-text';
import { VenueForm, type VenueValues } from '@/components/venue-form';
import { Button, Card, Checkbox, Chip, ChipRow, EmptyState, ErrorText, Loading, Screen, Section, TextField } from '@/components/ui';
import { SPORTS, sportById } from '@/constants/sports';
import { SportColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BOGOTA_TZ } from '@/lib/bookings';
import { formatMatchDay, formatPesos, formatTime } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Booking, Court, CourtHours, SportId, Venue } from '@/lib/types';

type CourtWithHours = Court & { hours: CourtHours[] };
type VenueBooking = Booking & { court: { name: string }; player: { full_name: string } | null };

const DURATIONS = [30, 60, 90, 120];
const MAX_PRICE = 2_000_000;

export default function VenueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [venue, setVenue] = useState<Venue | null | undefined>(undefined);
  const [courts, setCourts] = useState<CourtWithHours[]>([]);
  const [bookings, setBookings] = useState<VenueBooking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openCourt, setOpenCourt] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [venueResult, courtsResult, bookingsResult] = await Promise.all([
      supabase.from('venues').select('*').eq('id', id).maybeSingle<Venue>(),
      supabase.from('courts').select('*, hours:court_hours(*)').eq('venue_id', id).order('name').returns<CourtWithHours[]>(),
      supabase
        .from('bookings')
        .select('*, court:courts!inner(name, venue_id), player:profiles(full_name)')
        .eq('court.venue_id', id)
        .eq('status', 'confirmada')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at')
        .returns<VenueBooking[]>(),
    ]);
    setError(venueResult.error?.message ?? courtsResult.error?.message ?? bookingsResult.error?.message ?? null);
    setVenue(venueResult.data);
    setCourts(courtsResult.data ?? []);
    setBookings(bookingsResult.data ?? []);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function saveVenue(values: VenueValues) {
    const { error } = await supabase.from('venues').update(values).eq('id', id);
    if (error) return error.message;
    await load();
    return null;
  }

  async function toggleActive(court: CourtWithHours) {
    setWorking(court.id);
    const { error } = await supabase.from('courts').update({ active: !court.active }).eq('id', court.id);
    setWorking(null);
    if (error) setError(error.message);
    await load();
  }

  async function deleteCourt(courtId: string) {
    setWorking(courtId);
    setError(null);
    const { error } = await supabase.from('courts').delete().eq('id', courtId);
    setWorking(null);
    setConfirming(null);
    if (error) setError(error.message);
    await load();
  }

  async function cancelBooking(bookingId: string) {
    setWorking(bookingId);
    setError(null);
    const { error } = await supabase.rpc('cancel_booking', { booking: bookingId });
    setWorking(null);
    setConfirming(null);
    if (error) setError(error.message);
    await load();
  }

  if (venue === undefined) return <Loading />;
  if (venue === null) {
    return (
      <Screen>
        <EmptyState icon="storefront-outline" title="Esta sede no existe" />
        <ErrorText message={error} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ErrorText message={error} />

      <Section title="Datos de la sede">
        <VenueForm initial={venue} submitLabel="Guardar datos" onSubmit={saveVenue} />
      </Section>

      <Section title="Canchas">
        {courts.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            Todavía no tienes canchas en esta sede.
          </ThemedText>
        )}
        {courts.map((court) => {
          const hoursOpen = openCourt === court.id;
          return (
            <Card key={court.id}>
              <ThemedText type="smallBold">{court.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {`${sportById(court.sport_id)?.name ?? court.sport_id} · ${formatPesos(court.price_per_slot)} por turno · ${court.slot_minutes} min`}
              </ThemedText>
              <Checkbox
                label="Recibe reservas"
                checked={court.active}
                onPress={() => toggleActive(court)}
              />
              <Button
                title={hoursOpen ? 'Ocultar horario' : 'Horario semanal'}
                variant="secondary"
                icon="time-outline"
                onPress={() => setOpenCourt(hoursOpen ? null : court.id)}
              />
              {hoursOpen && <CourtHoursForm courtId={court.id} hours={court.hours} onSaved={load} />}
              {confirming === court.id ? (
                <>
                  <ThemedText type="small">¿Eliminar la cancha? Se borran también sus reservas.</ThemedText>
                  <Button
                    title="Sí, eliminar cancha"
                    variant="danger"
                    onPress={() => deleteCourt(court.id)}
                    loading={working === court.id}
                  />
                  <Button
                    title="No, dejarla"
                    variant="secondary"
                    onPress={() => setConfirming(null)}
                    disabled={working === court.id}
                  />
                </>
              ) : (
                <Button
                  title="Eliminar cancha"
                  variant="danger"
                  icon="trash-outline"
                  onPress={() => setConfirming(court.id)}
                />
              )}
            </Card>
          );
        })}
        <Card>
          <ThemedText type="smallBold">Agregar cancha</ThemedText>
          <NewCourtForm venueId={venue.id} sports={venue.sport_ids} onSaved={load} />
        </Card>
      </Section>

      <Section title="Próximas reservas">
        {bookings.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No hay reservas próximas.
          </ThemedText>
        ) : (
          bookings.map((booking) => (
            <Card key={booking.id}>
              <ThemedText type="smallBold">{booking.court.name}</ThemedText>
              <ThemedText>
                {formatMatchDay(booking.starts_at, BOGOTA_TZ)} · {formatTime(new Date(booking.starts_at), BOGOTA_TZ)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {`${booking.player?.full_name ?? 'Jugador'} · ${formatPesos(booking.price)}`}
              </ThemedText>
              <ThemedText type="small" style={{ color: booking.paid_at ? theme.primary : theme.textSecondary }}>
                {booking.paid_at ? 'Pagada' : 'Sin pagar'}
              </ThemedText>
              {confirming === booking.id ? (
                <>
                  <ThemedText type="small">¿Seguro que quieres cancelar esta reserva?</ThemedText>
                  <Button
                    title="Sí, cancelar reserva"
                    variant="danger"
                    onPress={() => cancelBooking(booking.id)}
                    loading={working === booking.id}
                  />
                  <Button
                    title="No, dejarla"
                    variant="secondary"
                    onPress={() => setConfirming(null)}
                    disabled={working === booking.id}
                  />
                </>
              ) : (
                <Button
                  title="Cancelar"
                  variant="danger"
                  icon="close-circle-outline"
                  onPress={() => setConfirming(booking.id)}
                />
              )}
            </Card>
          ))
        )}
      </Section>
    </Screen>
  );
}

/** Alta de cancha: solo ofrece los deportes que se juegan en la sede. */
function NewCourtForm({ venueId, sports, onSaved }: { venueId: string; sports: SportId[]; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [sport, setSport] = useState<SportId | null>(null);
  const [price, setPrice] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const pesos = Number(price);
    if (!name.trim()) {
      setError('Escribe el nombre de la cancha.');
      return;
    }
    if (!sport) {
      setError('Elige el deporte de la cancha.');
      return;
    }
    if (price === '' || pesos > MAX_PRICE) {
      setError('El precio debe estar entre $0 y $2.000.000.');
      return;
    }
    setSaving(true);
    setError(null);
    const { error } = await supabase.from('courts').insert({
      venue_id: venueId,
      name: name.trim(),
      sport_id: sport,
      price_per_slot: pesos,
      slot_minutes: minutes,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setName('');
    setPrice('');
    onSaved();
  }

  return (
    <>
      <TextField label="Nombre" maxLength={60} value={name} onChangeText={setName} />
      <Section title="Deporte">
        <ChipRow>
          {SPORTS.filter((item) => sports.includes(item.id)).map((item) => (
            <Chip
              key={item.id}
              label={item.name}
              color={SportColors[item.id]}
              selected={sport === item.id}
              onPress={() => setSport(item.id)}
            />
          ))}
        </ChipRow>
      </Section>
      <TextField
        label="Precio por turno (pesos)"
        placeholder="Ej: 60000"
        keyboardType="number-pad"
        value={price}
        onChangeText={(text) => setPrice(text.replace(/\D/g, ''))}
      />
      <Section title="Duración del turno">
        <ChipRow>
          {DURATIONS.map((duration) => (
            <Chip key={duration} label={`${duration} min`} selected={minutes === duration} onPress={() => setMinutes(duration)} />
          ))}
        </ChipRow>
      </Section>
      <ErrorText message={error} />
      <Button title="Agregar cancha" icon="add" onPress={save} loading={saving} />
    </>
  );
}
