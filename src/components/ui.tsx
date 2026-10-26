import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { initials } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Fondo de pantalla con desplazamiento y ancho máximo para web. */
export function Screen({
  children,
  scroll = true,
  contentStyle,
}: PropsWithChildren<{ scroll?: boolean; contentStyle?: StyleProp<ViewStyle> }>) {
  const theme = useTheme();
  const inner = <View style={[styles.screenContent, contentStyle]}>{children}</View>;
  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </View>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled }: ButtonProps) {
  const theme = useTheme();
  const background =
    variant === 'primary' ? theme.primary : variant === 'danger' ? 'transparent' : theme.backgroundElement;
  const color =
    variant === 'primary' ? theme.onPrimary : variant === 'danger' ? theme.danger : theme.text;
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, opacity: inactive ? 0.5 : pressed ? 0.8 : 1 },
        variant === 'danger' && { borderColor: theme.danger, borderWidth: 1 },
      ]}>
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={color} />}
          <ThemedText type="smallBold" style={{ color }}>
            {title}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

export function TextField({ label, style, ...props }: TextInputProps & { label?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      {label && (
        <ThemedText type="smallBold" themeColor="textSecondary">
          {label}
        </ThemedText>
      )}
      <TextInput
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
          props.multiline && styles.inputMultiline,
          style,
        ]}
        {...props}
      />
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: theme.primary, borderColor: theme.primary }
          : { backgroundColor: theme.background, borderColor: theme.border },
      ]}>
      <ThemedText type="small" style={{ color: selected ? theme.onPrimary : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** Fila de chips con desplazamiento horizontal. */
export function ChipRow({ children }: PropsWithChildren) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {children}
    </ScrollView>
  );
}

export function Card({ children, onPress }: PropsWithChildren<{ onPress?: () => void }>) {
  const theme = useTheme();
  const style = [styles.card, { backgroundColor: theme.backgroundElement }];
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [style, pressed && { opacity: 0.8 }]}>
      {children}
    </Pressable>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.primarySoft },
      ]}>
      <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: size * 0.38 }}>
        {initials(name)}
      </ThemedText>
    </View>
  );
}

export function Section({ title, action, children }: PropsWithChildren<{ title: string; action?: ReactNode }>) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
          {title}
        </ThemedText>
        {action}
      </View>
      {children}
    </View>
  );
}

export function EmptyState({ icon, title, message }: { icon: IconName; title: string; message?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={40} color={theme.textSecondary} />
      <ThemedText type="smallBold">{title}</ThemedText>
      {message && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {message}
        </ThemedText>
      )}
    </View>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  const theme = useTheme();
  if (!message) return null;
  return (
    <ThemedText type="small" style={{ color: theme.danger }}>
      {message}
    </ThemedText>
  );
}

export function Loading() {
  const theme = useTheme();
  return (
    <View style={[styles.loading, { backgroundColor: theme.background }]}>
      <ActivityIndicator color={theme.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  screenContent: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  button: {
    minHeight: 48,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    minHeight: 48,
    borderRadius: Radius.medium,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  chip: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  chipRow: {
    gap: Spacing.two,
    paddingVertical: Spacing.half,
  },
  card: {
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  center: {
    textAlign: 'center',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
