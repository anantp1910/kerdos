import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  Animated, Easing, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { COLORS } from '@/constants/theme';
import { USER_CARDS } from '@/lib/userCards';
import { API_BASE } from '@/lib/apiConfig';
import { getSwipeTransactions, subscribeTransactions, type SwipeTransaction } from '@/lib/transactionStore';

// ─── Types ────────────────────────────────────────────────────────────────────
type PlaidTx = {
  transaction_id: string;
  name: string;
  merchant_name?: string;
  amount: number;
  date: string;
  category?: string[];
};

// ─── Ticker data ──────────────────────────────────────────────────────────────
const TICKERS = [
  { label: 'DJIA',    value: '+0.37%', up: true  },
  { label: 'NASDAQ',  value: '-0.02%', up: false },
  { label: 'S&P 500', value: '+0.73%', up: true  },
  { label: 'VIX',     value: '-1.14%', up: false },
  { label: '10Y',     value: '+0.05%', up: true  },
];

// ─── Card accounts from USER_CARDS ───────────────────────────────────────────
const CARD_META: Record<string, { displayName: string; issuer: string; type: 'cashback' | 'points' }> = {
  'amex-gold':       { displayName: 'Gold Card',      issuer: 'American Express', type: 'points'   },
  'chase-sapphire':  { displayName: 'Sapphire Preferred', issuer: 'Chase',        type: 'points'   },
  'citi-double':     { displayName: 'Double Cash',    issuer: 'Citi',             type: 'cashback' },
  'discover-it':     { displayName: 'Discover it',    issuer: 'Discover',         type: 'cashback' },
  'capital-venture': { displayName: 'Venture',        issuer: 'Capital One',      type: 'points'   },
};

const CATEGORY_ICON: Record<string, string> = {
  'Food and Drink': '🍽️',
  'Restaurants':    '🍽️',
  'Travel':         '✈️',
  'Shops':          '🛍️',
  'Gas Stations':   '⛽',
  'Entertainment':  '🎬',
  'Groceries':      '🛒',
};

function categoryIcon(cats?: string[]): string {
  if (!cats) return '🛍️';
  for (const c of cats) {
    if (CATEGORY_ICON[c]) return CATEGORY_ICON[c];
  }
  return '🛍️';
}

// ─── Scrolling ticker ──────────────────────────────────────────────────────────
function TickerBar() {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(x, { toValue: -380, duration: 18000, easing: Easing.linear, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, []);
  const items = [...TICKERS, ...TICKERS, ...TICKERS];
  return (
    <View style={styles.tickerWrap}>
      <Animated.View style={[styles.tickerRow, { transform: [{ translateX: x }] }]}>
        {items.map((t, i) => (
          <View key={i} style={styles.tickerItem}>
            <Text style={styles.tickerLabel}>{t.label} </Text>
            <Text style={[styles.tickerValue, t.up ? styles.green : styles.red]}>{t.value}</Text>
            <Text style={styles.tickerDiv}>   |   </Text>
          </View>
        ))}
      </Animated.View>
      <View style={styles.tickerRight}>
        <Text style={styles.tickerAs}>As of 4:00 PM ET</Text>
      </View>
    </View>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [plaidTxs, setPlaidTxs]       = useState<PlaidTx[]>([]);
  const [swipeTxs, setSwipeTxs]       = useState<SwipeTransaction[]>(getSwipeTransactions());
  const [txFilter, setTxFilter]       = useState<'all' | 'recent' | 'today'>('all');
  const [plaidLoading, setPlaidLoading] = useState(false);
  const [plaidLinking, setPlaidLinking] = useState(false);

  // Totals from USER_CARDS
  const totalCashback  = Object.values(USER_CARDS).reduce((s, c) => s + c.totalEarned, 0);
  const totalPoints    = Object.values(USER_CARDS).reduce((s, c) => s + c.pointsBalance, 0);
  const pointsValue    = totalPoints * 0.01; // ~1¢/pt
  const totalRewards   = totalCashback + pointsValue;
  const monthlyGain    = 340.00;
  const monthlyPct     = ((monthlyGain / totalRewards) * 100).toFixed(2);

  // Fetch Plaid transactions
  const fetchTransactions = useCallback(() => {
    setPlaidLoading(true);
    fetch(`${API_BASE}/api/plaid/transactions`)
      .then(r => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPlaidTxs(data.slice(0, 20));
      })
      .catch(() => {})
      .finally(() => setPlaidLoading(false));
  }, []);

  useEffect(() => {
    fetchTransactions();
    // Subscribe to SwartSwipe transactions
    const unsub = subscribeTransactions(() => setSwipeTxs([...getSwipeTransactions()]));
    return unsub;
  }, []);

  // Refresh swipe transactions whenever tab is focused
  useFocusEffect(useCallback(() => {
    setSwipeTxs([...getSwipeTransactions()]);
  }, []));

  // Plaid link flow
  const handlePlaidLink = async () => {
    setPlaidLinking(true);
    try {
      const res = await fetch(`${API_BASE}/api/plaid/create-link-token`, { method: 'POST' });
      const { link_token } = await res.json();
      const url = `https://cdn.plaid.com/link/v2/stable/link.html?token=${link_token}`;
      Linking.openURL(url);
    } catch {
      Alert.alert('Plaid', 'Could not reach the server. Make sure the web app is running.');
    } finally {
      setPlaidLinking(false);
    }
  };

  // Combine and filter transactions
  const today = new Date().toDateString();
  const allTxs: Array<{ key: string; merchant: string; amount: number; date: string; icon: string; cashback?: number; source: 'plaid' | 'swipe' }> = [
    ...swipeTxs.map(t => ({
      key: t.id,
      merchant: t.merchant,
      amount: t.amount,
      date: new Date(t.date).toDateString(),
      icon: '💳',
      cashback: t.cashback,
      source: 'swipe' as const,
    })),
    ...plaidTxs.map(t => ({
      key: t.transaction_id,
      merchant: t.merchant_name ?? t.name,
      amount: t.amount,
      date: new Date(t.date).toDateString(),
      icon: categoryIcon(t.category),
      source: 'plaid' as const,
    })),
  ];

  const filtered = allTxs.filter(t => {
    if (txFilter === 'today')  return t.date === today;
    if (txFilter === 'recent') return swipeTxs.some(s => s.id === t.key);
    return true;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>K</Text>
          </View>
          <Text style={styles.headerTitle}>Kerdos</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.hBtn}><Text style={styles.hBtnTxt}>•••</Text></Pressable>
          <Pressable style={styles.hBtn}><Text style={styles.hBtnTxt}>⌕</Text></Pressable>
          <Pressable style={styles.hBtn} onPress={handlePlaidLink} disabled={plaidLinking}>
            <View style={[styles.plaidBtn, plaidLinking && { opacity: 0.5 }]}>
              <Text style={styles.plaidBtnTxt}>🔗</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* ── Ticker ── */}
      <TickerBar />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Total Rewards ── */}
        <View style={styles.totalBlock}>
          <Text style={styles.totalLabel}>TOTAL REWARDS EARNED</Text>
          <Text style={styles.totalValue}>
            ${totalRewards.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
          <View style={styles.totalChangeRow}>
            <Text style={styles.green}>↗ +${monthlyGain.toFixed(2)} (+{monthlyPct}%)</Text>
          </View>
          <Text style={styles.totalSub}>
            ${totalCashback.toLocaleString('en-US', { minimumFractionDigits: 2 })} cashback  ·  {(totalPoints / 1000).toFixed(1)}K points
          </Text>
        </View>

        {/* ── All accounts ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All accounts</Text>

          <Text style={styles.catLabel}>CREDIT CARDS</Text>
          {Object.entries(USER_CARDS).map(([id, card]) => {
            const meta = CARD_META[id];
            const up = card.totalEarned > 0;
            return (
              <View key={id} style={styles.accountRow}>
                <View style={[styles.acctBorder, { backgroundColor: up ? COLORS.green : '#ff3b30' }]} />
                <View style={styles.acctLeft}>
                  <Text style={styles.acctName}>{meta?.issuer ?? id}</Text>
                  <Text style={styles.acctSub}>{meta?.displayName}  ...{card.last4}</Text>
                </View>
                <View style={styles.acctRight}>
                  <Text style={styles.acctBalance}>
                    ${card.totalEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Text>
                  {card.pointsBalance > 0
                    ? <Text style={styles.green}>{(card.pointsBalance / 1000).toFixed(1)}K pts</Text>
                    : <Text style={styles.green}>cashback</Text>
                  }
                </View>
              </View>
            );
          })}

          {/* Plaid link button */}
          <Pressable style={styles.openBtn} onPress={handlePlaidLink} disabled={plaidLinking}>
            <Text style={styles.openBtnTxt}>
              {plaidLinking ? 'Opening Plaid...' : '+ Open or link an account'}
            </Text>
          </Pressable>
        </View>

        {/* ── Transactions ── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            <Pressable onPress={fetchTransactions}>
              <Text style={styles.viewAll}>Refresh  ›</Text>
            </Pressable>
          </View>

          <View style={styles.filterRow}>
            {(['all', 'recent', 'today'] as const).map(f => (
              <Pressable
                key={f}
                style={[styles.filterPill, txFilter === f && styles.filterPillActive]}
                onPress={() => setTxFilter(f)}
              >
                <Text style={[styles.filterTxt, txFilter === f && styles.filterTxtActive]}>
                  {f === 'all' ? `All  ${allTxs.length}` : f === 'recent' ? `SmartSwipe  ${swipeTxs.length}` : 'Today'}
                </Text>
              </Pressable>
            ))}
          </View>

          {plaidLoading && <Text style={styles.loadingTxt}>Fetching transactions...</Text>}

          {filtered.slice(0, 15).map(tx => (
            <View key={tx.key} style={styles.txRow}>
              <View style={styles.txIcon}>
                <Text style={{ fontSize: 18 }}>{tx.icon}</Text>
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txMerchant}>{tx.merchant}</Text>
                <Text style={styles.txDate}>{tx.date}</Text>
              </View>
              <View style={styles.txRight}>
                <Text style={styles.txAmount}>-${Math.abs(tx.amount).toFixed(2)}</Text>
                {tx.cashback != null && (
                  <Text style={[styles.green, { fontSize: 11 }]}>+${tx.cashback.toFixed(2)}</Text>
                )}
              </View>
            </View>
          ))}

          {filtered.length === 0 && !plaidLoading && (
            <Text style={styles.emptyTxt}>
              {txFilter === 'recent' ? 'Use SmartSwipe to log transactions here.' : 'No transactions found.'}
            </Text>
          )}
        </View>

        {/* ── Planning card ── */}
        <Pressable style={styles.planCard}>
          <Text style={styles.planTitle}>Planning</Text>
          <Text style={styles.planArrow}>›</Text>
        </Pressable>

        <Pressable style={styles.planCard}>
          <Text style={styles.planTitle}>SmartSwipe — find the best card for any purchase</Text>
          <Text style={styles.planArrow}>›</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#141414' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#141414',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 16, fontWeight: '800', color: '#000' },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#fff' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hBtn: { padding: 6 },
  hBtnTxt: { fontSize: 20, color: '#aeaeb2' },
  plaidBtn: { backgroundColor: COLORS.green, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  plaidBtnTxt: { fontSize: 14 },

  // Ticker
  tickerWrap: {
    height: 28, backgroundColor: '#1c1c1e', overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center',
  },
  tickerRow: { flexDirection: 'row', alignItems: 'center', position: 'absolute' },
  tickerItem: { flexDirection: 'row', alignItems: 'center' },
  tickerLabel: { fontSize: 11, color: '#aeaeb2' },
  tickerValue: { fontSize: 11, fontWeight: '600' },
  tickerDiv: { fontSize: 11, color: '#3a3a3c' },
  tickerRight: { position: 'absolute', right: 10 },
  tickerAs: { fontSize: 9, color: '#48484a' },

  // Scroll
  scroll: { paddingBottom: 20 },

  // Total rewards block
  totalBlock: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, backgroundColor: '#141414' },
  totalLabel: { fontSize: 11, color: '#8e8e93', letterSpacing: 0.5, marginBottom: 4 },
  totalValue: { fontSize: 38, fontWeight: '300', color: '#fff', letterSpacing: -0.5 },
  totalChangeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  totalSub: { fontSize: 12, color: '#8e8e93', marginTop: 4 },

  // Section
  section: { paddingHorizontal: 20, marginTop: 8, marginBottom: 4 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#fff', marginBottom: 10 },
  catLabel: { fontSize: 11, color: '#8e8e93', letterSpacing: 0.8, marginBottom: 8 },
  viewAll: { fontSize: 14, color: '#8e8e93' },

  // Account rows
  accountRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1c1c1e', borderRadius: 10, marginBottom: 8, overflow: 'hidden',
  },
  acctBorder: { width: 3, alignSelf: 'stretch' },
  acctLeft: { flex: 1, paddingVertical: 13, paddingHorizontal: 14 },
  acctName: { fontSize: 15, fontWeight: '500', color: '#fff' },
  acctSub: { fontSize: 12, color: '#8e8e93', marginTop: 2 },
  acctRight: { paddingRight: 14, alignItems: 'flex-end' },
  acctBalance: { fontSize: 15, fontWeight: '500', color: '#fff' },

  // Plaid open button
  openBtn: {
    marginTop: 12, backgroundColor: COLORS.green,
    borderRadius: 24, paddingVertical: 14, alignItems: 'center',
  },
  openBtnTxt: { fontSize: 15, fontWeight: '600', color: '#000' },

  // Filter pills
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  filterPill: { borderWidth: 1, borderColor: '#3a3a3c', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
  filterPillActive: { borderColor: '#fff', backgroundColor: '#2c2c2e' },
  filterTxt: { fontSize: 13, color: '#8e8e93' },
  filterTxtActive: { color: '#fff' },

  loadingTxt: { fontSize: 13, color: '#8e8e93', textAlign: 'center', paddingVertical: 12 },
  emptyTxt: { fontSize: 13, color: '#48484a', textAlign: 'center', paddingVertical: 20 },

  // Transaction rows
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1c1c1e', borderRadius: 10, padding: 14, marginBottom: 8,
  },
  txIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2c2c2e', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txInfo: { flex: 1 },
  txMerchant: { fontSize: 14, fontWeight: '500', color: '#fff' },
  txDate: { fontSize: 11, color: '#8e8e93', marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 14, fontWeight: '500', color: '#fff' },

  // Planning cards
  planCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 20, marginTop: 8,
    backgroundColor: '#1c1c1e', borderRadius: 10, padding: 16,
  },
  planTitle: { fontSize: 15, color: '#fff', flex: 1 },
  planArrow: { fontSize: 20, color: '#8e8e93' },

  green: { color: COLORS.green },
  red:   { color: '#ff3b30'   },
});
