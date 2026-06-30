import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { Outfit } from '../context/OutfitContext';

export default function OutfitDetailScreen() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const route = useRoute<any>();
  const outfit: Outfit = route.params?.outfit;

  if (!outfit) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>{outfit.name}</Text>
        <TouchableOpacity style={styles.shareBtn}>
          <Ionicons name="share-social-outline" size={22} color={Colors.black} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.metaRow}>
          <View style={styles.metaTag}>
            <Text style={styles.metaText}>{outfit.occasion}</Text>
          </View>
          <View style={styles.metaTag}>
            <Text style={styles.metaText}>{outfit.season}</Text>
          </View>
          <View style={styles.likesTag}>
            <Ionicons name="heart" size={12} color={Colors.primary} />
            <Text style={styles.likesText}>{outfit.likes} likes</Text>
          </View>
        </View>

        {outfit.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category}</Text>
            </View>
            <View style={styles.itemCard}>
              <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="contain" />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemBrand}>{item.brand}</Text>
                {item.price && <Text style={styles.itemPrice}>${item.price}</Text>}
              </View>
            </View>
          </View>
        ))}

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.wearBtn}>
            <Ionicons name="checkmark-circle-outline" size={18} color={Colors.white} />
            <Text style={styles.wearBtnText}>Wear Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editBtn}>
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
            <Text style={styles.editBtnText}>Edit Outfit</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
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
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  shareBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  metaTag: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  metaText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  likesTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  likesText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    color: Colors.primary,
  },
  itemRow: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  categoryBadge: {
    alignSelf: 'center',
    backgroundColor: Colors.black,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.base,
    paddingVertical: 4,
    marginBottom: Spacing.sm,
  },
  categoryBadgeText: {
    color: Colors.white,
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
  },
  itemCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  itemImage: {
    width: 80,
    height: 90,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  itemBrand: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.primary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.sm,
  },
  wearBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  wearBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: Typography.fontSize.sm,
  },
  editBtn: {
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
  editBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: Typography.fontSize.sm,
  },
});
