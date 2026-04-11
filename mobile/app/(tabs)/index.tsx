import React, { useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import HealthOrb from '@/components/HealthOrb';
import CreditCard, { type CreditCard as CreditCardType } from '@/components/CreditCard';
import FadeIn from '@/components/FadeIn';
import { COLORS } from '@/constants/theme';
import { USER_CARDS } from '@/lib/userCards';
import { API_BASE } from '@/lib/apiConfig';

const CATEGORY_ICONS: Record<string, string> = {
  dining:        '🍽️',
  groceries:     '🛒',
  travel:        '✈️',
  gas:           '⛽',
  entertainment: '🎬',
  other:         '🛍️',
};

const RECENT_TRANSACTIONS = [
  { id: 't1', cardId: 'amex-gold',      merchant: 'Nobu Malibu',      date: 'Today',      category: 'dining',    amount: 284.50, cashback: 14.22 },
  { id: 't2', cardId: 'chase-sapphire', merchant: 'Whole Foods',      date: 'Yesterday',  category: 'groceries', amount: 93.40,  cashback: 2.80  },
  { id: 't3', cardId: 'amex-gold',      merchant: 'Delta Airlines',   date: 'Apr 8',      category: 'travel',    amount: 540.00, cashback: 16.20 },
  { id: 't4', cardId: 'citi-double',    merchant: 'Shell Gas',        date: 'Apr 7',      category: 'gas',       amount: 68.00,  cashback: 1.36  },
  { id: 't5', cardId: 'discover-it',    merchant: 'Netflix',          date: 'Apr 6',      category: 'entertainment', amount: 22.99, cashback: 1.38 },
];

const FEATURES = [
  { href: '/(tabs)/smartswipe', emoji: '💳', title: 'SmartSwipe', sub: 'Best card for any purchase', accent: COLORS.green, dim: COLORS.greenDim },
  { href: '/(tabs)/rewardvest', emoji: '📈', title: 'RewardVest', sub: 'Invest your rewards',        accent: COLORS.blue,  dim: COLORS.blueDim  },
  { href: '/(tabs)/wealthsplit',emoji: '⚖️', title: 'WealthSplit', sub: 'Financial command center',  accent: COLORS.purple,dim: COLORS.purpleDim },
];

function FeatureCard({ emoji, title, sub, accent, dim, onPress }: typeof FEATURES[0] & { onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPressIn={() => Animated.spring(scale, { toValue: 0.95, friction: 6, tension: 300, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1,    friction: 6, tension: 300, useNativeDriver: true }).start()}
      onPress={onPress}
      style={{ flex: 1 }}
    >
      <Animated.View style={[styles.featureCard, { backgroundColor: dim, borderColor: accent + '33', transform: [{ scale }] }]}>
        <Text style={styles.featureEmoji}>{emoji}</Text>
        <Text style={[styles.featureTitle, { color: accent }]}>{title}</Text>
        <Text style={styles.featureSub}>{sub}</Text>
        <Text style={[styles.featureArrow, { color: accent }]}>→</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<CreditCardType[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/rewards`)
      .then(r => r.json())
      .then((apiCards: any[]) => {
        const merged: CreditCardType[] = apiCards.map(c => ({
          id:      c.id,
          issuer:  c.cardIssuer ?? c.id,
          name:    c.cardName   ?? c.id,
          last4:   USER_CARDS[c.id]?.last4   ?? '0000',
          network: c.cardNetwork ?? '',
          color:   USER_CARDS[c.id]?.color   ?? 'other',
        }));
        setCards(merged);
      })
      .catch(() => {});
  }, []);

  const totalPoints   = Object.values(USER_CARDS).reduce((s, c) => s + c.pointsBalance, 0);
  const totalCashback = Object.values(USER_CARDS).reduce((s, c) => s + c.totalEarned, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <FadeIn delay={0} style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning 👋</Text>
            <Text style={styles.logo}>Card<Text style={styles.logoAccent}>IQ</Text></Text>
          </View>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>5 cards active</Text>
          </View>
        </FadeIn>

        {/* Orb */}
        <FadeIn delay={80} style={styles.orbSection}>
          <HealthOrb score={87} />
          <View style={styles.quickStats}>
            <View style={styles.quickStat}>
              <Text style={[styles.quickValue, { color: COLORS.blue }]}>{(totalPoints / 1000).toFixed(0)}K</Text>
              <Text style={styles.quickLabel}>Points</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.quickStat}>
              <Text style={[styles.quickValue, { color: COLORS.green }]}>${(totalCashback / 1000).toFixed(1)}K</Text>
              <Text style={styles.quickLabel}>Earned</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.quickStat}>
              <Text style={[styles.quickValue, { color: COLORS.purple }]}>{Object.keys(USER_CARDS).length}</Text>
              <Text style={styles.quickLabel}>Cards</Text>
            </View>
          </View>
          <Text style={styles.orbSubtitle}>↑ 12 pts from last month · Excellent</Text>
        </FadeIn>

        {/* Net banner */}
        <FadeIn delay={160}>
          <LinearGradient
            colors={['rgba(74,222,128,0.12)', 'rgba(34,211,238,0.06)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.banner}
          >
            <View>
              <Text style={styles.bannerLabel}>Net Gain This Month</Text>
              <Text style={styles.bannerValue}>+$847</Text>
            </View>
            <View style={styles.bannerRight}>
              {[['$340','Cashback'],['$284','Saved vs debit'],['-$89','Card fees']].map(([v,l]) => (
                <View key={l}>
                  <Text style={styles.bsValue}>{v}</Text>
                  <Text style={styles.bsLabel}>{l}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </FadeIn>

        {/* Features */}
        <FadeIn delay={240} style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featuresGrid}>
            {FEATURES.map(f => (
              <FeatureCard
                key={f.title} {...f}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(f.href as any); }}
              />
            ))}
          </View>
        </FadeIn>

        {/* Cards carousel */}
        <FadeIn delay={300} style={styles.section}>
          <Text style={styles.sectionTitle}>Your Cards</Text>
        </FadeIn>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardScroll}>
          {cards.map(card => <CreditCard key={card.id} card={card} width={200} />)}
        </ScrollView>

        {/* Transactions */}
        <FadeIn delay={360} style={styles.section}>
          <Text style={styles.sectionTitle}>Recent</Text>
          {RECENT_TRANSACTIONS.map(tx => {
            const card = cards.find(c => c.id === tx.cardId);
            return (
              <View key={tx.id} style={styles.txRow}>
                <View style={styles.txIcon}>
                  <Text style={styles.txEmoji}>{CATEGORY_ICONS[tx.category]}</Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txMerchant}>{tx.merchant}</Text>
                  <Text style={styles.txMeta}>{tx.date} · {card?.name}</Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={styles.txAmount}>-${tx.amount.toFixed(2)}</Text>
                  <Text style={styles.txCashback}>+${tx.cashback.toFixed(2)}</Text>
                </View>
              </View>
            );
          })}
        </FadeIn>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { paddingBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  greeting: { fontSize: 12, color: COLORS.textMuted, marginBottom: 2 },
  logo: { fontSize: 26, fontWeight: '800', color: '#fff' },
  logoAccent: { color: COLORS.green },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.green },
  liveText: { fontSize: 11, color: COLORS.textSecondary },
  orbSection: { alignItems: 'center', paddingVertical: 20, gap: 14 },
  quickStats: { flexDirection: 'row', alignItems: 'center', gap: 24, backgroundColor: COLORS.bgCard, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.border },
  quickStat: { alignItems: 'center' },
  quickValue: { fontSize: 20, fontWeight: '800' },
  quickLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.border },
  orbSubtitle: { fontSize: 12, color: COLORS.green, fontWeight: '600' },
  banner: { marginHorizontal: 20, borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)', marginBottom: 4 },
  bannerLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 4 },
  bannerValue: { fontSize: 28, fontWeight: '800', color: COLORS.green },
  bannerRight: { gap: 6 },
  bsValue: { fontSize: 13, fontWeight: '700', color: '#fff', textAlign: 'right' },
  bsLabel: { fontSize: 9, color: COLORS.textMuted, textAlign: 'right' },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 12 },
  featuresGrid: { flexDirection: 'row', gap: 10 },
  featureCard: { borderRadius: 16, padding: 14, borderWidth: 1, gap: 4 },
  featureEmoji: { fontSize: 22, marginBottom: 4 },
  featureTitle: { fontSize: 14, fontWeight: '800' },
  featureSub: { fontSize: 10, color: COLORS.textMuted, lineHeight: 14 },
  featureArrow: { fontSize: 16, fontWeight: '700', marginTop: 6 },
  cardScroll: { paddingHorizontal: 20, gap: 12, paddingBottom: 4, paddingTop: 4 },
  txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  txIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  txEmoji: { fontSize: 18 },
  txInfo: { flex: 1 },
  txMerchant: { fontSize: 13, fontWeight: '600', color: '#fff' },
  txMeta: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 13, fontWeight: '600', color: '#fff' },
  txCashback: { fontSize: 11, color: COLORS.green, marginTop: 2 },
});
