import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { CourtRally } from '@/components/court';
import { ThemedText } from '@/components/themed-text';
import { Button, Checkbox, ErrorText, Screen, TextField } from '@/components/ui';
import { TERMS_VERSION } from '@/constants/legal';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Mode = 'ingresar' | 'registrarse';

const MODES: { id: Mode; label: string }[] = [
  { id: 'ingresar', label: 'Ingresar' },
  { id: 'registrarse', label: 'Crear cuenta' },
];
const WIDE_BREAKPOINT = 900;
const FORM_WIDTH = 400;

export default function LoginScreen() {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const wide = windowWidth >= WIDE_BREAKPOINT;
  const contentWidth = Math.min(windowWidth - Spacing.three * 2, 1040);
  const courtWidth = wide
    ? Math.min(520, contentWidth - Spacing.six - FORM_WIDTH)
    : Math.min(windowWidth - Spacing.three * 2, 420);
  const [mode, setMode] = useState<Mode>('ingresar');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [adult, setAdult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setNotice(null);
    if (mode === 'registrarse' && name.trim().length < 2) {
      setError('Escribe tu nombre.');
      return;
    }
    if (mode === 'registrarse' && !(accepted && adult)) {
      setError('Para crear tu cuenta confirma que eres mayor de 18 años y acepta los términos y la política de datos.');
      return;
    }
    setLoading(true);
    if (mode === 'ingresar') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setError(translateAuthError(error.message));
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim(), accepted_terms: true, is_adult: true, terms_version: TERMS_VERSION },
        },
      });
      if (error) setError(translateAuthError(error.message));
      // Con confirmación de correo activa, Supabase no da error si el correo ya existe:
      // devuelve un usuario sin identidades.
      else if (data.user?.identities?.length === 0) {
        setError('Ya existe una cuenta con ese correo. Usa "Ingresar" con tu contraseña.');
        setMode('ingresar');
      } else if (!data.session) setNotice('Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego ingresa.');
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <Screen contentStyle={[styles.content, wide && styles.contentWide]}>
        <View style={[styles.layout, wide && styles.layoutWide]}>
          <View style={[styles.header, wide ? { width: courtWidth } : styles.headerStacked]}>
            <View style={styles.glow}>
              <CourtRally width={courtWidth} />
            </View>
            <ThemedText type="title" style={styles.brand}>JuegaBGA</ThemedText>
            <ThemedText themeColor="textSecondary">
              Arma partidos en Bucaramanga: fútbol, pádel, pickleball, tenis, baloncesto y voleibol.
            </ThemedText>
          </View>

          <View style={[styles.form, wide && { width: FORM_WIDTH }]}>
            <View style={[styles.segmented, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              {MODES.map((item) => {
                const selected = mode === item.id;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => setMode(item.id)}
                    style={[styles.segment, selected && { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText
                      type="small"
                      style={{
                        color: selected ? theme.text : theme.textSecondary,
                        fontFamily: selected ? Fonts.bodySemi : Fonts.body,
                      }}>
                      {item.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {mode === 'registrarse' && (
              <TextField label="Nombre" value={name} onChangeText={setName} autoComplete="name" maxLength={100} />
            )}
            <TextField
              label="Correo"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
            />
            <TextField
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === 'ingresar' ? 'current-password' : 'new-password'}
              onSubmitEditing={submit}
            />

            {mode === 'registrarse' && (
              <View style={styles.consent}>
                <Checkbox label="Soy mayor de 18 años" checked={adult} onPress={() => setAdult(!adult)} />
                <Checkbox
                  label="Acepto los términos y autorizo el tratamiento de mis datos"
                  checked={accepted}
                  onPress={() => setAccepted(!accepted)}
                />
                <ThemedText type="small" themeColor="textSecondary">
                  Lee los{' '}
                  <Link href="/legal/terminos" style={[styles.link, { color: theme.primary }]}>
                    términos
                  </Link>{' '}
                  y la{' '}
                  <Link href="/legal/privacidad" style={[styles.link, { color: theme.primary }]}>
                    política de datos
                  </Link>
                  .
                </ThemedText>
              </View>
            )}

            <ErrorText message={error} />
            {notice && <ThemedText type="small">{notice}</ThemedText>}

            <Button title={mode === 'ingresar' ? 'Ingresar' : 'Crear cuenta'} onPress={submit} loading={loading} />
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function translateAuthError(message: string) {
  if (message.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (message.includes('Email not confirmed')) return 'Primero confirma tu correo con el enlace que te enviamos.';
  if (message.includes('User already registered')) return 'Ya existe una cuenta con ese correo.';
  if (message.includes('Database error saving new user')) return 'Debes aceptar los términos y ser mayor de 18 años.';
  if (message.includes('rate limit')) return 'Se enviaron demasiados correos en poco tiempo. Espera una hora e inténtalo de nuevo.';
  if (message.includes('Password should be')) return 'La contraseña debe tener al menos 6 caracteres.';
  return message;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    justifyContent: 'center',
  },
  contentWide: {
    maxWidth: 1040,
  },
  layout: {
    gap: Spacing.three,
  },
  layoutWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.six,
  },
  header: {
    gap: Spacing.two,
  },
  headerStacked: {
    marginBottom: Spacing.three,
  },
  glow: {
    alignSelf: 'flex-start',
    borderRadius: 3,
    boxShadow: '0 0 80px rgba(244,246,251,0.10)',
  },
  brand: {
    marginTop: Spacing.two,
  },
  form: {
    gap: Spacing.three,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.one,
  },
  segment: {
    flex: 1,
    height: 40,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consent: {
    gap: Spacing.two,
  },
  link: {
    textDecorationLine: 'underline',
  },
});
