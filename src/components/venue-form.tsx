import { useState } from 'react';

import { Button, ChipRow, Chip, ErrorText, Section, TextField } from '@/components/ui';
import { SPORTS } from '@/constants/sports';
import { SportColors } from '@/constants/theme';
import type { SportId, Venue } from '@/lib/types';

export type VenueValues = {
  name: string;
  address: string | null;
  neighborhood: string | null;
  phone: string | null;
  sport_ids: SportId[];
};

/** Datos de una sede, para registrarla o editarla. onSubmit devuelve el error o null si todo salió bien. */
export function VenueForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Venue;
  submitLabel: string;
  onSubmit: (values: VenueValues) => Promise<string | null>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [neighborhood, setNeighborhood] = useState(initial?.neighborhood ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [sports, setSports] = useState<SportId[]>(initial?.sport_ids ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cualquier cambio quita el "Guardado" hasta volver a guardar.
  function changed<T>(setter: (value: T) => void) {
    return (value: T) => {
      setSaved(false);
      setter(value);
    };
  }

  function toggleSport(sport: SportId) {
    setSaved(false);
    setSports((current) => (current.includes(sport) ? current.filter((item) => item !== sport) : [...current, sport]));
  }

  async function submit() {
    if (!name.trim()) {
      setError('Escribe el nombre de la sede.');
      return;
    }
    if (sports.length === 0) {
      setError('Elige al menos un deporte.');
      return;
    }
    setSaving(true);
    setError(null);
    const message = await onSubmit({
      name: name.trim(),
      address: address.trim() || null,
      neighborhood: neighborhood.trim() || null,
      phone: phone.trim() || null,
      sport_ids: sports,
    });
    setSaving(false);
    if (message) setError(message);
    else setSaved(true);
  }

  return (
    <>
      <TextField label="Nombre" maxLength={100} value={name} onChangeText={changed(setName)} />
      <TextField label="Dirección" maxLength={200} value={address} onChangeText={changed(setAddress)} />
      <TextField label="Barrio" maxLength={100} value={neighborhood} onChangeText={changed(setNeighborhood)} />
      <TextField
        label="Teléfono"
        maxLength={30}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={changed(setPhone)}
      />
      <Section title="Deportes que se juegan">
        <ChipRow>
          {SPORTS.map((sport) => (
            <Chip
              key={sport.id}
              label={sport.name}
              color={SportColors[sport.id]}
              selected={sports.includes(sport.id)}
              onPress={() => toggleSport(sport.id)}
            />
          ))}
        </ChipRow>
      </Section>
      <ErrorText message={error} />
      <Button
        title={saved ? 'Guardado' : submitLabel}
        icon={saved ? 'checkmark' : undefined}
        onPress={submit}
        loading={saving}
      />
    </>
  );
}
