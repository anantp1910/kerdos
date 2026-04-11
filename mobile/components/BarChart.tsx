import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

// ─── ANIMATION KNOBS ────────────────────────────────────────────────────────
const BAR_DURATION  = 600;
const STAGGER_DELAY = 80;

interface DataPoint { month: string; rewards: number; savings: number }

function BarGroup({ d, index, maxVal, maxHeight }: {
  d: DataPoint; index: number; maxVal: number; maxHeight: number;
}) {
  const rewardH  = useRef(new Animated.Value(0)).current;
  const savingsH = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * STAGGER_DELAY;
    Animated.parallel([
      Animated.timing(rewardH,  { toValue: (d.rewards / maxVal) * maxHeight, duration: BAR_DURATION, delay, useNativeDriver: false }),
      Animated.timing(savingsH, { toValue: (d.savings / maxVal) * maxHeight, duration: BAR_DURATION, delay, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <View style={styles.group}>
      <View style={[styles.barContainer, { height: maxHeight }]}>
        <Animated.View style={[styles.bar, styles.rewardBar,  { height: rewardH  }]} />
        <Animated.View style={[styles.bar, styles.savingsBar, { height: savingsH }]} />
      </View>
      <Text style={styles.monthLabel}>{d.month}</Text>
    </View>
  );
}

interface Props { data: DataPoint[]; maxHeight?: number }

export default function BarChart({ data, maxHeight = 120 }: Props) {
  const maxVal = Math.max(...data.flatMap(d => [d.rewards, d.savings]));

  return (
    <View style={styles.container}>
      <View style={[styles.yAxis, { height: maxHeight }]}>
        {['$500', '$250', '$0'].map(l => (
          <Text key={l} style={styles.axisLabel}>{l}</Text>
        ))}
      </View>

      <View style={[styles.barsRow, { height: maxHeight + 28 }]}>
        {data.map((d, i) => (
          <BarGroup key={d.month} d={d} index={i} maxVal={maxVal} maxHeight={maxHeight} />
        ))}
      </View>

      <View style={styles.legend}>
        {[['#4ade80','Rewards'],['#60a5fa','Savings']].map(([c,l]) => (
          <View key={l} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: c }]} />
            <Text style={styles.legendText}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'column' },
  yAxis: { position: 'absolute', left: 0, top: 0, justifyContent: 'space-between', paddingBottom: 4 },
  axisLabel: { fontSize: 9, color: 'rgba(255,255,255,0.25)' },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingLeft: 32 },
  group: { alignItems: 'center', gap: 6 },
  barContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 10, borderRadius: 4 },
  rewardBar:  { backgroundColor: '#4ade80' },
  savingsBar: { backgroundColor: '#60a5fa' },
  monthLabel: { fontSize: 9, color: 'rgba(255,255,255,0.35)' },
  legend: { flexDirection: 'row', gap: 16, marginTop: 12, paddingLeft: 32 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontSize: 10, color: 'rgba(255,255,255,0.4)' },
});
