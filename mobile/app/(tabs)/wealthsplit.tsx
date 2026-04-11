import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import BarChart from '@/components/BarChart';
import AnimatedBar from '@/components/AnimatedBar';
import FadeIn from '@/components/FadeIn';
import { COLORS } from '@/constants/theme';
import { USER_CARDS } from '@/lib/userCards';
import { API_BASE } from '@/lib/apiConfig';

const GROUP_MEMBERS = [
  { id: 'u1', name: 'Arjun', initials: 'AJ', owes:  128.5,  cardSuggestion: 'Amex Gold'      },
  { id: 'u2', name: 'Priya', initials: 'PR', owes: -45.0,   cardSuggestion: 'Chase Sapphire' },
  { id: 'u3', name: 'Zara',  initials: 'ZK', owes:  92.3,   cardSuggestion: 'Citi Double'    },
];

const GROUP_EXPENSES = [
  { id: 'e1', description: 'Dinner at Nobu', total: 386, splits: [
    { name: 'You',   amount: 128.67, paid: true  },
    { name: 'Arjun', amount: 128.67, paid: false },
    { name: 'Priya', amount: 128.66, paid: true  },
  ]},
  { id: 'e2', description: 'Airbnb — Miami', total: 1200, splits: [
    { name: 'You',   amount: 400, paid: true  },
    { name: 'Arjun', amount: 400, paid: false },
    { name: 'Zara',  amount: 400, paid: false },
  ]},
  { id: 'e3', description: 'Grocery run', total: 142, splits: [
    { name: 'You',   amount: 47.33, paid: true  },
    { name: 'Priya', amount: 47.33, paid: false },
    { name: 'Zara',  amount: 47.34, paid: true  },
  ]},
];

const BREAKEVEN_CARDS = [
  { name: 'Amex Gold',        fee: 250, months: 2.1, pct: 100 },
  { name: 'Chase Sapphire',   fee: 95,  months: 3.2, pct: 31  },
  { name: 'Capital Venture',  fee: 95,  months: 2.5, pct: 26  },
  { name: 'Citi Double Cash', fee: 0,   months: 0,   pct: 100 },
  { name: 'Discover it',      fee: 0,   months: 0,   pct: 100 },
];

const MONTHLY_DATA = [
  { month: 'Nov', rewards: 210, savings: 380 },
  { month: 'Dec', rewards: 290, savings: 440 },
  { month: 'Jan', rewards: 245, savings: 390 },
  { month: 'Feb', rewards: 310, savings: 510 },
  { month: 'Mar', rewards: 318, savings: 495 },
  { month: 'Apr', rewards: 340, savings: 520 },
];

type Tab = 'overview' | 'splits' | 'cards';
const SPRING = { friction: 7, tension: 300, useNativeDriver: true };

const NET_ITEMS = [
  { label: 'Cashback',         value: '+$340', color: COLORS.green,  icon: '💳' },
  { label: 'Savings vs Debit', value: '+$284', color: COLORS.blue,   icon: '💰' },
  { label: 'Investment Return',value: '+$112', color: COLORS.purple, icon: '📈' },
  { label: 'Card Fees',        value: '-$89',  color: COLORS.red,    icon: '📋' },
  { label: 'Signup Bonus',     value: '+$200', color: COLORS.yellow, icon: '🎁' },
];

type ApiCard = { id: string; cardName: string; cardIssuer: string; cardNetwork: string; annualFee: number | null; pointValuation: number | null; rewardRates: Record<string, number> };

export default function WealthSplitScreen() {
  const [tab,      setTab]     = useState<Tab>('overview');
  const [settled,  setSettled] = useState<Set<string>>(new Set());
  const [apiCards, setApiCards] = useState<ApiCard[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/rewards`)
      .then(r => r.json())
      .then(setApiCards)
      .catch(() => {});
  }, []);

  const totalEarned = Object.values(USER_CARDS).reduce((s, c) => s + c.totalEarned, 0);
  const totalPoints = Object.values(USER_CARDS).reduce((s, c) => s + c.pointsBalance, 0);

  const handleSettle = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSettled(prev => new Set([...prev, id]));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <FadeIn delay={0} style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.tag}>⚖️ WealthSplit</Text>
            <Text style={styles.title}>Command Center</Text>
            <Text style={styles.subtitle}>Savings, rewards, splits — all in one view.</Text>
          </View>
          <LinearGradient colors={['rgba(74,222,128,0.12)', 'rgba(34,211,238,0.06)']} style={styles.netBadge}>
            <Text style={styles.netLabel}>Net Score</Text>
            <Text style={styles.netValue}>+$847</Text>
            <Text style={styles.netSub}>this month</Text>
          </LinearGradient>
        </FadeIn>

        {/* Tabs */}
        <FadeIn delay={60} style={styles.tabs}>
          {(['overview', 'splits', 'cards'] as Tab[]).map(t => {
            const active = tab === t;
            const s = useRef(new Animated.Value(1)).current;
            return (
              <Pressable
                key={t}
                onPressIn={() => Animated.spring(s, { toValue: 0.94, ...SPRING }).start()}
                onPressOut={() => Animated.spring(s, { toValue: 1,    ...SPRING }).start()}
                onPress={() => { Haptics.selectionAsync(); setTab(t); }}
                style={{ flex: 1 }}
              >
                <Animated.View style={[styles.tab, active && styles.tabActive, { transform: [{ scale: s }] }]}>
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {t === 'overview' ? '📊 Overview' : t === 'splits' ? '🤝 Splits' : '💳 Cards'}
                  </Text>
                </Animated.View>
              </Pressable>
            );
          })}
        </FadeIn>

        {/* ── OVERVIEW ─────────────────────────────────────── */}
        {tab === 'overview' && (
          <FadeIn delay={0} style={styles.tabContent}>
            <View style={styles.netGrid}>
              {NET_ITEMS.map(item => (
                <View key={item.label} style={styles.netCard}>
                  <Text style={styles.netIcon}>{item.icon}</Text>
                  <Text style={[styles.netCardValue, { color: item.color }]}>{item.value}</Text>
                  <Text style={styles.netCardLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.cardTitle}>Monthly Performance</Text>
              <Text style={styles.cardSub}>Rewards + Savings (6 months)</Text>
              <BarChart data={MONTHLY_DATA} maxHeight={110} />
            </View>

            <View style={styles.breakevenCard}>
              <Text style={styles.cardTitle}>Fee Breakeven Tracker</Text>
              <Text style={styles.cardSub}>How fast rewards cover annual fees</Text>
              {BREAKEVEN_CARDS.map((card, i) => (
                <View key={card.name} style={styles.breakevenRow}>
                  <View style={styles.breakevenLeft}>
                    <Text style={styles.breakevenName}>{card.name}</Text>
                    {card.fee === 0
                      ? <Text style={styles.noFeeTag}>No fee</Text>
                      : <Text style={styles.breakevenMonths}><Text style={{ color: COLORS.yellow, fontWeight: '700' }}>{card.months} mo</Text> to breakeven</Text>
                    }
                  </View>
                  <View style={{ flex: 1 }}>
                    <AnimatedBar
                      progress={card.pct / 100}
                      delay={i * 80 + 200}
                      color={card.fee === 0 ? [COLORS.green, COLORS.green] : card.months <= 2.5 ? ['#4ade80', '#22d3ee'] : ['#facc15', '#fb923c']}
                      height={6}
                    />
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.snapshotRow}>
              {[
                { label: 'Total Cashback', value: `$${totalEarned.toLocaleString()}`, color: COLORS.green },
                { label: 'Total Points',   value: `${(totalPoints/1000).toFixed(0)}K`,    color: COLORS.blue  },
                { label: 'Avg Return',     value: '2.8%',                             color: COLORS.purple},
              ].map(s => (
                <View key={s.label} style={styles.snapshotCard}>
                  <Text style={[styles.snapshotVal, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.snapshotLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </FadeIn>
        )}

        {/* ── SPLITS ───────────────────────────────────────── */}
        {tab === 'splits' && (
          <FadeIn delay={0} style={styles.tabContent}>
            <View style={styles.balanceCard}>
              <Text style={styles.cardTitle}>Who Owes Who</Text>
              {GROUP_MEMBERS.map(m => (
                <View key={m.id} style={[styles.memberRow, m.owes > 0 ? styles.memberOwes : styles.memberOwed]}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{m.initials}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{m.name}</Text>
                    <Text style={styles.memberCard}>Use: {m.cardSuggestion}</Text>
                  </View>
                  <View style={styles.memberRight}>
                    <Text style={[styles.memberAmt, { color: m.owes > 0 ? COLORS.red : COLORS.green }]}>
                      {m.owes > 0 ? `owes $${m.owes.toFixed(2)}` : `you owe $${Math.abs(m.owes).toFixed(2)}`}
                    </Text>
                    <Pressable style={styles.remindBtn}><Text style={styles.remindText}>Remind</Text></Pressable>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.expensesCard}>
              <View style={styles.expensesHeader}>
                <Text style={styles.cardTitle}>Group Expenses</Text>
                <Pressable style={styles.addBtn}><Text style={styles.addBtnText}>+ Add</Text></Pressable>
              </View>
              {GROUP_EXPENSES.map(exp => {
                const isSettled = settled.has(exp.id);
                const s = useRef(new Animated.Value(1)).current;
                return (
                  <View key={exp.id} style={[styles.expenseRow, isSettled && styles.expenseSettled]}>
                    <View style={styles.expenseTop}>
                      <View>
                        <Text style={styles.expenseName}>{exp.description}</Text>
                        <Text style={styles.expenseTotal}>Total: ${exp.total.toFixed(2)}</Text>
                      </View>
                      {!isSettled ? (
                        <Pressable
                          onPressIn={() => Animated.spring(s, { toValue: 0.9, ...SPRING }).start()}
                          onPressOut={() => Animated.spring(s, { toValue: 1,   ...SPRING }).start()}
                          onPress={() => handleSettle(exp.id)}
                        >
                          <Animated.View style={[styles.settleBtn, { transform: [{ scale: s }] }]}>
                            <Text style={styles.settleBtnText}>Settle</Text>
                          </Animated.View>
                        </Pressable>
                      ) : (
                        <Text style={styles.settledText}>✓ Settled</Text>
                      )}
                    </View>
                    <View style={styles.splitPills}>
                      {exp.splits.map(split => (
                        <View key={split.name} style={[styles.splitPill, split.paid ? styles.splitPaid : styles.splitPending]}>
                          <Text style={[styles.splitText, { color: split.paid ? COLORS.green : COLORS.red }]}>
                            {split.name}: ${split.amount.toFixed(2)} {split.paid ? '✓' : '•'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          </FadeIn>
        )}

        {/* ── CARDS ────────────────────────────────────────── */}
        {tab === 'cards' && (
          <FadeIn delay={0} style={styles.tabContent}>
            {apiCards.map(card => {
              const uc = USER_CARDS[card.id];
              const fee = card.annualFee ?? 0;
              const pv  = card.pointValuation ?? 1;
              const pts = uc?.pointsBalance ?? 0;
              return (
                <View key={card.id} style={styles.cardDetailRow}>
                  <View style={styles.cardDetailTop}>
                    <View>
                      <Text style={styles.cardDetailName}>{card.cardIssuer} {card.cardName}</Text>
                      <Text style={styles.cardDetailSub}>••••{uc?.last4 ?? '0000'} · {card.cardNetwork}{fee === 0 ? ' · No Fee' : ` · $${fee}/yr`}</Text>
                    </View>
                    <Text style={styles.cardDetailEarned}>${(uc?.totalEarned ?? 0).toLocaleString()}</Text>
                  </View>
                  <View style={styles.rateGrid}>
                    {Object.entries(card.rewardRates).map(([cat, rate]) => (
                      <View key={cat} style={styles.rateChip}>
                        <Text style={styles.rateVal}>{rate}x</Text>
                        <Text style={styles.rateCat}>{cat}</Text>
                      </View>
                    ))}
                  </View>
                  {pts > 0 && (
                    <Text style={styles.pointsNote}>{pts.toLocaleString()} pts · ${((pts * pv) / 100).toFixed(0)} value</Text>
                  )}
                </View>
              );
            })}
          </FadeIn>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tag: { fontSize: 12, color: COLORS.purple, fontWeight: '700', marginBottom: 6 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 3 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, maxWidth: 180 },
  netBadge: { borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)', minWidth: 100 },
  netLabel: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 1 },
  netValue: { fontSize: 22, fontWeight: '800', color: COLORS.green, marginVertical: 2 },
  netSub: { fontSize: 9, color: COLORS.textMuted },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 4, gap: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  tabText: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: '#fff' },
  tabContent: { gap: 14 },
  netGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  netCard: { width: '30%', flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: 4 },
  netIcon: { fontSize: 20 },
  netCardValue: { fontSize: 14, fontWeight: '800' },
  netCardLabel: { fontSize: 8, color: COLORS.textMuted, textAlign: 'center' },
  chartCard: { backgroundColor: COLORS.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: COLORS.border, gap: 6 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  cardSub: { fontSize: 10, color: COLORS.textMuted, marginBottom: 4 },
  breakevenCard: { backgroundColor: COLORS.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: COLORS.border, gap: 14 },
  breakevenRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  breakevenLeft: { width: 130 },
  breakevenName: { fontSize: 11, fontWeight: '600', color: '#fff', marginBottom: 2 },
  breakevenMonths: { fontSize: 10, color: COLORS.textMuted },
  noFeeTag: { fontSize: 9, color: COLORS.green, fontWeight: '700', backgroundColor: 'rgba(74,222,128,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  snapshotRow: { flexDirection: 'row', gap: 8 },
  snapshotCard: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  snapshotVal: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  snapshotLabel: { fontSize: 9, color: COLORS.textMuted },
  balanceCard: { backgroundColor: COLORS.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  memberOwes: { backgroundColor: 'rgba(248,113,113,0.05)', borderColor: 'rgba(248,113,113,0.2)' },
  memberOwed: { backgroundColor: 'rgba(74,222,128,0.05)', borderColor: 'rgba(74,222,128,0.2)' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(167,139,250,0.3)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  memberName: { fontSize: 13, fontWeight: '700', color: '#fff' },
  memberCard: { fontSize: 10, color: COLORS.textMuted },
  memberRight: { alignItems: 'flex-end', gap: 6 },
  memberAmt: { fontSize: 12, fontWeight: '700' },
  remindBtn: { backgroundColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  remindText: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },
  expensesCard: { backgroundColor: COLORS.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  expensesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn: { backgroundColor: 'rgba(74,222,128,0.1)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  addBtnText: { fontSize: 11, color: COLORS.green, fontWeight: '700' },
  expenseRow: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  expenseSettled: { opacity: 0.4 },
  expenseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  expenseName: { fontSize: 13, fontWeight: '700', color: '#fff' },
  expenseTotal: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  settleBtn: { backgroundColor: 'rgba(74,222,128,0.1)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  settleBtnText: { fontSize: 11, color: COLORS.green, fontWeight: '700' },
  settledText: { fontSize: 11, color: COLORS.textMuted },
  splitPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  splitPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  splitPaid: { backgroundColor: 'rgba(74,222,128,0.08)', borderColor: 'rgba(74,222,128,0.25)' },
  splitPending: { backgroundColor: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.25)' },
  splitText: { fontSize: 10, fontWeight: '600' },
  cardDetailRow: { backgroundColor: COLORS.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  cardDetailTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardDetailName: { fontSize: 15, fontWeight: '800', color: '#fff' },
  cardDetailSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 3 },
  cardDetailEarned: { fontSize: 20, fontWeight: '800', color: COLORS.green },
  rateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rateChip: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  rateVal: { fontSize: 13, fontWeight: '800', color: '#fff' },
  rateCat: { fontSize: 8, color: COLORS.textMuted, marginTop: 1, textTransform: 'capitalize' },
  pointsNote: { fontSize: 10, color: COLORS.blue, fontWeight: '600' },
});
