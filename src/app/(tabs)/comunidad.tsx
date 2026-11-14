import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import type { ImagePickerAsset } from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AdBanner } from '@/components/ad-banner';
import { ThemedText } from '@/components/themed-text';
import { Avatar, Button, Card, Chip, ChipRow, EmptyState, ErrorText, Screen, TextField } from '@/components/ui';
import { SPORTS, sportById } from '@/constants/sports';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelative } from '@/lib/format';
import { pickImage, publicImageUrl, uploadImage } from '@/lib/images';
import { useUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { Post, Profile, SportId } from '@/lib/types';

type PostRow = Post & { author: Pick<Profile, 'id' | 'full_name'> | null };

export default function CommunityScreen() {
  const userId = useUserId();
  const theme = useTheme();
  const [sport, setSport] = useState<SportId | null>(null);
  const [posts, setPosts] = useState<PostRow[] | null>(null);
  const [body, setBody] = useState('');
  const [image, setImage] = useState<ImagePickerAsset | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', userId)
      .returns<{ blocked_id: string }[]>()
      .then(({ data }) => setBlockedIds(new Set((data ?? []).map((row) => row.blocked_id))));
  }, [userId]);

  useEffect(() => {
    let active = true;
    let query = supabase
      .from('posts')
      .select('*, author:profiles(id, full_name)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (sport) query = query.eq('sport_id', sport);
    query.returns<PostRow[]>().then(({ data, error }) => {
      if (!active) return;
      setError(error?.message ?? null);
      setPosts(data ?? []);
    });
    return () => {
      active = false;
    };
  }, [sport, version]);

  function chooseSport(id: SportId | null) {
    setSport(id);
    setPosts(null);
  }

  async function publish() {
    if (!body.trim()) return;
    setPublishing(true);
    setError(null);
    try {
      const imagePath = image ? await uploadImage('post-images', userId, image) : null;
      const { error } = await supabase
        .from('posts')
        .insert({ author_id: userId, sport_id: sport, body: body.trim(), image_path: imagePath });
      if (error) throw error;
      setBody('');
      setImage(null);
      setVersion((value) => value + 1);
    } catch (e) {
      setError((e as Error).message);
    }
    setPublishing(false);
  }

  async function removePost(post: PostRow) {
    setDeleting(true);
    setError(null);
    const { error: deleteError } = await supabase.from('posts').delete().eq('id', post.id);
    if (deleteError) {
      setError(deleteError.message);
    } else {
      setPosts((current) => current?.filter((item) => item.id !== post.id) ?? null);
      if (post.image_path) {
        const { error: imageError } = await supabase.storage.from('post-images').remove([post.image_path]);
        if (imageError) setError(imageError.message);
      }
    }
    setConfirmingId(null);
    setDeleting(false);
  }

  const selected = sportById(sport);
  const visiblePosts = (posts ?? []).filter((post) => !blockedIds.has(post.author_id));

  return (
    <Screen>
      <AdBanner placement="comunidad" />
      <ChipRow>
        <Chip label="General" selected={!sport} onPress={() => chooseSport(null)} />
        {SPORTS.map((item) => (
          <Chip
            key={item.id}
            label={`${item.emoji} ${item.name}`}
            selected={sport === item.id}
            onPress={() => chooseSport(item.id)}
          />
        ))}
      </ChipRow>

      <Card>
        <TextField
          placeholder={selected ? `Escribe algo para la comunidad de ${selected.name}` : 'Escribe algo para la comunidad'}
          value={body}
          onChangeText={setBody}
          multiline
        />
        {image && (
          <View>
            <Image source={{ uri: image.uri }} style={styles.preview} contentFit="cover" />
            <Pressable onPress={() => setImage(null)} style={styles.removeImage} accessibilityLabel="Quitar foto">
              <Ionicons name="close-circle" size={28} color={theme.onPrimary} />
            </Pressable>
          </View>
        )}
        <View style={styles.composerActions}>
          <Button title="Foto" icon="image-outline" variant="secondary" onPress={async () => setImage(await pickImage())} />
          <View style={styles.flex}>
            <Button title="Publicar" onPress={publish} loading={publishing} disabled={!body.trim()} />
          </View>
        </View>
      </Card>

      <ErrorText message={error} />

      {posts === null ? (
        <ActivityIndicator color={theme.primary} />
      ) : visiblePosts.length === 0 ? (
        <EmptyState icon="people-outline" title="Aún no hay publicaciones" message="Sé el primero en escribir." />
      ) : (
        visiblePosts.map((post) => {
          const name = post.author?.full_name || 'Jugador';
          const postSport = sportById(post.sport_id);
          return (
            <Card key={post.id}>
              <Pressable onPress={() => router.push(`/jugador/${post.author_id}`)} style={styles.author}>
                <Avatar name={name} size={36} />
                <View style={styles.flex}>
                  <ThemedText type="smallBold">{name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatRelative(post.created_at)}
                    {postSport ? ` · ${postSport.emoji} ${postSport.name}` : ''}
                  </ThemedText>
                </View>
              </Pressable>
              <ThemedText>{post.body}</ThemedText>
              {post.image_path && (
                <Image source={{ uri: publicImageUrl(post.image_path) }} style={styles.postImage} contentFit="cover" />
              )}
              {post.author_id === userId &&
                (confirmingId === post.id ? (
                  <>
                    <ThemedText type="small">¿Eliminar esta publicación? No se puede deshacer.</ThemedText>
                    <Button title="Sí, eliminar" variant="danger" onPress={() => removePost(post)} loading={deleting} />
                    <Button
                      title="Cancelar"
                      variant="secondary"
                      onPress={() => setConfirmingId(null)}
                      disabled={deleting}
                    />
                  </>
                ) : (
                  <Button title="Eliminar" variant="danger" icon="trash-outline" onPress={() => setConfirmingId(post.id)} />
                ))}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  composerActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radius.medium,
  },
  removeImage: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
  },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  postImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radius.medium,
  },
});
