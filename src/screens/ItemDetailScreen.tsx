import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { ClothingItem } from '../data/mockData';

export default function ItemDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const item: ClothingItem = route.params?.item;
  const [isFavorite, setIsFavorite] = useState(item?.isFavorite || false);

  if (!item) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
        <TouchableOpacity onPress={() => setIsFavorite(!isFavorite)} style={styles.favBtn}>
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={24}
            color={isFavorite ? Colors.primary : Colors.black}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Item Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.image }} style={styles.image} resizeMode="contain" />
        </View>

        {/* Item Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.nameRow}>
            <View>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemBrand}>{item.brand}</Text>
            </View>
            {item.price && (
              <Text style={styles.itemPrice}>${item.price}</Text>
            )}
          </View>

          {/* Tags */}
          <View style={styles.tagsRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.category}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.color}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.size}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.season}</Text>
            </View>
          </View>

          {/* Custom Tags */}
          {item.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {item.tags.map((tag) => (
                <View key={tag} style={styles.customTag}>
                  <Text style={styles.customTagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Added Date */}
          <Text style={styles.addedDate}>Added {item.addedDate}</Text>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.styleBtn}>
              <Ionicons name="color-wand-outline" size={18} color={Colors.white} />
              <Text style={styles.styleBtnText}>Add to Outfit</Text>
            </TouchableOpacity>
            {item.forSale ? (
              <View style={styles.listedBadge}>
                <Ionicons name="pricetag" size={16} color={Colors.primary} />
                <Text style={styles.listedText}>Listed for ${item.salePrice}</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.sellBtn}>
                <Ionicons name="pricetag-outline" size={18} color={Colors.primary} />
                <Text style={styles.sellBtnText}>Sell Item</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  favBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.xl,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.base,
  },
  image: {
    width: 220,
    height: 260,
  },
  detailsContainer: {
    paddingHorizontal: Spacing.base,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  itemName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  itemBrand: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  customTag: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  customTagText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: '600',
  },
  addedDate: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textLight,
    marginBottom: Spacing.base,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xxxl,
  },
  styleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  styleBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: Typography.fontSize.sm,
  },
  sellBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  sellBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: Typography.fontSize.sm,
  },
  listedBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.primaryLight + '20',
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  listedText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: Typography.fontSize.sm,
  },
});
