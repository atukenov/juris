import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

interface TabBarBadgeProps {
  count: number;
  visible?: boolean;
}

export const TabBarBadge: React.FC<TabBarBadgeProps> = ({ count, visible = true }) => {
  if (!visible || count === 0) {
    return null;
  }

  const displayText = count > 10 ? '+10' : count.toString();

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{displayText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
