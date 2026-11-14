import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SportMark } from '@/components/court';
import { ThemedText } from '@/components/themed-text';
import { Avatar, Button, Card, EmptyState, ErrorText, Loading, Screen, Section, TextField } from '@/components/ui';
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
  const [notice, setNotice] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    (async () => {
      const [profileResult, sportsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle<Profile>(),
        supabase.from('user_sports').select('*').eq('user_id', id).returns<UserSport[]>(),
      ]);
      setProfile(profileResult.data);
      const blockResult = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', userId)
        .eq('blocked_id', id)
        .maybeSingle();
      setBlocked(!!blockResult.data);
      setSports(sportsResult.data ?? []);
    })();
  }, [id, userId]);

  async function openChat() {
    setOpening(true);
    setError(null);
    const { data, error } = await supabase.rpc('start_direct_chat', { other_user: id });
    setOpening(false);
    if (error) setError(error.message);
    else router.push(`/chat/${data as string}`);
  }

  async function toggleBlock() {
    setError(null);
    setNotice(null);
    const { error: blockError } = blocked
      ? await supabase.from('blocks').delete().eq('blocker_id', userId).eq('blocked_id', id)
      : await supabase.from('blocks').insert({ blocker_id: userId, blocked_id: id });
    if (blockError) setError(blockError.message);
    else setBlocked(!blocked);
  }

  async function sendReport() {
    setError(null);
    const { error: reportError } = await supabase
      .from('reports')
      .insert({ reporter_id: userId, reported_id: id, reason: reason.trim() });
    if (reportError) {
      setError(reportError.message.includes('reports_reason_check') ? 'Cuéntanos brevemente el motivo.' : reportError.message);
      return;
    }
    setReporting(false);
    setReason('');
    setNotice('Gracias. Revisaremos el reporte.');
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
                <View style={styles.sportRow}>
                  <SportMark sport={row.sport_id} />
                  <ThemedText type="smallBold">
                    {sport?.name} · {levelName(row.level)}
                  </ThemedText>
                </View>
              </Card>
            );
          })
        )}
      </Section>

      <ErrorText message={error} />
      {notice && <ThemedText type="small">{notice}</ThemedText>}
      {id !== userId && (
        <>
          {!blocked && <Button title="Enviar mensaje" icon="chatbubble-outline" onPress={openChat} loading={opening} />}
          <Button
            title={blocked ? 'Desbloquear jugador' : 'Bloquear jugador'}
            variant="secondary"
            icon="ban-outline"
            onPress={toggleBlock}
          />
          {reporting ? (
            <>
              <TextField label="Motivo del reporte" value={reason} onChangeText={setReason} multiline />
              <Button title="Enviar reporte" variant="danger" onPress={sendReport} />
              <Button title="Cancelar" variant="secondary" onPress={() => setReporting(false)} />
            </>
          ) : (
            <Button title="Reportar jugador" variant="danger" icon="flag-outline" onPress={() => setReporting(true)} />
          )}
        </>
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
  sportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
