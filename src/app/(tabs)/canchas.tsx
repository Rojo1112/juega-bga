import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AdBanner } from '@/components/ad-banner';
import { Court } from '@/components/court';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, ChipRow, EmptyState, ErrorText, Screen } from '@/components/ui';
import { SPORTS, sportById } from '@/constants/sports';
import { SportColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPesos } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Court as CourtRow, SportId, Venue } from '@/lib/types';

type CourtListRow = CourtRow & { venue: Venue | null };

export default function CourtsScreen() {
  const theme = useTheme();
  const [sport, setSport] = useState<SportId | null>(null);
  const [courts, setCourts] = useState<CourtListRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        let query = supabase.from('courts').select('*, venue:venues(*)').eq('active', true).order('name');
        if (sport) query = query.eq('sport_id', sport);
        const { data, error } = await query.returns<CourtListRow[]>();
        if (!active) return;
        setError(error?.message ?? null);
        setCourts(data ?? []);
      })();
      return () => {
        active = false;
      };
    }, [sport]),
  );

  return (
    <Screen>
      <AdBanner placement="canchas" />
      <Button title="Mis reservas" icon="calendar-outline" variant="secondary" onPress={() => router.push('/reservas')} />
      <ChipRow>
        <Chip label="Todos" selected={!sport} onPress={() => setSport(null)} />
        {SPORTS.map((item) => (
          <Chip
            key={item.id}
            label={item.name}
            color={SportColors[item.id]}
            selected={sport === item.id}
            onPress={() => setSport(item.id)}
          />
        ))}
      </ChipRow>

      <ErrorText message={error} />

      {courts === null ? (
        <ActivityIndicator color={theme.primary} />
      ) : courts.length === 0 ? (
        <EmptyState icon="tennisball-outline" title="Todavía no hay canchas para reservar" />
      ) : (
        courts.map((court) => <CourtCard key={court.id} court={court} />)
      )}
    </Screen>
  );
}

function CourtCard({ court }: { court: CourtListRow }) {
  const sport = sportById(court.sport_id);
  return (
    <Card onPress={() => router.push(`/cancha/${court.id}`)}>
      <View style={styles.top}>
        <View style={styles.info}>
          <ThemedText type="small" style={{ color: SportColors[court.sport_id] }}>
            {sport?.name}
          </ThemedText>
          <ThemedText type="subtitle">{court.venue?.name ?? 'Sede'}</ThemedText>
          <ThemedText type="smallBold">{court.name}</ThemedText>
          {court.venue?.neighborhood && (
            <ThemedText type="small" themeColor="textSecondary">
              {court.venue.neighborhood}
            </ThemedText>
          )}
          <ThemedText type="small">
            {`${formatPesos(court.price_per_slot)} por ${court.slot_minutes} min`}
          </ThemedText>
        </View>
        <Court sport={court.sport_id} width={96} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  info: {
    flex: 1,
    gap: Spacing.half,
  },
});
