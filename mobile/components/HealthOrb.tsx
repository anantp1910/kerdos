import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS } from '@/constants/theme';

// ─── ANIMATION KNOBS ────────────────────────────────────────────────────────
const ORB_RADIUS       = 58;
const ORB_STROKE_WIDTH = 9;
const ORB_SIZE         = 160;
const FILL_DURATION    = 1400;  // ms for ring to fill
const PULSE_DURATION   = 2000;  // ms per glow pulse cycle

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props { score: number }

export default function HealthOrb({ score }: Props) {
  const circumference = 2 * Math.PI * ORB_RADIUS;
  const targetOffset  = circumference - (score / 100) * circumference;
  const center        = ORB_SIZE / 2;

  const progress  = useRef(new Animated.Value(circumference)).current;
  const glowScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Ring fill
    Animated.timing(progress, {
      toValue: targetOffset,
      duration: FILL_DURATION,
      useNativeDriver: false, // strokeDashoffset is not supported by native driver
    }).start();

    // Glow pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, { toValue: 1.1, duration: PULSE_DURATION, useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 0.9, duration: PULSE_DURATION, useNativeDriver: true }),
      ]),
    ).start();
  }, [score]);

  const strokeDashoffset = progress as any;

  return (
    <View style={styles.container}>
      {/* Glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          { width: ORB_SIZE + 40, height: ORB_SIZE + 40, borderRadius: (ORB_SIZE + 40) / 2 },
          { transform: [{ scale: glowScale }] },
        ]}
      />

      <Svg width={ORB_SIZE} height={ORB_SIZE} style={styles.svg}>
        <Defs>
          <LinearGradient id="orbGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#4ade80" />
            <Stop offset="100%" stopColor="#22d3ee" />
          </LinearGradient>
        </Defs>
        {/* Background track */}
        <Circle
          cx={center} cy={center} r={ORB_RADIUS}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={ORB_STROKE_WIDTH}
        />
        {/* Animated progress arc */}
        <AnimatedCircle
          cx={center} cy={center} r={ORB_RADIUS}
          fill="none"
          stroke="url(#orbGrad)"
          strokeWidth={ORB_STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>

      <View style={styles.center}>
        <Text style={styles.score}>{score}</Text>
        <Text style={styles.label}>IQ Score</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center', justifyContent: 'center',
    width: ORB_SIZE + 40, height: ORB_SIZE + 40,
  },
  glowRing: {
    position: 'absolute',
    backgroundColor: 'rgba(74,222,128,0.07)',
  },
  svg: { position: 'absolute' },
  center: { alignItems: 'center' },
  score: { fontSize: 42, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  label: {
    fontSize: 10, color: COLORS.textMuted,
    letterSpacing: 2, textTransform: 'uppercase', marginTop: 2,
  },
});
