import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

// ─── ANIMATION KNOBS ────────────────────────────────────────────────────────
const DONUT_RADIUS    = 68;
const STROKE_WIDTH    = 14;
const FILL_DURATION   = 900;
const SEGMENT_STAGGER = 150;
const GAP             = 3;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Segment { name: string; pct: number; color: string }

function DonutSegment({
  seg, index, circumference, center, rotation,
}: {
  seg: Segment; index: number; circumference: number; center: number; rotation: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: (seg.pct / 100) * circumference,
      duration: FILL_DURATION,
      delay: index * SEGMENT_STAGGER,
      useNativeDriver: false,
    }).start();
  }, []);

  const strokeDasharray = progress.interpolate({
    inputRange: [0, circumference],
    outputRange: [`0,${circumference}`, `${(seg.pct / 100) * circumference - GAP},${circumference}`],
  });

  return (
    <AnimatedCircle
      cx={center} cy={center} r={DONUT_RADIUS}
      fill="none"
      stroke={seg.color}
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      strokeDasharray={strokeDasharray as any}
      transform={`rotate(${rotation} ${center} ${center})`}
    />
  );
}

interface Props {
  segments: Segment[];
  centerLabel?: string;
  centerSub?: string;
  size?: number;
}

export default function DonutChart({ segments, centerLabel, centerSub, size = 180 }: Props) {
  const circumference  = 2 * Math.PI * DONUT_RADIUS;
  const center         = size / 2;
  let cumulativeDash   = 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFillObject}>
        <Circle
          cx={center} cy={center} r={DONUT_RADIUS}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={STROKE_WIDTH}
        />
        {segments.map((seg, i) => {
          const rotation = -90 + (cumulativeDash / circumference) * 360;
          cumulativeDash += (seg.pct / 100) * circumference;
          return (
            <DonutSegment
              key={seg.name}
              seg={seg} index={i}
              circumference={circumference}
              center={center}
              rotation={rotation}
            />
          );
        })}
      </Svg>

      {(centerLabel || centerSub) && (
        <View style={styles.center}>
          {centerLabel && <Text style={styles.centerLabel}>{centerLabel}</Text>}
          {centerSub   && <Text style={styles.centerSub}>{centerSub}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  centerLabel: { fontSize: 22, fontWeight: '800', color: '#fff' },
  centerSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
});
