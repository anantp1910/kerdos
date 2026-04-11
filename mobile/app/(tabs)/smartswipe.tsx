import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import CreditCard from '@/components/CreditCard';
import AnimatedBar from '@/components/AnimatedBar';
import FadeIn from '@/components/FadeIn';
import { COLORS } from '@/constants/theme';
import { CATEGORIES, getRankedCards } from '@/lib/mockData';

const SPRING = { friction: 6, tension: 300, useNativeDriver: true };

export default function SmartSwipeScreen() {
  const [amount,      setAmount]      = useState('100');
  const [category,    setCategory]    = useState('dining');
  const [results,     setResults]     = useState<ReturnType<typeof getRankedCards> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const btnScale = useRef(new Animated.Value(1)).current;

  const parsedAmount = parseFloat(amount) || 0;
  const barMax = results ? results[0].score : 1;

  const analyze = () => {
    if (parsedAmount <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsAnalyzing(true);
    setResults(null);
    setTimeout(() => {
      setResults(getRankedCards(category, parsedAmount));
      setIsAnalyzing(false);
    }, 600);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <FadeIn delay={0}>
            <Text style={styles.tag}>💳 SmartSwipe</Text>
            <Text style={styles.title}>Best Card Recommender</Text>
            <Text style={styles.subtitle}>Which card earns the most for this purchase?</Text>
          </FadeIn>

          {/* Amount */}
          <FadeIn delay={60} style={styles.card}>
            <Text style={styles.cardLabel}>TRANSACTION AMOUNT</Text>
            <View style={styles.amountRow}>
              <Text style={styles.dollar}>$</Text>
              <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={styles.amountInput} placeholderTextColor={COLORS.textMuted} placeholder="0.00" />
            </View>
          </FadeIn>

          {/* Category pills */}
          <FadeIn delay={120} style={styles.card}>
            <Text style={styles.cardLabel}>PURCHASE CATEGORY</Text>
            <View style={styles.pillGrid}>
              {CATEGORIES.map(cat => {
                const active = category === cat.id;
                const s = useRef(new Animated.Value(1)).current;
                return (
                  <Pressable
                    key={cat.id}
                    onPressIn={() => Animated.spring(s, { toValue: 0.93, ...SPRING }).start()}
                    onPressOut={() => Animated.spring(s, { toValue: 1,    ...SPRING }).start()}
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

          {/* CTA */}
          <FadeIn delay={180}>
            <Pressable
              onPressIn={() => Animated.spring(btnScale, { toValue: 0.96, ...SPRING }).start()}
              onPressOut={() => Animated.spring(btnScale, { toValue: 1,    ...SPRING }).start()}
              onPress={analyze}
              disabled={parsedAmount <= 0 || isAnalyzing}
            >
              <Animated.View style={[styles.analyzeBtn, parsedAmount <= 0 && styles.btnDisabled, { transform: [{ scale: btnScale }] }]}>
                <Text style={styles.analyzeBtnText}>{isAnalyzing ? 'Analyzing...' : 'Analyze My Cards →'}</Text>
              </Animated.View>
            </Pressable>
          </FadeIn>

          {/* Results */}
          {results && (
            <FadeIn delay={0} style={styles.results}>
              {/* Winner */}
              <View style={styles.winnerSection}>
                <Text style={styles.winnerLabel}>⚡ Best Card</Text>
                <View style={styles.winnerRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.winnerIssuer}>{results[0].card.issuer}</Text>
                    <Text style={styles.winnerName}>{results[0].card.name}</Text>
                    <Text style={styles.winnerScore}>${results[0].score.toFixed(2)}</Text>
                    <Text style={styles.winnerSub}>{results[0].rate}x · ••••{results[0].card.last4}</Text>
                  </View>
                  <CreditCard card={results[0].card} isBest width={150} score={results[0].score} rate={results[0].rate} />
                </View>
              </View>

              {/* Ranked list */}
              <View style={styles.rankedSection}>
                <Text style={styles.rankedTitle}>All Cards Ranked</Text>
                {results.map((r, i) => (
                  <View key={r.card.id} style={styles.rankRow}>
                    <View style={[styles.rankBadge, i === 0 && styles.rankBadgeWinner]}>
                      <Text style={[styles.rankNum, i === 0 && styles.rankNumWinner]}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={styles.rankTopRow}>
                        <Text style={styles.rankName}>{r.card.issuer} {r.card.name}</Text>
                        <Text style={[styles.rankScore, i === 0 && { color: COLORS.green }]}>${r.score.toFixed(2)}  <Text style={styles.rankRate}>{r.rate}x</Text></Text>
                      </View>
                      <AnimatedBar
                        progress={r.score / barMax}
                        delay={i * 80 + 100}
                        color={i === 0 ? ['#4ade80', '#22d3ee'] : ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)']}
                        height={6}
                      />
                    </View>
                  </View>
                ))}
              </View>

              {/* AI insight */}
              <View style={styles.insight}>
                <Text style={styles.insightTag}>🤖 CardIQ Insight</Text>
                <Text style={styles.insightText}>
                  Using <Text style={styles.insightBold}>{results[0].card.issuer} {results[0].card.name}</Text> earns{' '}
                  <Text style={{ color: COLORS.green }}>${results[0].score.toFixed(2)}</Text>
                  {' '}— <Text style={styles.insightBold}>${(results[0].score - results[results.length - 1].score).toFixed(2)} more</Text> than your worst card.
                </Text>
              </View>
            </FadeIn>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 14 },
  tag: { fontSize: 12, color: COLORS.green, fontWeight: '700', marginBottom: 6 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 6 },
  card: { backgroundColor: COLORS.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: COLORS.border, gap: 14 },
  cardLabel: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2, fontWeight: '600' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dollar: { fontSize: 32, fontWeight: '700', color: COLORS.textMuted },
  amountInput: { flex: 1, fontSize: 40, fontWeight: '800', color: '#fff' },
  pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: COLORS.border },
  pillActive: { backgroundColor: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.5)' },
  pillEmoji: { fontSize: 20 },
  pillLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  pillLabelActive: { color: COLORS.green },
  analyzeBtn: { backgroundColor: COLORS.green, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  analyzeBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },
  results: { gap: 14 },
  winnerSection: { backgroundColor: 'rgba(74,222,128,0.08)', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)', gap: 14 },
  winnerLabel: { fontSize: 12, color: COLORS.green, fontWeight: '800', letterSpacing: 1 },
  winnerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  winnerIssuer: { fontSize: 20, fontWeight: '800', color: '#fff' },
  winnerName: { fontSize: 13, color: COLORS.textSecondary, marginTop: 1 },
  winnerScore: { fontSize: 32, fontWeight: '800', color: COLORS.green, marginTop: 8 },
  winnerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  rankedSection: { backgroundColor: COLORS.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: COLORS.border, gap: 14 },
  rankedTitle: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 1.5 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  rankBadgeWinner: { backgroundColor: COLORS.green },
  rankNum: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted },
  rankNumWinner: { color: '#000' },
  rankTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  rankName: { fontSize: 12, color: '#fff', fontWeight: '500' },
  rankScore: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  rankRate: { fontSize: 10, color: COLORS.textMuted },
  insight: { backgroundColor: 'rgba(96,165,250,0.07)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(96,165,250,0.2)', gap: 6 },
  insightTag: { fontSize: 11, color: COLORS.blue, fontWeight: '700' },
  insightText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  insightBold: { color: '#fff', fontWeight: '700' },
});
