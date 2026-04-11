import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/theme';

function HomeIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.icon, focused && styles.iconActive]}>⌂</Text>
      <Text style={[styles.label, focused && styles.labelActive]}>Home</Text>
    </View>
  );
}

function PortfolioIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.icon, focused && styles.iconActive]}>▤</Text>
      <Text style={[styles.label, focused && styles.labelActive]}>Portfolio</Text>
    </View>
  );
}

function WatchlistIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.icon, focused && styles.iconActive]}>☆</Text>
      <Text style={[styles.label, focused && styles.labelActive]}>Watchlist</Text>
    </View>
  );
}

function MarketsIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.icon, focused && styles.iconActive]}>⊕</Text>
      <Text style={[styles.label, focused && styles.labelActive]}>Markets</Text>
    </View>
  );
}

function TransactIcon() {
  return (
    <View style={styles.centerBtn}>
      <Text style={styles.centerBtnText}>$</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: COLORS.green,
        tabBarInactiveTintColor: COLORS.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <HomeIcon focused={focused} /> }}
      />
      <Tabs.Screen
        name="rewardvest"
        options={{ tabBarIcon: ({ focused }) => <PortfolioIcon focused={focused} /> }}
      />
      <Tabs.Screen
        name="transact"
        options={{ tabBarIcon: () => <TransactIcon /> }}
      />
      <Tabs.Screen
        name="smartswipe"
        options={{ tabBarIcon: ({ focused }) => <WatchlistIcon focused={focused} /> }}
      />
      <Tabs.Screen
        name="wealthsplit"
        options={{ tabBarIcon: ({ focused }) => <MarketsIcon focused={focused} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1c1c1e',
    borderTopColor: '#2c2c2e',
    borderTopWidth: 0.5,
    height: 82,
    paddingTop: 6,
  },
  iconWrap: { alignItems: 'center', gap: 2 },
  icon: { fontSize: 22, color: '#636366' },
  iconActive: { color: '#ffffff' },
  label: { fontSize: 10, color: '#636366', fontWeight: '400' },
  labelActive: { color: '#ffffff', fontWeight: '500' },
  centerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  centerBtnText: { fontSize: 22, color: '#000', fontWeight: '700' },
});
