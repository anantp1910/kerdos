import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

// ─── ANIMATION KNOBS ────────────────────────────────────────────────────────
const DEFAULT_DURATION = 400;
const DEFAULT_TRANSLATE = 18;

interface Props {
  delay?: number;
  duration?: number;
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function FadeIn({ delay = 0, duration = DEFAULT_DURATION, children, style }: Props) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(DEFAULT_TRANSLATE)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
