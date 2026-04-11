import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/theme';

// ─── TAB ICON ────────────────────────────────────────────────────────────────
// Edit the emoji, label, or activeColor below to customise each tab.
function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="smartswipe"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="💳" label="SwipeIQ" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="rewardvest"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📈" label="Invest" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="wealthsplit"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⚖️" label="Split" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.tabBar,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 80,
    paddingTop: 8,
  },
  iconWrap: {
    alignItems: 'center',
    gap: 3,
  },
  emoji: {
    fontSize: 22,
  },
  label: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  labelActive: {
    color: COLORS.green,
  },
});
