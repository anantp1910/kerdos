import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  TextInput, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AnimatedBar from '@/components/AnimatedBar';
import FadeIn from '@/components/FadeIn';
import { COLORS } from '@/constants/theme';
import { USER_CARDS } from '@/lib/userCards';
import { API_BASE } from '@/lib/apiConfig';
import { addSwipeTransaction } from '@/lib/transactionStore';

const CATEGORIES = [
  { id: 'dining',        label: 'Dining',       icon: '🍽️' },
  { id: 'groceries',    label: 'Groceries',     icon: '🛒' },
  { id: 'travel',       label: 'Travel',        icon: '✈️' },
  { id: 'gas',          label: 'Gas',           icon: '⛽' },
  { id: 'entertainment',label: 'Entertainment', icon: '🎬' },
  { id: 'other',        label: 'Other',         icon: '🛍️' },
];

type ApiCard = {
  id: string;
  cardKey: string;
  cardName: string;
  cardIssuer: string;
  cardNetwork: string;
  annualFee: number;
  pointValuation: number;
  isCashback: boolean;
  rewardRates: Record<string, number>;
};

type CardResult = { card: ApiCard; score: number; rate: number };

function rankCards(cards: ApiCard[], category: string, amount: number): CardResult[] {
  return cards.map(card => {
    const rate = card.rewardRates[category] ?? card.rewardRates['other'] ?? 1;
    const score = card.isCashback
      ? (rate / 100) * amount
      : (rate / 100) * (card.pointValuation ?? 1) * amount;
    return { card, score, rate };
  }).sort((a, b) => b.score - a.score);
}

const SPRING = { friction: 6, tension: 300, useNativeDriver: true };

export default function SmartSwipeScreen() {
  const [cards,       setCards]       = useState<ApiCard[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [amount,      setAmount]      = useState('');
  const [merchant,    setMerchant]    = useState('');
  const [category,    setCategory]    = useState('dining');
  const [results,     setResults]     = useState<CardResult[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const btnScale = useRef(new Animated.Value(1)).current;

  const parsedAmount = parseFloat(amount) || 0;
  const barMax = results ? results[0].score : 1;

  useEffect(() => {
    fetch(`${API_BASE}/api/rewards`)
      .then(r => r.json())
      .then(setCards)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const analyze = () => {
    if (parsedAmount <= 0 || !cards.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsAnalyzing(true);
    setResults(null);
    setTimeout(() => {
      setResults(rankCards(cards, category, parsedAmount));
      setIsAnalyzing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 700);
  };

  const reset = () => {
    setResults(null);
    setAmount('');
    setMerchant('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <FadeIn delay={0}>
            <View style={styles.header}>
              <View style={styles.tagRow}>
                <View style={styles.tagDot} />
                <Text style={styles.tag}>SMARTSWIPE</Text>
              </View>
              <Text style={styles.title}>Best Card{'\n'}Recommender</Text>
              <Text style={styles.subtitle}>
                {loading ? 'Loading live reward rates...' : 'Enter a purchase — we rank every card instantly.'}
              </Text>
            </View>
          </FadeIn>

          {/* Amount */}
          <FadeIn delay={60} style={styles.card}>
            <Text style={styles.cardLabel}>TRANSACTION AMOUNT</Text>
            <View style={styles.amountRow}>
              <Text style={styles.dollar}>$</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                style={styles.amountInput}
                placeholderTextColor={COLORS.textMuted}
                placeholder="0.00"
                returnKeyType="done"
              />
              {amount.length > 0 && (
                <Pressable onPress={() => setAmount('')} style={styles.clearBtn}>
                  <Text style={styles.clearText}>✕</Text>
                </Pressable>
              )}
            </View>
          </FadeIn>

          {/* Merchant */}
          <FadeIn delay={100} style={styles.card}>
            <Text style={styles.cardLabel}>MERCHANT (OPTIONAL)</Text>
            <TextInput
              value={merchant}
              onChangeText={setMerchant}
              style={styles.merchantInput}
              placeholderTextColor={COLORS.textMuted}
              placeholder="e.g. Nobu, Whole Foods, Delta..."
              returnKeyType="done"
            />
          </FadeIn>

          {/* Category */}
          <FadeIn delay={140} style={styles.card}>
            <Text style={styles.cardLabel}>PURCHASE CATEGORY</Text>
            <View style={styles.pillGrid}>
              {CATEGORIES.map(cat => {
                const active = category === cat.id;
                const s = useRef(new Animated.Value(1)).current;
                return (
                  <Pressable
                    key={cat.id}
                    onPressIn={() => Animated.spring(s, { toValue: 0.93, ...SPRING }).start()}
                    onPressOut={() => Animated.spring(s, { toValue: 1, ...SPRING }).start()}
                    onPress={() => { Haptics.selectionAsync(); setCategory(cat.id); setResults(null); }}
                    style={{ flex: 1, minWidth: '30%', maxWidth: '33%' }}
                  >
                    <Animated.View style={[styles.pill, active && styles.pillActive, { transform: [{ scale: s }] }]}>
                      <Text style={styles.pillEmoji}>{cat.icon}</Text>
                      <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{cat.label}</Text>
                    </Animated.View>
                  </Pressable>
                );
              })}
            </View>
          </FadeIn>

          {/* Analyze button */}
          <FadeIn delay={180}>
            <Pressable
              onPressIn={() => Animated.spring(btnScale, { toValue: 0.96, ...SPRING }).start()}
              onPressOut={() => Animated.spring(btnScale, { toValue: 1, ...SPRING }).start()}
              onPress={analyze}
              disabled={parsedAmount <= 0 || isAnalyzing || loading}
            >
              <Animated.View style={[styles.analyzeBtn, (parsedAmount <= 0 || loading) && styles.btnDisabled, { transform: [{ scale: btnScale }] }]}>
                <Text style={[styles.analyzeBtnText, (parsedAmount <= 0 || loading) && styles.btnTextDisabled]}>
                  {isAnalyzing ? 'Analyzing...' : loading ? 'Loading rates...' : 'Analyze My Cards →'}
                </Text>
              </Animated.View>
            </Pressable>
          </FadeIn>

          {/* Results */}
          {results && (
            <FadeIn delay={0}>

              {/* Winner */}
              <LinearGradient
                colors={['rgba(74,222,128,0.12)', 'rgba(34,211,238,0.05)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.winner}
              >
                <Text style={styles.winnerTag}>⚡ BEST CARD</Text>
                <View style={styles.winnerBody}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.winnerIssuer}>{results[0].card.cardIssuer}</Text>
                    <Text style={styles.winnerName}>{results[0].card.cardName}</Text>
                    <Text style={styles.winnerScore}>${results[0].score.toFixed(2)}</Text>
                    <Text style={styles.winnerSub}>
                      {results[0].rate}x on {CATEGORIES.find(c => c.id === category)?.label} · ••••{USER_CARDS[results[0].card.id]?.last4}
                    </Text>
                    <View style={styles.winnerBadge}>
                      <Text style={styles.winnerBadgeText}>
                        +${(results[0].score - results[results.length - 1].score).toFixed(2)} vs worst card
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardChip}>
                    <Text style={styles.cardChipText}>{results[0].card.cardNetwork}</Text>
                    <Text style={styles.cardChipLast}>••••{USER_CARDS[results[0].card.id]?.last4}</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Ranked list */}
              <View style={styles.rankedSection}>
                <Text style={styles.rankedTitle}>ALL CARDS RANKED</Text>
                {results.map((r, i) => (
                  <View key={r.card.id} style={styles.rankRow}>
                    <View style={[styles.rankBadge, i === 0 && styles.rankBadgeWinner]}>
                      <Text style={[styles.rankNum, i === 0 && styles.rankNumWinner]}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={styles.rankTopRow}>
                        <Text style={styles.rankName}>
                          {r.card.cardIssuer} <Text style={styles.rankNameSub}>{r.card.cardName}</Text>
                        </Text>
                        <Text style={[styles.rankScore, i === 0 && { color: COLORS.green }]}>
                          ${r.score.toFixed(2)}
                          <Text style={styles.rankRate}>  {r.rate}x</Text>
                        </Text>
                      </View>
                      <AnimatedBar
                        progress={r.score / barMax}
                        delay={i * 80 + 100}
                        color={i === 0 ? ['#4ade80', '#22d3ee'] : ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)']}
                        height={5}
                      />
                    </View>
                  </View>
                ))}
              </View>

              {/* AI insight */}
              <View style={styles.insight}>
                <Text style={styles.insightTag}>🤖 CardIQ Insight</Text>
                <Text style={styles.insightText}>
                  Using{' '}
                  <Text style={styles.insightBold}>{results[0].card.cardIssuer} {results[0].card.cardName}</Text>
                  {' '}earns{' '}
                  <Text style={{ color: COLORS.green }}>${results[0].score.toFixed(2)}</Text>
                  {' '}on this ${parsedAmount.toFixed(2)} {CATEGORIES.find(c => c.id === category)?.label.toLowerCase()} purchase —{' '}
                  <Text style={styles.insightBold}>
                    ${(results[0].score - results[results.length - 1].score).toFixed(2)} more
                  </Text>
                  {' '}than your worst card.
                </Text>
              </View>

              {/* Use this card */}
              <Pressable
                style={styles.useCardBtn}
                onPress={() => {
                  addSwipeTransaction({
                    merchant: merchant || 'Unknown Merchant',
                    amount: parsedAmount,
                    cardName: results[0].card.cardName,
                    cardIssuer: results[0].card.cardIssuer,
                    cashback: results[0].score,
                    category,
                  });
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  reset();
                }}
              >
                <Text style={styles.useCardBtnText}>✓ Used this card — log transaction</Text>
              </Pressable>

              {/* Reset */}
              <Pressable onPress={reset} style={styles.resetBtn}>
                <Text style={styles.resetText}>← New Analysis</Text>
              </Pressable>

            </FadeIn>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  scroll:  { flex: 1 },
  content: { padding: 20, gap: 14 },

  header:   { gap: 6, marginBottom: 4 },
  tagRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tagDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.green },
  tag:      { fontSize: 11, color: COLORS.green, fontWeight: '700', letterSpacing: 1.5 },
  title:    { fontSize: 30, fontWeight: '800', color: '#fff', lineHeight: 36 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  card:      { backgroundColor: COLORS.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  cardLabel: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2, fontWeight: '700' },

  amountRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dollar:      { fontSize: 36, fontWeight: '700', color: COLORS.textMuted },
  amountInput: { flex: 1, fontSize: 44, fontWeight: '800', color: '#fff' },
  clearBtn:    { padding: 8 },
  clearText:   { fontSize: 14, color: COLORS.textMuted },

  merchantInput: { fontSize: 15, color: '#fff', paddingVertical: 10, borderBottomWidth: 1, borderColor: COLORS.border },

  pillGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:            { alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: COLORS.border },
  pillActive:      { backgroundColor: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.5)' },
  pillEmoji:       { fontSize: 20 },
  pillLabel:       { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  pillLabelActive: { color: COLORS.green },

  analyzeBtn:      { backgroundColor: COLORS.green, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  btnDisabled:     { backgroundColor: 'rgba(255,255,255,0.06)' },
  analyzeBtnText:  { fontSize: 16, fontWeight: '800', color: '#000' },
  btnTextDisabled: { color: COLORS.textMuted },

  winner:       { borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)', gap: 12 },
  winnerTag:    { fontSize: 11, color: COLORS.green, fontWeight: '800', letterSpacing: 2 },
  winnerBody:   { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  winnerIssuer: { fontSize: 22, fontWeight: '800', color: '#fff' },
  winnerName:   { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  winnerScore:  { fontSize: 38, fontWeight: '800', color: COLORS.green, marginTop: 10 },
  winnerSub:    { fontSize: 11, color: COLORS.textMuted, marginTop: 3 },
  winnerBadge:  { marginTop: 10, alignSelf: 'flex-start', backgroundColor: 'rgba(74,222,128,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  winnerBadgeText: { fontSize: 11, color: COLORS.green, fontWeight: '700' },

  cardChip:     { width: 90, height: 56, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)', justifyContent: 'flex-end', padding: 8 },
  cardChipText: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
  cardChipLast: { fontSize: 12, color: '#fff', fontWeight: '700', marginTop: 2 },

  rankedSection: { backgroundColor: COLORS.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: COLORS.border, gap: 16 },
  rankedTitle:   { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 2 },
  rankRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankBadge:     { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  rankBadgeWinner: { backgroundColor: COLORS.green },
  rankNum:       { fontSize: 11, fontWeight: '800', color: COLORS.textMuted },
  rankNumWinner: { color: '#000' },
  rankTopRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rankName:      { fontSize: 13, color: '#fff', fontWeight: '600' },
  rankNameSub:   { color: COLORS.textSecondary, fontWeight: '400' },
  rankScore:     { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  rankRate:      { fontSize: 10, color: COLORS.textMuted, fontWeight: '400' },

  insight:     { backgroundColor: 'rgba(96,165,250,0.07)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(96,165,250,0.2)', gap: 6 },
  insightTag:  { fontSize: 11, color: COLORS.blue, fontWeight: '700' },
  insightText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  insightBold: { color: '#fff', fontWeight: '700' },

  useCardBtn: { backgroundColor: '#1c3a1c', borderWidth: 1, borderColor: COLORS.green, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  useCardBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.green },
  resetBtn:  { alignItems: 'center', paddingVertical: 14 },
  resetText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
});
