import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui';
import { levelName, sportById } from '@/constants/sports';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMatchDate, formatPrice } from '@/lib/format';
import { placeName, spotsLeft, type MatchListRow } from '@/lib/matches';

export function MatchCard({ match }: { match: MatchListRow }) {
  const theme = useTheme();
  const sport = sportById(match.sport_id);
  const left = spotsLeft(match, match.match_members);
  const full = match.status === 'completo' || left === 0;

  return (
    <Card onPress={() => router.push(`/partido/${match.id}`)}>
      <View style={styles.top}>
        <ThemedText type="smallBold">
          {sport?.emoji} {sport?.name}
        </ThemedText>
        <View style={[styles.badge, { backgroundColor: full ? theme.backgroundSelected : theme.primarySoft }]}>
          <ThemedText type="smallBold" style={{ color: full ? theme.textSecondary : theme.primary }}>
            {full ? 'Completo' : left === 1 ? 'Falta 1' : `Faltan ${left}`}
          </ThemedText>
        </View>
      </View>
      <ThemedText type="default">{formatMatchDate(match.starts_at)}</ThemedText>
      <Row icon="location-outline" text={placeName(match)} />
      <Row icon="cash-outline" text={formatPrice(match.price_per_player)} />
      <Row icon="stats-chart-outline" text={levelName(match.level)} />
      <ThemedText type="small" themeColor="textSecondary">
        Convoca {match.creator?.full_name || 'alguien'}
      </ThemedText>
    </Card>
  );
}

function Row({ icon, text }: { icon: 'location-outline' | 'cash-outline' | 'stats-chart-outline'; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={theme.textSecondary} />
      <ThemedText type="small" themeColor="textSecondary">
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
