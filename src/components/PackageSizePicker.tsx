import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMarketplace } from '../context/MarketplaceContext';
import { PackageSize, formatUsd } from '../types/marketplace';
import { BorderRadius, Colors, Spacing, Typography } from '../theme';

const ICON_SIZE: Record<PackageSize, number> = { small: 18, medium: 23, large: 28 };

/** Vinted-style Small / Medium / Large choice. The buyer pays the shown price; ModTok sends the label. */
export default function PackageSizePicker({ value, onChange, compact = false }: {
  value: PackageSize;
  onChange: (size: PackageSize) => void;
  compact?: boolean;
}) {
  const { shippingRates } = useMarketplace();
  return (
    <View style={styles.list}>
      {shippingRates.map((rate) => {
        const selected = rate.package_size === value;
        return (
          <TouchableOpacity
            key={rate.package_size}
            style={[styles.option, compact && styles.optionCompact, selected && styles.optionSelected]}
            onPress={() => onChange(rate.package_size)}
            activeOpacity={0.82}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <View style={[styles.iconBox, selected && styles.iconBoxSelected]}>
              <Ionicons name="cube-outline" size={ICON_SIZE[rate.package_size]} color={selected ? Colors.white : Colors.primary} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.label}>{rate.label}</Text>
              {!compact && <Text style={styles.examples} numberOfLines={2}>{rate.examples}</Text>}
            </View>
            <Text style={styles.price}>{formatUsd(rate.price_cents)}</Text>
            <Ionicons
              name={selected ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={selected ? Colors.primary : Colors.mediumGray}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm },
  option: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.white, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder },
  optionCompact: { minHeight: 52 },
  optionSelected: { borderColor: Colors.primary, borderWidth: 1.5 },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9E5E1' },
  iconBoxSelected: { backgroundColor: Colors.primary },
  copy: { flex: 1, minWidth: 0 },
  label: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '800' },
  examples: { marginTop: 2, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, lineHeight: 16 },
  price: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '800' },
});
