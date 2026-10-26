import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar, Button, Card, EmptyState, ErrorText, Loading, Screen, Section } from '@/components/ui';
import { levelName, sportById } from '@/constants/sports';
import { Spacing } from '@/constants/theme';
import { useUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { Profile, UserSport } from '@/lib/types';

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [sports, setSports] = useState<UserSport[]>([]);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [profileResult, sportsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle<Profile>(),
        supabase.from('user_sports').select('*').eq('user_id', id).returns<UserSport[]>(),
      ]);
      setProfile(profileResult.data);
      setSports(sportsResult.data ?? []);
    })();
  }, [id]);

  async function openChat() {
    setOpening(true);
    setError(null);
    const { data, error } = await supabase.rpc('start_direct_chat', { other_user: id });
    setOpening(false);
    if (error) setError(error.message);
    else router.push(`/chat/${data as string}`);
  }

  if (profile === undefined) return <Loading />;
  if (profile === null) {
    return (
      <Screen>
        <EmptyState icon="person-outline" title="No encontramos a este jugador" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: profile.full_name || 'Jugador' }} />
      <View style={styles.header}>
        <Avatar name={profile.full_name || '?'} size={72} />
        <View style={styles.headerText}>
          <ThemedText type="subtitle" style={styles.name}>
            {profile.full_name || 'Sin nombre'}
          </ThemedText>
          {profile.neighborhood && (
            <ThemedText type="small" themeColor="textSecondary">
              {profile.neighborhood}
            </ThemedText>
          )}
        </View>
      </View>

      {profile.bio && <ThemedText>{profile.bio}</ThemedText>}

      <Section title="Deportes">
        {sports.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Todavía no ha elegido deportes.
          </ThemedText>
        ) : (
          sports.map((row) => {
            const sport = sportById(row.sport_id);
            return (
              <Card key={row.sport_id}>
                <ThemedText type="smallBold">
                  {sport?.emoji} {sport?.name} · {levelName(row.level)}
                </ThemedText>
              </Card>
            );
          })
        )}
      </Section>

      <ErrorText message={error} />
      {id !== userId && (
        <Button title="Enviar mensaje" icon="chatbubble-outline" onPress={openChat} loading={opening} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    lineHeight: 30,
  },
});
