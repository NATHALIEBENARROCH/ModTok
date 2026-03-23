import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { ClothingItem } from '../data/mockData';
import { Colors, BorderRadius, Spacing, Typography } from '../theme';

interface ClothingCardProps {
  item: ClothingItem;
  onPress?: () => void;
  onAdd?: () => void;
  showAdd?: boolean;
  showFavorite?: boolean;
  size?: 'small' | 'medium' | 'large';
  selected?: boolean;
}

export default function ClothingCard({
  item,
  onPress,
  onAdd,
  showAdd = false,
  showFavorite = false,
  size = 'medium',
  selected = false,
}: ClothingCardProps) {
  const cardSize = size === 'small' ? 100 : size === 'medium' ? 130 : 160;
  const imageSize = size === 'small' ? 70 : size === 'medium' ? 90 : 120;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.card,
        { width: cardSize },
        selected && styles.selectedCard,
      ]}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.image }}
        style={[styles.image, { width: imageSize, height: imageSize }]}
        resizeMode="contain"
      />
      {showAdd && (
        <TouchableOpacity onPress={onAdd} style={styles.addButton}>
          <Feather name="plus" size={14} color={Colors.purple} />
        </TouchableOpacity>
      )}
      {showFavorite && item.isFavorite && (
        <View style={styles.favoriteIndicator}>
          <Ionicons name="heart" size={12} color={Colors.primary} />
        </View>
      )}
      {item.forSale && (
        <View style={styles.saleTag}>
          <Text style={styles.saleText}>SELL</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    margin: Spacing.xs,
    position: 'relative',
  },
  selectedCard: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  image: {
    borderRadius: BorderRadius.sm,
  },
  addButton: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  saleTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  saleText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
