import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps, type PropsWithChildren, type ReactNode } from 'react';
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
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { initials } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Anillo de foco solo para navegación con teclado en web (el clic no lo muestra). */
function useFocusRing() {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return {
    ringStyle: focused
      ? ({ outlineColor: theme.primary, outlineWidth: 2, outlineOffset: 2, outlineStyle: 'solid' } as const)
      : null,
    onFocus: (event: { target: unknown }) => {
      const target = event.target as { matches?: (selector: string) => boolean };
      setFocused(target.matches?.(':focus-visible') ?? false);
    },
    onBlur: () => setFocused(false),
  };
}

/** Escala con resorte al presionar. Reanimated respeta "reducir movimiento" del sistema. */
function usePressScale() {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return {
    animatedStyle,
    onPressIn: () => {
      scale.set(withSpring(0.97, { damping: 20, stiffness: 320 }));
    },
    onPressOut: () => {
      scale.set(withSpring(1, { damping: 20, stiffness: 320 }));
    },
  };
}

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
  const press = usePressScale();
  const focus = useFocusRing();
  const color =
    variant === 'primary' ? theme.onPrimary : variant === 'danger' ? theme.danger : theme.text;
  const inactive = disabled || loading;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      disabled={inactive}
      style={[
        styles.button,
        variant === 'primary'
          ? { backgroundColor: theme.primary, borderColor: theme.primary }
          : { borderColor: variant === 'danger' ? theme.danger : theme.border },
        inactive && styles.inactive,
        focus.ringStyle,
        press.animatedStyle,
      ]}>
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={color} />}
          <ThemedText style={{ color, fontFamily: Fonts.bodyBold }}>{title}</ThemedText>
        </>
      )}
    </AnimatedPressable>
  );
}

export function TextField({ label, style, onFocus, onBlur, ...props }: TextInputProps & { label?: string }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      {label && (
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      )}
      <TextInput
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.background, borderColor: focused ? theme.primary : theme.border },
          props.multiline && styles.inputMultiline,
          style,
        ]}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...props}
      />
    </View>
  );
}

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  /** Color propio (el del deporte) para el borde y el texto cuando está seleccionado. */
  color?: string;
};

export function Chip({ label, selected, onPress, color }: ChipProps) {
  const theme = useTheme();
  const press = usePressScale();
  const focus = useFocusRing();
  const accent = color ?? theme.primary;
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: color ? `${color}1F` : theme.primarySoft, borderColor: accent }
          : { borderColor: theme.border },
        focus.ringStyle,
        press.animatedStyle,
      ]}>
      <ThemedText type="small" style={{ color: selected ? accent : theme.textSecondary }}>
        {label}
      </ThemedText>
    </AnimatedPressable>
  );
}

/** Casilla de verificación con etiqueta que puede partirse en varias líneas. */
export function Checkbox({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  const theme = useTheme();
  const focus = useFocusRing();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={[styles.checkboxRow, focus.ringStyle]}>
      <View
        style={[
          styles.checkbox,
          { borderColor: checked ? theme.primary : theme.border, backgroundColor: checked ? theme.primary : 'transparent' },
        ]}>
        {checked && <Ionicons name="checkmark" size={16} color={theme.onPrimary} />}
      </View>
      <ThemedText type="small" style={styles.checkboxLabel}>
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
  if (!onPress) {
    return (
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {children}
      </View>
    );
  }
  return <PressableCard onPress={onPress}>{children}</PressableCard>;
}

function PressableCard({ children, onPress }: PropsWithChildren<{ onPress: () => void }>) {
  const theme = useTheme();
  const press = usePressScale();
  const focus = useFocusRing();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        focus.ringStyle,
        press.animatedStyle,
      ]}>
      {children}
    </AnimatedPressable>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const theme = useTheme();
  const fontSize = Math.round(size * 0.32);
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.backgroundSelected, borderColor: theme.border },
      ]}>
      <ThemedText style={{ fontFamily: Fonts.display, fontSize, lineHeight: Math.round(fontSize * 1.4) }}>
        {initials(name)}
      </ThemedText>
    </View>
  );
}

export function Section({ title, action, children }: PropsWithChildren<{ title: string; action?: ReactNode }>) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold" themeColor="textSecondary">
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
    minHeight: 52,
    borderRadius: Radius.medium,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  inactive: {
    opacity: 0.5,
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
    fontFamily: Fonts.body,
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
  checkboxRow: {
    minHeight: 44,
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radius.small,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    flex: 1,
  },
  card: {
    borderRadius: Radius.large,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  avatar: {
    borderWidth: 1,
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
