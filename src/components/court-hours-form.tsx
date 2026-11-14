import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Checkbox, ErrorText, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { CourtHours } from '@/lib/types';

// Lunes primero. El número es el día de la semana de la base (0 = domingo).
const DAYS = [
  { weekday: 1, name: 'Lunes' },
  { weekday: 2, name: 'Martes' },
  { weekday: 3, name: 'Miércoles' },
  { weekday: 4, name: 'Jueves' },
  { weekday: 5, name: 'Viernes' },
  { weekday: 6, name: 'Sábado' },
  { weekday: 0, name: 'Domingo' },
];

type Day = { open: boolean; opens: string; closes: string };
type Week = Record<number, Day>;

const HOUR = /^([01]\d|2[0-3]):[0-5]\d$/;

function minutesOf(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Horario semanal de una cancha. Guarda los días abiertos y borra los cerrados. */
export function CourtHoursForm({
  courtId,
  hours,
  onSaved,
}: {
  courtId: string;
  hours: CourtHours[];
  onSaved: () => void;
}) {
  const [week, setWeek] = useState<Week>(() =>
    Object.fromEntries(
      DAYS.map(({ weekday }) => {
        const row = hours.find((item) => item.weekday === weekday);
        const day: Day = row
          ? { open: true, opens: row.opens.slice(0, 5), closes: row.closes.slice(0, 5) }
          : { open: false, opens: '08:00', closes: '22:00' };
        return [weekday, day];
      }),
    ),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(weekday: number, change: Partial<Day>) {
    setSaved(false);
    setWeek((current) => ({ ...current, [weekday]: { ...current[weekday], ...change } }));
  }

  function copyMonday() {
    const monday = week[1];
    setSaved(false);
    setWeek(Object.fromEntries(DAYS.map(({ weekday }) => [weekday, { ...monday }])));
  }

  async function save() {
    for (const { weekday, name } of DAYS) {
      const day = week[weekday];
      if (!day.open) continue;
      if (!HOUR.test(day.opens) || !HOUR.test(day.closes)) {
        setError(`${name}: escribe las horas como HH:MM, por ejemplo 08:00.`);
        return;
      }
      if (minutesOf(day.closes) <= minutesOf(day.opens)) {
        setError(`${name}: el cierre debe ser posterior a la apertura.`);
        return;
      }
    }

    const openRows = DAYS.filter(({ weekday }) => week[weekday].open).map(({ weekday }) => ({
      court_id: courtId,
      weekday,
      opens: week[weekday].opens,
      closes: week[weekday].closes,
    }));
    const closedDays = DAYS.filter(({ weekday }) => !week[weekday].open).map(({ weekday }) => weekday);

    setSaving(true);
    setError(null);
    const { error: upsertError } = openRows.length
      ? await supabase.from('court_hours').upsert(openRows, { onConflict: 'court_id,weekday' })
      : { error: null };
    const { error: deleteError } = closedDays.length
      ? await supabase.from('court_hours').delete().eq('court_id', courtId).in('weekday', closedDays)
      : { error: null };
    setSaving(false);

    const firstError = upsertError ?? deleteError;
    if (firstError) {
      setError(firstError.message);
    } else {
      setSaved(true);
      onSaved();
    }
  }

  return (
    <View style={styles.form}>
      <Button title="Mismo horario todos los días" variant="secondary" icon="copy-outline" onPress={copyMonday} />
      {DAYS.map(({ weekday, name }) => {
        const day = week[weekday];
        return (
          <View key={weekday} style={styles.day}>
            <ThemedText type="smallBold">{name}</ThemedText>
            <Checkbox label="Abre" checked={day.open} onPress={() => update(weekday, { open: !day.open })} />
            {day.open && (
              <View style={styles.hours}>
                <View style={styles.hour}>
                  <TextField
                    label="Apertura"
                    placeholder="HH:MM"
                    maxLength={5}
                    value={day.opens}
                    onChangeText={(text) => update(weekday, { opens: text })}
                  />
                </View>
                <View style={styles.hour}>
                  <TextField
                    label="Cierre"
                    placeholder="HH:MM"
                    maxLength={5}
                    value={day.closes}
                    onChangeText={(text) => update(weekday, { closes: text })}
                  />
                </View>
              </View>
            )}
          </View>
        );
      })}
      <ErrorText message={error} />
      <Button
        title={saved ? 'Horario guardado' : 'Guardar horario'}
        icon={saved ? 'checkmark' : undefined}
        onPress={save}
        loading={saving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
  day: {
    gap: Spacing.one,
  },
  hours: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  hour: {
    flex: 1,
  },
});
