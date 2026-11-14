import { Image } from 'expo-image';
import { openBrowserAsync } from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Ad, AdPlacement } from '@/lib/types';

/** Publicidad propia. La RLS ya entrega solo los anuncios vigentes. */
export function AdBanner({ placement }: { placement: AdPlacement }) {
  const [ad, setAd] = useState<Ad | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from('ads')
      .select('id, title, image_url, link_url, placement')
      .eq('placement', placement)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<Ad>()
      .then(({ data, error }) => {
        if (active && !error) setAd(data);
      });
    return () => {
      active = false;
    };
  }, [placement]);

  if (!ad) return null;

  const content = (
    <View style={styles.card}>
      <Image
        source={{ uri: ad.image_url }}
        style={styles.image}
        contentFit="cover"
        accessibilityLabel={ad.title}
      />
      <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
        Publicidad
      </ThemedText>
    </View>
  );

  if (!ad.link_url) return content;
  const link = ad.link_url;
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={ad.title} onPress={() => openBrowserAsync(link)}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  image: {
    width: '100%',
    aspectRatio: 3,
  },
  label: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.small,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
});
