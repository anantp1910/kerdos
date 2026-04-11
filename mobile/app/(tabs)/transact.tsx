import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/theme';

const ACTIONS = [
  { emoji: '💳', label: 'Best Card',   sub: 'Find optimal card for any purchase', color: COLORS.green,  href: '/(tabs)/smartswipe' },
  { emoji: '➕', label: 'Add Funds',   sub: 'Deposit to rewards wallet',           color: COLORS.blue,   href: null },
  { emoji: '💸', label: 'Redeem',      sub: 'Cash out your rewards balance',       color: COLORS.purple, href: null },
  { emoji: '🔄', label: 'Transfer',    sub: 'Move points between cards',           color: COLORS.yellow, href: null },
  { emoji: '📈', label: 'Invest',      sub: 'Auto-invest your cashback',           color: '#30d158',     href: '/(tabs)/rewardvest' },
];

export default function TransactScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.tag}>TRANSACT</Text>
        <Text style={styles.title}>Quick Actions</Text>
        <Text style={styles.sub}>Manage your rewards</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {ACTIONS.map(a => (
          <Pressable
            key={a.label}
            style={styles.row}
            onPress={() => a.href && router.push(a.href as any)}
          >
            <View style={[styles.icon, { backgroundColor: a.color + '20' }]}>
              <Text style={styles.iconEmoji}>{a.emoji}</Text>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{a.label}</Text>
              <Text style={styles.rowSub}>{a.sub}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  tag:   { fontSize: 10, color: COLORS.green, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  sub:   { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  list:  { paddingHorizontal: 16, gap: 10, paddingBottom: 40 },
  row:   { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 14 },
  icon:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconEmoji: { fontSize: 22 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#fff' },
  rowSub:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  arrow: { fontSize: 22, color: COLORS.textMuted },
});
