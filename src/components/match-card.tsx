import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Court, Roster } from '@/components/court';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui';
import { levelName, sportById } from '@/constants/sports';
import { SportColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMatchDay, formatPrice, formatTime } from '@/lib/format';
import { placeName, spotsLeft, type MatchListRow } from '@/lib/matches';

const MAX_SPOTS = 16;

export function MatchCard({ match }: { match: MatchListRow }) {
  const theme = useTheme();
  const sport = sportById(match.sport_id);
  const left = spotsLeft(match, match.match_members);
  const full = match.status === 'completo' || left === 0;
  const accepted = match.match_members.filter((member) => member.status === 'aceptado').length;
  const total = Math.min(match.players_needed + 1, MAX_SPOTS);
  // "7:00 p. m." se parte para que la hora grande no desborde junto a la cancha.
  const [, clock, meridiem] = formatTime(new Date(match.starts_at)).match(/^(\S+)\s*(.*)$/) ?? [];

  return (
    <Card onPress={() => router.push(`/partido/${match.id}`)}>
      <View style={styles.top}>
        <View style={styles.when}>
          <ThemedText type="small" style={{ color: SportColors[match.sport_id] }}>
            {sport?.name}
          </ThemedText>
          <ThemedText type="figure">
            {clock}
            {meridiem ? <ThemedText type="small" themeColor="textSecondary">{` ${meridiem}`}</ThemedText> : null}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatMatchDay(match.starts_at)}
          </ThemedText>
        </View>
        <Court sport={match.sport_id} width={96} muted={full} />
      </View>
      <View style={styles.roster}>
        <View style={styles.spots}>
          <Roster sport={match.sport_id} total={total} filled={Math.min(accepted, total)} />
        </View>
        <ThemedText type="smallBold" style={{ color: full ? theme.textSecondary : theme.text }}>
          {full ? 'Completo' : left === 1 ? 'Falta 1' : `Faltan ${left}`}
        </ThemedText>
      </View>
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
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  when: {
    flex: 1,
    gap: Spacing.half,
  },
  roster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginVertical: Spacing.one,
  },
  spots: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
