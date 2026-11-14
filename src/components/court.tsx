import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Colors, SportColors } from '@/constants/theme';
import type { SportId } from '@/lib/types';

// Trazos en porcentaje del ancho (x, w) y del alto (y, h) de la cancha.
type Stroke =
  | { kind: 'h'; x: number; y: number; w: number }
  | { kind: 'v'; x: number; y: number; h: number }
  | { kind: 'box'; x: number; y: number; w: number; h: number }
  // d es el diámetro en porcentaje del alto.
  | { kind: 'circle'; cx: number; cy: number; d: number };

const OUTLINE: Stroke = { kind: 'box', x: 0, y: 0, w: 100, h: 100 };
const NET: Stroke = { kind: 'v', x: 50, y: 0, h: 100 };

// Proporciones reales de cada cancha (ancho / alto) y sus líneas reglamentarias.
const COURTS: Record<SportId, { ratio: number; strokes: Stroke[] }> = {
  futbol: {
    ratio: 105 / 68,
    strokes: [
      OUTLINE,
      NET,
      { kind: 'circle', cx: 50, cy: 50, d: 27 },
      { kind: 'box', x: 0, y: 20, w: 15.7, h: 60 },
      { kind: 'box', x: 84.3, y: 20, w: 15.7, h: 60 },
      { kind: 'box', x: 0, y: 36.5, w: 5.2, h: 27 },
      { kind: 'box', x: 94.8, y: 36.5, w: 5.2, h: 27 },
    ],
  },
  baloncesto: {
    ratio: 28 / 15,
    strokes: [
      OUTLINE,
      NET,
      { kind: 'circle', cx: 50, cy: 50, d: 24 },
      { kind: 'circle', cx: 5.6, cy: 50, d: 90 },
      { kind: 'circle', cx: 94.4, cy: 50, d: 90 },
      { kind: 'box', x: 0, y: 33.7, w: 20.7, h: 32.6 },
      { kind: 'box', x: 79.3, y: 33.7, w: 20.7, h: 32.6 },
    ],
  },
  tenis: {
    ratio: 23.77 / 10.97,
    strokes: [
      OUTLINE,
      { kind: 'h', x: 0, y: 12.5, w: 100 },
      { kind: 'h', x: 0, y: 87.5, w: 100 },
      NET,
      { kind: 'v', x: 23.1, y: 12.5, h: 75 },
      { kind: 'v', x: 76.9, y: 12.5, h: 75 },
      { kind: 'h', x: 23.1, y: 50, w: 53.8 },
    ],
  },
  padel: {
    ratio: 2,
    strokes: [
      OUTLINE,
      NET,
      { kind: 'v', x: 15.25, y: 0, h: 100 },
      { kind: 'v', x: 84.75, y: 0, h: 100 },
      { kind: 'h', x: 15.25, y: 50, w: 69.5 },
    ],
  },
  pickleball: {
    ratio: 44 / 20,
    strokes: [
      OUTLINE,
      NET,
      { kind: 'v', x: 34.1, y: 0, h: 100 },
      { kind: 'v', x: 65.9, y: 0, h: 100 },
      { kind: 'h', x: 0, y: 50, w: 34.1 },
      { kind: 'h', x: 65.9, y: 50, w: 34.1 },
    ],
  },
  voleibol: {
    ratio: 2,
    strokes: [OUTLINE, NET, { kind: 'v', x: 33.3, y: 0, h: 100 }, { kind: 'v', x: 66.7, y: 0, h: 100 }],
  },
};

type CourtProps = {
  sport: SportId;
  width: number;
  /** Dibuja las líneas una tras otra. Solo para el momento principal de una pantalla. */
  animate?: boolean;
  /** Atenúa la cancha (partido completo o cancelado). */
  muted?: boolean;
};

/** Plano de la cancha del deporte, a escala, en el color de su superficie. */
export function Court({ sport, width, animate, muted }: CourtProps) {
  const { ratio, strokes } = COURTS[sport];
  const height = Math.round(width / ratio);
  const color = SportColors[sport];
  const line = Math.max(1, Math.round(width / 160));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.court, { width, height, backgroundColor: `${color}14`, opacity: muted ? 0.35 : 1 }]}>
      {strokes.map((stroke, index) => (
        <StrokeView
          key={index}
          stroke={stroke}
          width={width}
          height={height}
          line={line}
          color={color}
          delay={animate ? index * 90 : null}
        />
      ))}
    </View>
  );
}

type StrokeProps = {
  stroke: Stroke;
  width: number;
  height: number;
  line: number;
  color: string;
  delay: number | null;
};

function StrokeView({ stroke, width, height, line, color, delay }: StrokeProps) {
  const progress = useSharedValue(delay === null ? 1 : 0);

  useEffect(() => {
    if (delay === null) return;
    progress.value = withDelay(delay, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }));
  }, [delay, progress]);

  const px = (percent: number, of: number) => (percent / 100) * of;

  // Las rectas crecen desde su origen; cajas y círculos se asientan.
  const animated = useAnimatedStyle(() => {
    if (stroke.kind === 'h') return { width: px(stroke.w, width) * progress.value };
    if (stroke.kind === 'v') return { height: px(stroke.h, height) * progress.value };
    return { opacity: progress.value, transform: [{ scale: 0.86 + 0.14 * progress.value }] };
  });

  if (stroke.kind === 'h') {
    return (
      <Animated.View
        style={[
          styles.stroke,
          { left: px(stroke.x, width), top: px(stroke.y, height) - line / 2, height: line, backgroundColor: color },
          animated,
        ]}
      />
    );
  }
  if (stroke.kind === 'v') {
    return (
      <Animated.View
        style={[
          styles.stroke,
          { left: px(stroke.x, width) - line / 2, top: px(stroke.y, height), width: line, backgroundColor: color },
          animated,
        ]}
      />
    );
  }
  if (stroke.kind === 'box') {
    return (
      <Animated.View
        style={[
          styles.stroke,
          {
            left: px(stroke.x, width),
            top: px(stroke.y, height),
            width: px(stroke.w, width),
            height: px(stroke.h, height),
            borderWidth: line,
            borderColor: color,
          },
          animated,
        ]}
      />
    );
  }
  const diameter = px(stroke.d, height);
  return (
    <Animated.View
      style={[
        styles.stroke,
        {
          left: px(stroke.cx, width) - diameter / 2,
          top: px(stroke.cy, height) - diameter / 2,
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          borderWidth: line,
          borderColor: color,
        },
        animated,
      ]}
    />
  );
}

const RALLY_SPORTS: SportId[] = ['tenis', 'padel', 'voleibol', 'pickleball'];
// Punto de cada golpe del peloteo, en porcentaje de la cancha.
const HITS = [
  { x: 7, y: 30 },
  { x: 93, y: 66 },
  { x: 7, y: 60 },
  { x: 93, y: 28 },
];
const SHOT_MS = 950;
const SHOTS_PER_SPORT = 6;
// Fracción del recorrido en la que la pelota pica en el campo contrario.
const BOUNCE_AT = 0.74;

/** Peloteo visto desde arriba que va cambiando de cancha: tenis, pádel, voleibol y pickleball. */
export function CourtRally({ width }: { width: number }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const clock = useSharedValue(0);
  const fade = useSharedValue(1);

  const sport = RALLY_SPORTS[index];
  const color = SportColors[sport];
  const courtHeight = Math.round(width / COURTS[sport].ratio);
  const size = Math.max(6, Math.round(width / 42));
  const arc = sport === 'voleibol' ? 0.9 : 0.45;
  const bounces = sport !== 'voleibol';

  useEffect(() => {
    if (reduced) return;
    clock.set(withRepeat(withTiming(HITS.length, { duration: SHOT_MS * HITS.length, easing: Easing.linear }), -1));
    let swap: ReturnType<typeof setTimeout>;
    const timer = setInterval(() => {
      fade.set(withTiming(0, { duration: 260 }));
      swap = setTimeout(() => {
        setIndex((current) => (current + 1) % RALLY_SPORTS.length);
        fade.set(withTiming(1, { duration: 320 }));
      }, 260);
    }, SHOT_MS * SHOTS_PER_SPORT);
    return () => {
      clearInterval(timer);
      clearTimeout(swap);
      cancelAnimation(clock);
    };
  }, [reduced, clock, fade]);

  const faded = useAnimatedStyle(() => ({ opacity: fade.value }));

  const ball = useAnimatedStyle(() => {
    const shot = Math.floor(clock.value) % HITS.length;
    const f = clock.value - Math.floor(clock.value);
    const from = HITS[shot];
    const to = HITS[(shot + 1) % HITS.length];
    return {
      transform: [
        { translateX: ((from.x + (to.x - from.x) * f) / 100) * width - size / 2 },
        { translateY: ((from.y + (to.y - from.y) * f) / 100) * courtHeight - size / 2 },
        // La pelota "sube" al cruzar la red.
        { scale: 1 + Math.sin(f * Math.PI) * arc },
      ],
    };
  });

  const bounce = useAnimatedStyle(() => {
    const shot = Math.floor(clock.value) % HITS.length;
    const f = clock.value - Math.floor(clock.value);
    const from = HITS[shot];
    const to = HITS[(shot + 1) % HITS.length];
    const p = (f - BOUNCE_AT) / (1 - BOUNCE_AT);
    return {
      opacity: bounces && p > 0 ? 1 - p : 0,
      transform: [
        { translateX: ((from.x + (to.x - from.x) * BOUNCE_AT) / 100) * width - size },
        { translateY: ((from.y + (to.y - from.y) * BOUNCE_AT) / 100) * courtHeight - size },
        { scale: 0.4 + Math.max(p, 0) * 1.4 },
      ],
    };
  });

  // Cada jugador se desplaza hacia donde le va a llegar la pelota.
  const left = useAnimatedStyle(() => ({
    transform: [
      { translateX: 0.03 * width - size / 2 },
      { translateY: (interpolate(clock.value, [0, 2, 4], [30, 60, 30]) / 100) * courtHeight - size / 2 },
    ],
  }));
  const right = useAnimatedStyle(() => ({
    transform: [
      { translateX: 0.97 * width - size / 2 },
      { translateY: (interpolate(clock.value, [0, 1, 3, 4], [47, 66, 28, 47]) / 100) * courtHeight - size / 2 },
    ],
  }));

  if (reduced) return <Court sport="tenis" width={width} />;

  const dot = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.rally, { width, height: Math.round(width / 2) }]}>
      <Animated.View style={[{ width, height: courtHeight }, faded]}>
        <Court key={sport} sport={sport} width={width} animate />
        <Animated.View style={[styles.stroke, dot, { backgroundColor: color }, left]} />
        <Animated.View style={[styles.stroke, dot, { backgroundColor: color }, right]} />
        <Animated.View
          style={[
            styles.stroke,
            { width: size * 2, height: size * 2, borderRadius: size, borderWidth: 1, borderColor: color },
            bounce,
          ]}
        />
        <Animated.View
          style={[styles.stroke, dot, { backgroundColor: Colors.text, boxShadow: `0 0 ${size}px ${color}` }, ball]}
        />
      </Animated.View>
    </View>
  );
}

type RosterProps = { sport: SportId; total: number; filled: number };

/** Un tramo por cupo: encendidos los ocupados, apagados los libres. */
export function Roster({ sport, total, filled }: RosterProps) {
  const color = SportColors[sport];
  return (
    <View style={styles.roster} accessibilityLabel={`${filled} de ${total} cupos ocupados`}>
      {Array.from({ length: total }, (_, index) => (
        <View key={index} style={[styles.spot, index < filled ? { backgroundColor: color } : styles.spotFree]} />
      ))}
    </View>
  );
}

/** Marca del deporte: su mini cancha centrada en una franja de alto `size`. */
export function SportMark({ sport, size = 18 }: { sport: SportId; size?: number }) {
  return (
    <View style={[styles.mark, { height: size }]}>
      <Court sport={sport} width={Math.round(size * 1.8)} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  court: {
    overflow: 'hidden',
    borderRadius: 3,
  },
  stroke: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  rally: {
    justifyContent: 'center',
  },
  roster: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
  },
  spot: {
    flex: 1,
    maxWidth: 28,
    borderRadius: 2,
  },
  spotFree: {
    backgroundColor: '#26305A',
  },
});
