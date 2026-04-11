import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ─── ANIMATION KNOBS ────────────────────────────────────────────────────────
const BAR_DURATION = 700;

interface Props {
  progress: number;         // 0–1
  color?: [string, string];
  height?: number;
  delay?: number;
  style?: ViewStyle;
}

export default function AnimatedBar({
  progress,
  color = ['#4ade80', '#22d3ee'],
  height = 8,
  delay = 0,
  style,
}: Props) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: progress,
      duration: BAR_DURATION,
      delay,
      useNativeDriver: false, // width % is layout, not supported by native driver
    }).start();
  }, [progress, delay]);

  const animatedWidth = width.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.track, { height }, style]}>
      <Animated.View style={[styles.fill, { width: animatedWidth, borderRadius: height / 2, overflow: 'hidden' }]}>
        <LinearGradient
          colors={color}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 999, overflow: 'hidden',
  },
  fill: { height: '100%' },
});
