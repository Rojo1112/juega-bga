import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { VenueForm, type VenueValues } from '@/components/venue-form';
import { Button, Card, EmptyState, ErrorText, Loading, Screen } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { Venue } from '@/lib/types';

export default function MyVenuesScreen() {
  const theme = useTheme();
  const userId = useUserId();
  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('owner_id', userId)
      .order('name')
      .returns<Venue[]>();
    setError(error?.message ?? null);
    setVenues(data ?? []);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function createVenue(values: VenueValues) {
    const { error } = await supabase.from('venues').insert({ ...values, owner_id: userId });
    if (error) return error.message;
    setCreating(false);
    setCreated(true);
    await load();
    return null;
  }

  if (venues === null) return <Loading />;

  return (
    <Screen>
      <ErrorText message={error} />

      {created && (
        <ThemedText type="small" themeColor="textSecondary">
          Tu sede queda en revisión. Podrás recibir reservas cuando sea aprobada.
        </ThemedText>
      )}

      {venues.length === 0 ? (
        <EmptyState
          icon="storefront-outline"
          title="Todavía no tienes sedes"
          message="Registra tu sede para administrar sus canchas y horarios."
        />
      ) : (
        venues.map((venue) => (
          <Card key={venue.id} onPress={() => router.push(`/sedes/${venue.id}`)}>
            <ThemedText type="smallBold">{venue.name}</ThemedText>
            {venue.address && (
              <ThemedText type="small" themeColor="textSecondary">
                {venue.address}
                {venue.neighborhood ? ` · ${venue.neighborhood}` : ''}
              </ThemedText>
            )}
            <ThemedText type="small" style={{ color: venue.approved ? theme.primary : theme.textSecondary }}>
              {venue.approved ? 'Aprobada' : 'En revisión'}
            </ThemedText>
          </Card>
        ))
      )}

      {creating ? (
        <Card>
          <ThemedText type="smallBold">Registrar una sede</ThemedText>
          <VenueForm submitLabel="Registrar sede" onSubmit={createVenue} />
          <Button title="Cancelar" variant="secondary" onPress={() => setCreating(false)} />
        </Card>
      ) : (
        <Button
          title="Registrar una sede"
          icon="add"
          onPress={() => {
            setCreated(false);
            setCreating(true);
          }}
        />
      )}
    </Screen>
  );
}
