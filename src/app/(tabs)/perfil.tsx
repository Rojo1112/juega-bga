import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar, Button, Chip, ChipRow, ErrorText, Loading, Screen, Section, TextField } from '@/components/ui';
import { LEVELS, SPORTS } from '@/constants/sports';
import { Spacing } from '@/constants/theme';
import { useSession, useUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { Profile, SkillLevel, SportId, UserSport } from '@/lib/types';

type Levels = Partial<Record<SportId, SkillLevel>>;

export default function ProfileScreen() {
  const userId = useUserId();
  const { session } = useSession();
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [bio, setBio] = useState('');
  const [levels, setLevels] = useState<Levels>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [profileResult, sportsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single<Profile>(),
        supabase.from('user_sports').select('*').eq('user_id', userId).returns<UserSport[]>(),
      ]);
      if (profileResult.data) {
        setName(profileResult.data.full_name);
        setNeighborhood(profileResult.data.neighborhood ?? '');
        setBio(profileResult.data.bio ?? '');
      }
      setLevels(Object.fromEntries((sportsResult.data ?? []).map((row) => [row.sport_id, row.level])));
      setLoaded(true);
    })();
  }, [userId]);

  function setLevel(sport: SportId, level: SkillLevel | null) {
    setSaved(false);
    setLevels((current) => {
      const next = { ...current };
      if (level) next[sport] = level;
      else delete next[sport];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: name.trim(), neighborhood: neighborhood.trim() || null, bio: bio.trim() || null })
      .eq('id', userId);
    const { error: deleteError } = await supabase.from('user_sports').delete().eq('user_id', userId);
    const rows = Object.entries(levels).map(([sport_id, level]) => ({ user_id: userId, sport_id, level }));
    const { error: insertError } = rows.length
      ? await supabase.from('user_sports').insert(rows)
      : { error: null };
    const firstError = profileError ?? deleteError ?? insertError;
    if (firstError) setError(firstError.message);
    else setSaved(true);
    setSaving(false);
  }

  if (!loaded) return <Loading />;

  return (
    <Screen>
      <View style={styles.header}>
        <Avatar name={name || '?'} size={64} />
        <View style={styles.headerText}>
          <ThemedText type="smallBold">{name || 'Sin nombre'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {session?.user.email}
          </ThemedText>
        </View>
      </View>

      <TextField label="Nombre" value={name} onChangeText={(text) => (setName(text), setSaved(false))} />
      <TextField
        label="Barrio"
        placeholder="Ej: Cabecera, Sotomayor, Floridablanca"
        value={neighborhood}
        onChangeText={(text) => (setNeighborhood(text), setSaved(false))}
      />
      <TextField
        label="Sobre mí"
        placeholder="Posición, horarios en que puedes jugar..."
        value={bio}
        onChangeText={(text) => (setBio(text), setSaved(false))}
        multiline
      />

      <Section title="Mis deportes y nivel">
        {SPORTS.map((sport) => (
          <View key={sport.id} style={styles.sport}>
            <ThemedText type="smallBold">
              {sport.emoji} {sport.name}
            </ThemedText>
            <ChipRow>
              <Chip label="No juego" selected={!levels[sport.id]} onPress={() => setLevel(sport.id, null)} />
              {LEVELS.map((level) => (
                <Chip
                  key={level.id}
                  label={level.name}
                  selected={levels[sport.id] === level.id}
                  onPress={() => setLevel(sport.id, level.id)}
                />
              ))}
            </ChipRow>
          </View>
        ))}
      </Section>

      <ErrorText message={error} />
      <Button title={saved ? 'Guardado' : 'Guardar perfil'} icon={saved ? 'checkmark' : undefined} onPress={save} loading={saving} />
      <Button title="Cerrar sesión" variant="secondary" icon="log-out-outline" onPress={() => supabase.auth.signOut()} />
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
  sport: {
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
});
