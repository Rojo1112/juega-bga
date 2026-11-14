import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { MatchCard } from '@/components/match-card';
import { ThemedText } from '@/components/themed-text';
import { Button, Chip, ChipRow, EmptyState, ErrorText, Screen } from '@/components/ui';
import { SPORTS } from '@/constants/sports';
import { SportColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MATCH_LIST_SELECT, type MatchListRow } from '@/lib/matches';
import { supabase } from '@/lib/supabase';
import type { SportId } from '@/lib/types';

export default function MatchesScreen() {
  const theme = useTheme();
  const [sport, setSport] = useState<SportId | null>(null);
  const [matches, setMatches] = useState<MatchListRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        let query = supabase
          .from('matches')
          .select(MATCH_LIST_SELECT)
          .neq('status', 'cancelado')
          .gte('starts_at', new Date().toISOString())
          .order('starts_at')
          .limit(50);
        if (sport) query = query.eq('sport_id', sport);
        const { data, error } = await query.returns<MatchListRow[]>();
        if (!active) return;
        setError(error?.message ?? null);
        setMatches(data ?? []);
      })();
      return () => {
        active = false;
      };
    }, [sport]),
  );

  return (
    <Screen>
      <ThemedText themeColor="textSecondary">Partidos próximos en Bucaramanga</ThemedText>
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

      <Button title="Armar partido" icon="add" onPress={() => router.push('/partido/nuevo')} />
      <ErrorText message={error} />

      {matches === null ? (
        <ActivityIndicator color={theme.primary} />
      ) : matches.length === 0 ? (
        <EmptyState
          icon="football-outline"
          title="No hay partidos próximos"
          message="Arma uno y la gente de tu ciudad podrá unirse."
        />
      ) : (
        matches.map((match) => <MatchCard key={match.id} match={match} />)
      )}
    </Screen>
  );
}
