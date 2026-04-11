import React, { useEffect, useRef, useState } from 'react';
import { Text, TextStyle } from 'react-native';

// ─── ANIMATION KNOBS ────────────────────────────────────────────────────────
const COUNT_DURATION = 1200;
const TICK_INTERVAL  = 16; // ~60fps

interface Props {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  style?: TextStyle;
}

export default function AnimatedCounter({ value, prefix = '', suffix = '', decimals = 0, style }: Props) {
  const [display, setDisplay] = useState(0);
  const start  = useRef(Date.now());
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    start.current = Date.now();
    const interval = setInterval(() => {
      const elapsed  = Date.now() - start.current;
      const progress = Math.min(elapsed / COUNT_DURATION, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (value - from) * eased;
      setDisplay(current);
      if (progress >= 1) {
        fromRef.current = value;
        clearInterval(interval);
      }
    }, TICK_INTERVAL);
    return () => clearInterval(interval);
  }, [value]);

  return (
    <Text style={style}>{prefix}{display.toFixed(decimals)}{suffix}</Text>
  );
}
