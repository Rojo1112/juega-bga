import type { ImagePickerAsset } from 'expo-image-picker';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, ChipRow, EmptyState, ErrorText, Loading, Screen, Section, TextField } from '@/components/ui';
import { sportById } from '@/constants/sports';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { nextDays } from '@/lib/bookings';
import { pickImage } from '@/lib/images';
import { supabase } from '@/lib/supabase';
import type { Ad, AdPlacement, Venue } from '@/lib/types';

type AdRow = Ad & { starts_on: string; ends_on: string };

const PLACEMENTS: { id: AdPlacement; name: string }[] = [
  { id: 'inicio', name: 'Inicio' },
  { id: 'canchas', name: 'Canchas' },
  { id: 'comunidad', name: 'Comunidad' },
];

export default function AdminScreen() {
  const theme = useTheme();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [ads, setAds] = useState<AdRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: admin, error: adminError } = await supabase.rpc('is_admin');
    const allowed = !adminError && admin === true;
    setIsAdmin(allowed);
    if (!allowed) return;
    const [venuesResult, adsResult] = await Promise.all([
      supabase.from('venues').select('*').order('name').returns<Venue[]>(),
      supabase.from('ads').select('*').order('created_at', { ascending: false }).returns<AdRow[]>(),
    ]);
    setError(venuesResult.error?.message ?? adsResult.error?.message ?? null);
    setVenues(venuesResult.data ?? []);
    setAds(adsResult.data ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function setApproval(venue: string, ok: boolean) {
    setWorking(venue);
    setError(null);
    const { error } = await supabase.rpc('approve_venue', { venue, ok });
    setWorking(null);
    setConfirming(null);
    if (error) setError(error.message);
    await load();
  }

  async function deleteAd(ad: AdRow) {
    setWorking(ad.id);
    setError(null);
    const { error } = await supabase.from('ads').delete().eq('id', ad.id);
    let failure = error?.message ?? null;
    const imagePath = ad.image_url.split('/ad-images/')[1];
    if (!error && imagePath) {
      const { error: removeError } = await supabase.storage.from('ad-images').remove([imagePath]);
      failure = removeError?.message ?? null;
    }
    setWorking(null);
    setConfirming(null);
    setError(failure);
    await load();
  }

  if (isAdmin === null) return <Loading />;
  if (!isAdmin) {
    return (
      <Screen>
        <EmptyState icon="lock-closed-outline" title="Esta sección es solo para administradores" />
      </Screen>
    );
  }

  const pending = venues.filter((venue) => !venue.approved);
  const approved = venues.filter((venue) => venue.approved);
  const today = nextDays(1)[0].date;

  return (
    <Screen>
      <ErrorText message={error} />

      <Section title="Sedes por aprobar">
        {pending.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            No hay sedes esperando aprobación.
          </ThemedText>
        )}
        {pending.map((venue) => (
          <Card key={venue.id}>
            <VenueSummary venue={venue} />
            <Button
              title="Aprobar"
              icon="checkmark"
              onPress={() => setApproval(venue.id, true)}
              loading={working === venue.id}
            />
          </Card>
        ))}
      </Section>

      <Section title="Sedes aprobadas">
        {approved.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            Todavía no hay sedes aprobadas.
          </ThemedText>
        )}
        {approved.map((venue) => (
          <Card key={venue.id}>
            <VenueSummary venue={venue} />
            {confirming === venue.id ? (
              <>
                <ThemedText type="small">
                  La sede dejará de verse para los jugadores y de recibir reservas. ¿Seguro?
                </ThemedText>
                <Button
                  title="Sí, retirar aprobación"
                  variant="danger"
                  onPress={() => setApproval(venue.id, false)}
                  loading={working === venue.id}
                />
                <Button
                  title="No, dejarla"
                  variant="secondary"
                  onPress={() => setConfirming(null)}
                  disabled={working === venue.id}
                />
              </>
            ) : (
              <Button
                title="Retirar aprobación"
                variant="danger"
                icon="close-circle-outline"
                onPress={() => setConfirming(venue.id)}
              />
            )}
          </Card>
        ))}
      </Section>

      <Section title="Anuncios">
        {ads.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            Todavía no hay anuncios.
          </ThemedText>
        )}
        {ads.map((ad) => {
          const live = ad.starts_on <= today && ad.ends_on >= today;
          return (
            <Card key={ad.id}>
              <ThemedText type="smallBold">{ad.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {`${PLACEMENTS.find((item) => item.id === ad.placement)?.name ?? ad.placement} · ${ad.starts_on} a ${ad.ends_on}`}
              </ThemedText>
              <ThemedText type="small" style={{ color: live ? theme.primary : theme.textSecondary }}>
                {live ? 'Vigente' : 'No vigente'}
              </ThemedText>
              {confirming === ad.id ? (
                <>
                  <ThemedText type="small">¿Eliminar el anuncio y su imagen?</ThemedText>
                  <Button
                    title="Sí, eliminar anuncio"
                    variant="danger"
                    onPress={() => deleteAd(ad)}
                    loading={working === ad.id}
                  />
                  <Button
                    title="No, dejarlo"
                    variant="secondary"
                    onPress={() => setConfirming(null)}
                    disabled={working === ad.id}
                  />
                </>
              ) : (
                <Button
                  title="Eliminar"
                  variant="danger"
                  icon="trash-outline"
                  onPress={() => setConfirming(ad.id)}
                />
              )}
            </Card>
          );
        })}
      </Section>

      <NewAdForm onSaved={load} />
    </Screen>
  );
}

function VenueSummary({ venue }: { venue: Venue }) {
  return (
    <>
      <ThemedText type="smallBold">{venue.name}</ThemedText>
      {venue.address && (
        <ThemedText type="small" themeColor="textSecondary">
          {venue.address}
          {venue.neighborhood ? ` · ${venue.neighborhood}` : ''}
        </ThemedText>
      )}
      {venue.phone && <ThemedText type="small">Tel. {venue.phone}</ThemedText>}
      <ThemedText type="small" themeColor="textSecondary">
        {venue.sport_ids.map((id) => sportById(id)?.name ?? id).join(', ') || 'Sin deportes'}
      </ThemedText>
    </>
  );
}

/** AAAA-MM-DD real. */
function isDate(value: string) {
  const time = Date.parse(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
}

function NewAdForm({ onSaved }: { onSaved: () => void }) {
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [placement, setPlacement] = useState<AdPlacement>('inicio');
  const [startsOn, setStartsOn] = useState(() => nextDays(1)[0].date);
  const [endsOn, setEndsOn] = useState('');
  const [image, setImage] = useState<ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!title.trim()) {
      setError('Escribe el título del anuncio.');
      return;
    }
    if (link.trim() && !link.trim().startsWith('https://')) {
      setError('El enlace debe empezar por https://');
      return;
    }
    if (!isDate(startsOn) || !isDate(endsOn)) {
      setError('Escribe las fechas como AAAA-MM-DD, por ejemplo 2026-12-01.');
      return;
    }
    if (endsOn < startsOn) {
      setError('La fecha de fin debe ser igual o posterior a la de inicio.');
      return;
    }
    if (!image) {
      setError('Elige una imagen para el anuncio.');
      return;
    }

    setSaving(true);
    setError(null);
    const path = `${Date.now()}.${(image.mimeType ?? 'image/jpeg').split('/')[1]}`;
    const body = await (await fetch(image.uri)).arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('ad-images')
      .upload(path, body, { contentType: image.mimeType ?? 'image/jpeg' });
    if (uploadError) {
      setSaving(false);
      setError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from('ad-images').getPublicUrl(path);
    const { error: insertError } = await supabase.from('ads').insert({
      title: title.trim(),
      link_url: link.trim() || null,
      placement,
      starts_on: startsOn,
      ends_on: endsOn,
      image_url: data.publicUrl,
    });
    setSaving(false);
    if (insertError) {
      await supabase.storage.from('ad-images').remove([path]);
      setError(insertError.message);
      return;
    }
    setTitle('');
    setLink('');
    setEndsOn('');
    setImage(null);
    onSaved();
  }

  return (
    <Card>
      <ThemedText type="smallBold">Nuevo anuncio</ThemedText>
      <TextField label="Título" maxLength={80} value={title} onChangeText={setTitle} />
      <TextField
        label="Enlace (opcional)"
        placeholder="https://..."
        autoCapitalize="none"
        keyboardType="url"
        value={link}
        onChangeText={setLink}
      />
      <Section title="Ubicación">
        <ChipRow>
          {PLACEMENTS.map((item) => (
            <Chip key={item.id} label={item.name} selected={placement === item.id} onPress={() => setPlacement(item.id)} />
          ))}
        </ChipRow>
      </Section>
      <TextField
        label="Fecha de inicio"
        placeholder="AAAA-MM-DD"
        autoCapitalize="none"
        maxLength={10}
        value={startsOn}
        onChangeText={setStartsOn}
      />
      <TextField
        label="Fecha de fin"
        placeholder="AAAA-MM-DD"
        autoCapitalize="none"
        maxLength={10}
        value={endsOn}
        onChangeText={setEndsOn}
      />
      <Button
        title={image ? 'Cambiar imagen' : 'Elegir imagen'}
        variant="secondary"
        icon="image-outline"
        onPress={async () => setImage((await pickImage()) ?? image)}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Imagen horizontal 3:1, por ejemplo 1200 x 400
      </ThemedText>
      {image && <Image source={{ uri: image.uri }} style={styles.preview} contentFit="cover" />}
      <ErrorText message={error} />
      <Button title="Publicar anuncio" onPress={save} loading={saving} />
    </Card>
  );
}

const styles = StyleSheet.create({
  preview: {
    width: '100%',
    aspectRatio: 3,
    borderRadius: Radius.medium,
  },
});
