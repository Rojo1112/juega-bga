import { useFocusEffect } from 'expo-router';
import { useCallback, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, EmptyState, ErrorText, Screen, Section } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { BOGOTA_TZ } from '@/lib/bookings';
import { formatMatchDay, formatPesos, formatTime } from '@/lib/format';
import { useUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { Booking, SportId, Venue } from '@/lib/types';

type BookingRow = Booking & {
  court: { name: string; sport_id: SportId; venue: Pick<Venue, 'name' | 'address'> | null } | null;
};

type Split = { upcoming: BookingRow[]; past: BookingRow[] };

export default function MyBookingsScreen() {
  const theme = useTheme();
  const userId = useUserId();
  const [bookings, setBookings] = useState<Split | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, court:courts(name, sport_id, venue:venues(name, address))')
      .eq('user_id', userId)
      .order('starts_at')
      .returns<BookingRow[]>();
    const now = Date.now();
    const rows = data ?? [];
    const isUpcoming = (row: BookingRow) => row.status === 'confirmada' && new Date(row.starts_at).getTime() > now;
    setError(error?.message ?? null);
    setBookings({
      upcoming: rows.filter(isUpcoming),
      past: rows.filter((row) => !isUpcoming(row)),
    });
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function cancel(bookingId: string) {
    setCancellingId(bookingId);
    setError(null);
    const { error } = await supabase.rpc('cancel_booking', { booking: bookingId });
    setCancellingId(null);
    setConfirmingId(null);
    if (error) setError(error.message);
    await load();
  }

  if (bookings === null) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const total = bookings.upcoming.length + bookings.past.length;

  return (
    <Screen>
      <ErrorText message={error} />

      {total === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="Todavía no tienes reservas"
          message="Cuando reserves una cancha, aparecerá aquí."
        />
      ) : (
        <>
          <Section title="Próximas">
            {bookings.upcoming.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No tienes reservas próximas.
              </ThemedText>
            ) : (
              bookings.upcoming.map((booking) => (
                <BookingItem key={booking.id} booking={booking}>
                  <CancelBooking
                    confirming={confirmingId === booking.id}
                    cancelling={cancellingId === booking.id}
                    onAsk={() => setConfirmingId(booking.id)}
                    onBack={() => setConfirmingId(null)}
                    onConfirm={() => cancel(booking.id)}
                  />
                </BookingItem>
              ))
            )}
          </Section>

          {bookings.past.length > 0 && (
            <Section title="Anteriores o canceladas">
              {bookings.past.map((booking) => (
                <BookingItem key={booking.id} booking={booking} />
              ))}
            </Section>
          )}
        </>
      )}
    </Screen>
  );
}

function BookingItem({ booking, children }: PropsWithChildren<{ booking: BookingRow }>) {
  const theme = useTheme();
  const cancelled = booking.status === 'cancelada';

  return (
    <Card>
      <ThemedText type="smallBold">{booking.court?.venue?.name ?? 'Sede'}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {booking.court?.name ?? 'Cancha'}
      </ThemedText>
      <ThemedText>
        {formatMatchDay(booking.starts_at, BOGOTA_TZ)} · {formatTime(new Date(booking.starts_at), BOGOTA_TZ)}
      </ThemedText>
      <View style={styles.row}>
        <ThemedText type="small" themeColor="textSecondary">
          {formatPesos(booking.price)}
        </ThemedText>
        <ThemedText type="small" style={{ color: cancelled ? theme.danger : theme.textSecondary }}>
          {cancelled ? 'Cancelada' : 'Confirmada'}
        </ThemedText>
      </View>
      {children}
    </Card>
  );
}

/** Cancelación con confirmación en línea, igual que "Eliminar mi cuenta" en el perfil. */
function CancelBooking({
  confirming,
  cancelling,
  onAsk,
  onBack,
  onConfirm,
}: {
  confirming: boolean;
  cancelling: boolean;
  onAsk: () => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  if (!confirming) {
    return <Button title="Cancelar reserva" variant="danger" icon="close-circle-outline" onPress={onAsk} />;
  }
  return (
    <>
      <ThemedText type="small">
        ¿Seguro que quieres cancelar? Solo se puede cancelar hasta 2 horas antes del turno.
      </ThemedText>
      <Button title="Sí, cancelar reserva" variant="danger" onPress={onConfirm} loading={cancelling} />
      <Button title="No, dejarla" variant="secondary" onPress={onBack} disabled={cancelling} />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
