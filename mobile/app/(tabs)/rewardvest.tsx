import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import DonutChart from '@/components/DonutChart';
import AnimatedBar from '@/components/AnimatedBar';
import FadeIn from '@/components/FadeIn';
import { COLORS } from '@/constants/theme';
import { USER_CARDS } from '@/lib/userCards';
import { API_BASE } from '@/lib/apiConfig';

const STOCK_TICKERS = [
  { ticker: 'VOO',  name: 'Vanguard S&P 500',   price: 498.32, changePct:  0.65 },
  { ticker: 'QQQ',  name: 'Invesco Nasdaq 100',  price: 432.18, changePct:  1.27 },
  { ticker: 'SPY',  name: 'SPDR S&P 500',        price: 521.67, changePct:  0.56 },
  { ticker: 'VTI',  name: 'Vanguard Total Mkt',  price: 242.53, changePct: -0.36 },
  { ticker: 'ARKK', name: 'ARK Innovation',      price: 47.83,  changePct:  2.62 },
  { ticker: 'BND',  name: 'Vanguard Bond',       price: 73.14,  changePct: -0.16 },
];

const PORTFOLIO_SPLIT = [
  { name: 'VOO',          pct: 60, color: '#4ade80', desc: 'Vanguard S&P 500 ETF'  },
  { name: 'QQQ',          pct: 25, color: '#60a5fa', desc: 'Invesco Nasdaq 100'    },
  { name: 'Cash Reserve', pct: 15, color: '#a78bfa', desc: 'High-yield savings'    },
];

const MONTHLY_DATA = [
  { month: 'Nov', rewards: 210, savings: 380 },
  { month: 'Dec', rewards: 290, savings: 440 },
  { month: 'Jan', rewards: 245, savings: 390 },
  { month: 'Feb', rewards: 310, savings: 510 },
  { month: 'Mar', rewards: 318, savings: 495 },
  { month: 'Apr', rewards: 340, savings: 520 },
];

const THIS_MONTH   = 340;
const TOTAL_EARNED = Object.values(USER_CARDS).reduce((s, c) => s + c.totalEarned, 0);

const AI_INSIGHTS = [
  'VOO has outperformed 94% of active funds over 10 years — ideal anchor for your rewards.',
  'At $340/mo compounding at 7% annual return, that\'s $48,200 in 10 years.',
  'QQQ\'s tech concentration complements high dining/entertainment spending patterns.',
  'Maintaining 15% cash reserve lets you buy dips without liquidating positions.',
];

const SPRING = { friction: 6, tension: 300, useNativeDriver: true };

type ApiCard = { id: string; cardName: string; cardIssuer: string; cardNetwork: string };

export default function RewardVestScreen() {
  const [portfolioVisible, setPortfolioVisible] = useState(false);
  const [isGenerating,     setIsGenerating]     = useState(false);
  const [insightIdx,       setInsightIdx]        = useState(0);
  const [apiCards,         setApiCards]          = useState<ApiCard[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/rewards`)
      .then(r => r.json())
      .then(setApiCards)
      .catch(() => {});
  }, []);
  const btnScale  = useRef(new Animated.Value(1)).current;
  const spinValue = useRef(new Animated.Value(0)).current;
  const spinAnim  = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setPortfolioVisible(true), 700);
    return () => clearTimeout(t);
  }, []);

  const generate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGenerating(true);
    setPortfolioVisible(false);
    spinValue.setValue(0);
    spinAnim.current = Animated.loop(Animated.timing(spinValue, { toValue: 1, duration: 900, useNativeDriver: true }));
    spinAnim.current.start();
    setTimeout(() => {
      spinAnim.current?.stop();
      setPortfolioVisible(true);
      setIsGenerating(false);
      setInsightIdx(Math.floor(Math.random() * AI_INSIGHTS.length));
    }, 2200);
  };

  const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <FadeIn delay={0}>
          <Text style={styles.tag}>📈 RewardVest</Text>
          <Text style={styles.title}>AI Investment Advisor</Text>
          <Text style={styles.subtitle}>Your rewards aren't just points — they're capital.</Text>
        </FadeIn>

        {/* Stats */}
        <FadeIn delay={60} style={styles.statsRow}>
          {[
            { label: 'This Month',      value: `$${THIS_MONTH}`,               color: COLORS.green  },
            { label: 'All Time',        value: `$${TOTAL_EARNED.toLocaleString()}`, color: COLORS.blue   },
            { label: '10-yr Projected', value: '$48,200',                       color: COLORS.purple },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </FadeIn>

        {/* Portfolio donut */}
        {portfolioVisible && (
          <FadeIn delay={0} style={styles.portfolioCard}>
            <LinearGradient colors={['rgba(96,165,250,0.1)', 'rgba(167,139,250,0.05)']} style={StyleSheet.absoluteFillObject} />
            <Text style={styles.sectionTitle}>Suggested Portfolio</Text>
            <Text style={styles.sectionSub}>For your ${THIS_MONTH} in rewards this month</Text>
            <View style={styles.donutRow}>
              <DonutChart segments={PORTFOLIO_SPLIT} centerLabel={`$${THIS_MONTH}`} centerSub="to invest" size={170} />
              <View style={styles.donutLegend}>
                {PORTFOLIO_SPLIT.map(p => (
                  <View key={p.name} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: p.color }]} />
                    <View>
                      <Text style={styles.legendName}>{p.name}</Text>
                      <Text style={styles.legendDesc}>{p.desc}</Text>
                      <Text style={[styles.legendPct, { color: p.color }]}>{p.pct}% · ${((p.pct / 100) * THIS_MONTH).toFixed(0)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.insightBox}>
              <Text style={styles.insightTag}>🤖 AI Insight</Text>
              <Text style={styles.insightText}>{AI_INSIGHTS[insightIdx]}</Text>
            </View>
          </FadeIn>
        )}

        {/* Generate button */}
        <FadeIn delay={200}>
          <Pressable
            onPressIn={() => Animated.spring(btnScale, { toValue: 0.96, ...SPRING }).start()}
            onPressOut={() => Animated.spring(btnScale, { toValue: 1,    ...SPRING }).start()}
            onPress={generate} disabled={isGenerating}
          >
            <Animated.View style={[styles.generateBtn, { transform: [{ scale: btnScale }] }]}>
              {isGenerating && (
                <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]} />
              )}
              <Text style={styles.generateText}>{isGenerating ? 'Analyzing Market Signals...' : '🤖 Generate AI Portfolio Split'}</Text>
            </Animated.View>
          </Pressable>
        </FadeIn>

        {/* Market grid */}
        <FadeIn delay={260}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitlePlain}>Live Market</Text>
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Open</Text>
            </View>
          </View>
          <View style={styles.tickerGrid}>
            {STOCK_TICKERS.map(s => (
              <View key={s.ticker} style={styles.tickerCard}>
                <View style={styles.tickerTop}>
                  <Text style={styles.tickerSymbol}>{s.ticker}</Text>
                  <Text style={[styles.tickerChange, { color: s.changePct >= 0 ? COLORS.green : COLORS.red }]}>
                    {s.changePct >= 0 ? '▲' : '▼'} {Math.abs(s.changePct).toFixed(2)}%
                  </Text>
                </View>
                <Text style={styles.tickerPrice}>${s.price}</Text>
                <Text style={styles.tickerName} numberOfLines={1}>{s.name}</Text>
              </View>
            ))}
          </View>
        </FadeIn>

        {/* Trend bars */}
        <FadeIn delay={320} style={styles.trendCard}>
          <Text style={styles.sectionTitle}>6-Month Earnings</Text>
          <View style={styles.trendBars}>
            {MONTHLY_DATA.map((d, i) => {
              const maxR = Math.max(...MONTHLY_DATA.map(x => x.rewards));
              return (
                <View key={d.month} style={styles.trendGroup}>
                  <AnimatedBar progress={d.rewards / maxR} delay={i * 80} color={['#4ade80', '#22d3ee']} height={80} style={{ width: 24 }} />
                  <Text style={styles.trendMonth}>{d.month}</Text>
                  <Text style={styles.trendVal}>${d.rewards}</Text>
                </View>
              );
            })}
          </View>
        </FadeIn>

        {/* Per-card */}
        <FadeIn delay={380} style={styles.breakdownCard}>
          <Text style={styles.sectionTitle}>Earnings by Card</Text>
          {apiCards.map((card, i) => {
            const uc = USER_CARDS[card.id];
            const maxEarned = Math.max(...Object.values(USER_CARDS).map(c => c.totalEarned), 1);
            return (
              <View key={card.id} style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <Text style={styles.breakdownName}>{card.cardIssuer} {card.cardName}</Text>
                  <Text style={styles.breakdownLast}>••••{uc?.last4 ?? '0000'}</Text>
                </View>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <AnimatedBar progress={(uc?.totalEarned ?? 0) / maxEarned} delay={i * 80} color={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.08)']} height={5} />
                </View>
                <Text style={styles.breakdownVal}>${(uc?.totalEarned ?? 0).toLocaleString()}</Text>
              </View>
            );
          })}
        </FadeIn>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16 },
  tag: { fontSize: 12, color: COLORS.blue, fontWeight: '700', marginBottom: 6 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 4 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 4 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 9, color: COLORS.textMuted },
  portfolioCard: { borderRadius: 20, overflow: 'hidden', padding: 20, borderWidth: 1, borderColor: 'rgba(96,165,250,0.2)', gap: 14, backgroundColor: COLORS.bgCard },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  sectionSub: { fontSize: 11, color: COLORS.textMuted, marginTop: -10 },
  sectionTitlePlain: { fontSize: 15, fontWeight: '700', color: '#fff' },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  donutLegend: { flex: 1, gap: 12 },
  legendItem: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  legendDot: { width: 10, height: 10, borderRadius: 3, marginTop: 3 },
  legendName: { fontSize: 12, fontWeight: '700', color: '#fff' },
  legendDesc: { fontSize: 9, color: COLORS.textMuted },
  legendPct: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  insightBox: { backgroundColor: 'rgba(96,165,250,0.07)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(96,165,250,0.2)', gap: 6 },
  insightTag: { fontSize: 11, color: COLORS.blue, fontWeight: '700' },
  insightText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 16, backgroundColor: COLORS.blue },
  spinner: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' },
  generateText: { fontSize: 15, fontWeight: '800', color: '#000' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.green },
  liveText: { fontSize: 11, color: COLORS.green, fontWeight: '600' },
  tickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tickerCard: { width: '30.5%', backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border, gap: 3 },
  tickerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tickerSymbol: { fontSize: 11, fontWeight: '800', color: '#fff' },
  tickerChange: { fontSize: 9, fontWeight: '700' },
  tickerPrice: { fontSize: 16, fontWeight: '800', color: '#fff' },
  tickerName: { fontSize: 8, color: COLORS.textMuted },
  trendCard: { backgroundColor: COLORS.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: COLORS.border, gap: 16 },
  trendBars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 110 },
  trendGroup: { alignItems: 'center', gap: 4, justifyContent: 'flex-end', flex: 1 },
  trendMonth: { fontSize: 9, color: COLORS.textMuted },
  trendVal: { fontSize: 8, color: COLORS.green, fontWeight: '700' },
  breakdownCard: { backgroundColor: COLORS.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: COLORS.border, gap: 14 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center' },
  breakdownLeft: { width: 100 },
  breakdownName: { fontSize: 11, fontWeight: '700', color: '#fff' },
  breakdownLast: { fontSize: 9, color: COLORS.textMuted },
  breakdownVal: { fontSize: 12, fontWeight: '700', color: '#fff', width: 50, textAlign: 'right' },
});
