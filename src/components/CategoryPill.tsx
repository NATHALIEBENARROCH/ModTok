import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing, Typography } from '../theme';

interface CategoryPillProps {
  label: string;
  isActive?: boolean;
  onPress?: () => void;
  size?: 'small' | 'medium';
}

export default function CategoryPill({ label, isActive = false, onPress, size = 'medium' }: CategoryPillProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.pill,
        isActive ? styles.activePill : styles.inactivePill,
        size === 'small' && styles.smallPill,
      ]}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.label,
        isActive ? styles.activeLabel : styles.inactiveLabel,
        size === 'small' && styles.smallLabel,
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm - 2,
    borderRadius: BorderRadius.pill,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  activePill: {
    backgroundColor: Colors.black,
  },
  inactivePill: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  smallPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  label: {
    fontWeight: '600',
    fontSize: Typography.fontSize.sm,
    letterSpacing: 0.2,
  },
  activeLabel: {
    color: Colors.white,
  },
  inactiveLabel: {
    color: Colors.textPrimary,
  },
  smallLabel: {
    fontSize: Typography.fontSize.xs,
  },
});
