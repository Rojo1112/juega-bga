import { router, Stack, useLocalSearchParams } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar, Button, Card, EmptyState, ErrorText, Loading, Screen, Section } from '@/components/ui';
import { EASYCANCHA_URL, levelName, sportById } from '@/constants/sports';
import { Spacing } from '@/constants/theme';
import { formatMatchDate, formatPrice } from '@/lib/format';
import { MATCH_DETAIL_SELECT, placeName, spotsLeft, type MatchDetailRow } from '@/lib/matches';
import { useUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { MemberStatus } from '@/lib/types';

type Member = MatchDetailRow['match_members'][number];

const MY_STATUS_TEXT: Partial<Record<MemberStatus, string>> = {
  pendiente: 'Pediste unirte. Te avisamos cuando quien convoca te acepte.',
  en_espera: 'Estás en la lista de espera. Si se libera un cupo, pasas a pendiente.',
  rechazado: 'No te aceptaron en este partido.',
};

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();
  const [match, setMatch] = useState<MatchDetailRow | null | undefined>(undefined);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    supabase
      .from('matches')
      .select(MATCH_DETAIL_SELECT)
      .eq('id', id)
      .maybeSingle<MatchDetailRow>()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError(error.message);
        setMatch(data);
      });
    return () => {
      active = false;
    };
  }, [id, version]);

  useEffect(() => {
    // Solicitudes y aceptaciones de otros llegan en vivo.
    const channel = supabase
      .channel(`match-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_members', filter: `match_id=eq.${id}` }, reload)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, reload]);

  async function run(key: string, action: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(key);
    setError(null);
    const { error } = await action();
    if (error) setError(error.message);
    reload();
    setBusy(null);
  }

  async function openChat() {
    const { data, error } = await supabase
      .from('conversations')
      .select('id')
      .eq('match_id', id)
      .maybeSingle<{ id: string }>();
    if (error || !data) setError(error?.message ?? 'No encontramos el chat del partido.');
    else router.push(`/chat/${data.id}`);
  }

  if (match === undefined) return <Loading />;
  if (match === null) {
    return (
      <Screen>
        <EmptyState icon="football-outline" title="Este partido ya no existe" />
      </Screen>
    );
  }

  const sport = sportById(match.sport_id);
  const members = match.match_members;
  const me = members.find((member) => member.user_id === userId);
  const isCreator = match.creator_id === userId;
  const accepted = members.filter((member) => member.status === 'aceptado');
  const pending = members.filter((member) => member.status === 'pendiente');
  const waitlist = members.filter((member) => member.status === 'en_espera');
  const left = spotsLeft(match, members);
  const cancelled = match.status === 'cancelado';
  const bookingUrl = match.venue?.easycancha_url ?? EASYCANCHA_URL;

  const join = () =>
    run('join', () =>
      supabase.from('match_members').insert({
        match_id: id,
        user_id: userId,
        status: match.status === 'completo' ? 'en_espera' : 'pendiente',
      }),
    );
  const leave = () =>
    run('leave', () => supabase.from('match_members').delete().eq('match_id', id).eq('user_id', userId));
  const decide = (member: Member, status: 'aceptado' | 'rechazado') =>
    run(`${member.user_id}-${status}`, () =>
      supabase.from('match_members').update({ status }).eq('match_id', id).eq('user_id', member.user_id),
    );
  const cancel = () =>
    run('cancel', () => supabase.from('matches').update({ status: 'cancelado' }).eq('id', id));

  return (
    <Screen>
      <Stack.Screen options={{ title: sport ? `${sport.emoji} ${sport.name}` : 'Partido' }} />

      <Card>
        <ThemedText type="subtitle" style={styles.date}>
          {formatMatchDate(match.starts_at)}
        </ThemedText>
        <ThemedText>{placeName(match)}</ThemedText>
        {match.venue?.address && (
          <ThemedText type="small" themeColor="textSecondary">
            {match.venue.address}
            {match.venue.neighborhood ? ` · ${match.venue.neighborhood}` : ''}
          </ThemedText>
        )}
        <ThemedText type="small" themeColor="textSecondary">
          {formatPrice(match.price_per_player)} · {levelName(match.level)}
        </ThemedText>
        <ThemedText type="smallBold">
          {cancelled ? 'Partido cancelado' : left === 0 ? 'Completo' : left === 1 ? 'Falta 1 jugador' : `Faltan ${left} jugadores`}
        </ThemedText>
        {match.notes && <ThemedText type="small">{match.notes}</ThemedText>}
      </Card>

      <ErrorText message={error} />

      {!cancelled && (
        <View style={styles.actions}>
          {!me && (
            <Button
              title={match.status === 'completo' ? 'Entrar a la lista de espera' : 'Pedir unirme'}
              icon="hand-right-outline"
              onPress={join}
              loading={busy === 'join'}
            />
          )}
          {me && me.status !== 'aceptado' && (
            <>
              <ThemedText type="small">{MY_STATUS_TEXT[me.status]}</ThemedText>
              {me.status !== 'rechazado' && (
                <Button title="Cancelar solicitud" variant="secondary" onPress={leave} loading={busy === 'leave'} />
              )}
            </>
          )}
          {me?.status === 'aceptado' && (
            <Button title="Ir al chat del partido" icon="chatbubbles-outline" onPress={openChat} />
          )}
          <Button
            title="Reservar en EasyCancha"
            icon="calendar-outline"
            variant="secondary"
            onPress={() => openBrowserAsync(bookingUrl)}
          />
          {me?.status === 'aceptado' && !isCreator && (
            <Button title="Salirme del partido" variant="danger" onPress={leave} loading={busy === 'leave'} />
          )}
        </View>
      )}

      {isCreator && !cancelled && (
        <Section title={`Solicitudes (${pending.length})`}>
          {pending.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Nadie ha pedido unirse todavía.
            </ThemedText>
          ) : (
            pending.map((member) => (
              <Card key={member.user_id}>
                <PlayerRow member={member} />
                <View style={styles.decision}>
                  <View style={styles.flex}>
                    <Button
                      title="Aceptar"
                      icon="checkmark"
                      onPress={() => decide(member, 'aceptado')}
                      loading={busy === `${member.user_id}-aceptado`}
                      disabled={left === 0}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Button
                      title="Rechazar"
                      variant="secondary"
                      onPress={() => decide(member, 'rechazado')}
                      loading={busy === `${member.user_id}-rechazado`}
                    />
                  </View>
                </View>
              </Card>
            ))
          )}
        </Section>
      )}

      <Section title={`Jugadores confirmados (${accepted.length})`}>
        {accepted.map((member) => (
          <PlayerRow key={member.user_id} member={member} creator={member.user_id === match.creator_id} />
        ))}
      </Section>

      {waitlist.length > 0 && (
        <Section title={`Lista de espera (${waitlist.length})`}>
          {waitlist.map((member) => (
            <PlayerRow key={member.user_id} member={member} />
          ))}
        </Section>
      )}

      {isCreator && !cancelled && (
        <Button title="Cancelar partido" variant="danger" onPress={cancel} loading={busy === 'cancel'} />
      )}
    </Screen>
  );
}

function PlayerRow({ member, creator }: { member: Member; creator?: boolean }) {
  const name = member.profile?.full_name || 'Jugador';
  return (
    <Pressable onPress={() => router.push(`/jugador/${member.user_id}`)} style={styles.player}>
      <Avatar name={name} />
      <ThemedText style={styles.flex}>{name}</ThemedText>
      {creator && (
        <ThemedText type="small" themeColor="textSecondary">
          Convoca
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  date: {
    fontSize: 24,
    lineHeight: 30,
    textTransform: 'capitalize',
  },
  actions: {
    gap: Spacing.two,
  },
  decision: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
});
