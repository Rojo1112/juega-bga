import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Chip, ErrorText, Screen, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type Mode = 'ingresar' | 'registrarse';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('ingresar');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    setLoading(true);
    if (mode === 'ingresar') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setError(translateAuthError(error.message));
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() } },
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
      <Screen contentStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title">JuegaBGA</ThemedText>
          <ThemedText themeColor="textSecondary">
            Arma partidos en Bucaramanga: fútbol, pádel, pickleball, tenis, baloncesto y voleibol.
          </ThemedText>
        </View>

        <View style={styles.modes}>
          <Chip label="Ingresar" selected={mode === 'ingresar'} onPress={() => setMode('ingresar')} />
          <Chip label="Crear cuenta" selected={mode === 'registrarse'} onPress={() => setMode('registrarse')} />
        </View>

        {mode === 'registrarse' && (
          <TextField label="Nombre" value={name} onChangeText={setName} autoComplete="name" />
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

        <ErrorText message={error} />
        {notice && <ThemedText type="small">{notice}</ThemedText>}

        <Button title={mode === 'ingresar' ? 'Ingresar' : 'Crear cuenta'} onPress={submit} loading={loading} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

function translateAuthError(message: string) {
  if (message.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (message.includes('Email not confirmed')) return 'Primero confirma tu correo con el enlace que te enviamos.';
  if (message.includes('User already registered')) return 'Ya existe una cuenta con ese correo.';
  if (message.includes('Password should be')) return 'La contraseña debe tener al menos 6 caracteres.';
  return message;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    justifyContent: 'center',
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  modes: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
