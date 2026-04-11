import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CARD_GRADIENTS } from '@/constants/theme';

export type CreditCard = {
  id: string;
  issuer: string;
  name: string;
  last4: string;
  network: string;
  color: string;
};

// ─── ANIMATION KNOBS ────────────────────────────────────────────────────────
const PRESS_SCALE   = 0.96;
const SPRING_CONFIG = { friction: 6, tension: 300, useNativeDriver: true };

interface Props {
  card: CreditCard;
  isBest?: boolean;
  score?: number;
  rate?: number;
  onPress?: () => void;
  width?: number;
}

export default function CreditCard({ card, isBest, score, rate, onPress, width = 220 }: Props) {
  const scale  = useRef(new Animated.Value(1)).current;
  const height = width * 0.58;
  const gradient = CARD_GRADIENTS[card.color] ?? ['#1a1a2e', '#0f3460'];

  const onPressIn  = () => Animated.spring(scale, { toValue: PRESS_SCALE, ...SPRING_CONFIG }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,           ...SPRING_CONFIG }).start();

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress}>
      <Animated.View
        style={[
          styles.container,
          { width, height },
          { transform: [{ scale }] },
          isBest && styles.bestBorder,
        ]}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, styles.gradient]}
        />

        {isBest && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>BEST</Text>
          </View>
        )}

        <View style={styles.chip}>
          <View style={styles.chipInner} />
        </View>

        <View style={styles.top}>
          <Text style={styles.issuer}>{card.issuer}</Text>
          <Text style={styles.cardName}>{card.name}</Text>
        </View>

        {score !== undefined && (
          <View style={styles.scoreWrap}>
            <Text style={styles.scoreValue}>${score.toFixed(2)}</Text>
            <Text style={styles.scoreSub}>{rate}x back</Text>
          </View>
        )}

        <View style={styles.bottom}>
          <Text style={styles.last4}>•••• {card.last4}</Text>
          <Text style={styles.network}>{card.network}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    padding: 16, justifyContent: 'space-between',
  },
  bestBorder: {
    borderColor: '#4ade80',
    shadowColor: '#4ade80', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  gradient: { borderRadius: 18 },
  badge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: '#4ade80', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#000', letterSpacing: 1 },
  chip: {
    width: 32, height: 22, backgroundColor: 'rgba(255,215,0,0.75)',
    borderRadius: 4, justifyContent: 'center', alignItems: 'center',
  },
  chipInner: { width: 20, height: 14, backgroundColor: 'rgba(255,180,0,0.5)', borderRadius: 2 },
  top: { marginTop: 4 },
  issuer: { fontSize: 9, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 2 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 2 },
  scoreWrap: { alignItems: 'center' },
  scoreValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
  scoreSub: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  last4: { fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.55)', letterSpacing: 2 },
  network: { fontSize: 10, color: 'rgba(255,255,255,0.35)' },
});
