import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { MOCK_OUTFITS, MOCK_CLOSET_ITEMS, Outfit } from '../data/mockData';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.base * 2 - Spacing.md) / 2;

const TABS = ['Outfits', 'Favourites', 'Collections'];

function OutfitCard({ outfit, onPress }: { outfit: Outfit; onPress: () => void }) {
  const previewItems = outfit.items.slice(0, 3);
  return (
    <TouchableOpacity onPress={onPress} style={[styles.outfitCard, { width: CARD_WIDTH }]} activeOpacity={0.85}>
      <View style={styles.outfitPreview}>
        {previewItems.map((item, i) => (
          <Image
            key={item.id}
            source={{ uri: item.image }}
            style={[styles.previewImage, { zIndex: 3 - i, left: i * 20 }]}
            resizeMode="contain"
          />
        ))}
      </View>
      <View style={styles.outfitInfo}>
        <Text style={styles.outfitName} numberOfLines={1}>{outfit.name}</Text>
        <Text style={styles.outfitMeta}>{outfit.items.length} items · {outfit.occasion}</Text>
        <View style={styles.outfitFooter}>
          {outfit.isShared && (
            <View style={styles.sharedBadge}>
              <Ionicons name="share-social" size={10} color={Colors.primary} />
              <Text style={styles.sharedText}>Shared</Text>
            </View>
          )}
          <View style={styles.likesBadge}>
            <Ionicons name="heart" size={10} color={Colors.primary} />
            <Text style={styles.likesText}>{outfit.likes}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function FavouriteCard({ item }: { item: typeof MOCK_CLOSET_ITEMS[0] }) {
  return (
    <TouchableOpacity style={[styles.favCard, { width: CARD_WIDTH }]} activeOpacity={0.85}>
      <Image source={{ uri: item.image }} style={styles.favImage} resizeMode="contain" />
      <Text style={styles.favName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.favBrand}>{item.brand}</Text>
    </TouchableOpacity>
  );
}

export default function SaveScreen() {
  const [activeTab, setActiveTab] = useState('Outfits');
  const favouriteItems = MOCK_CLOSET_ITEMS.filter(i => i.isFavorite);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Save</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'Outfits' && (
        <FlatList
          data={MOCK_OUTFITS}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <OutfitCard outfit={item} onPress={() => {}} />
          )}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}

      {activeTab === 'Favourites' && (
        <FlatList
          data={favouriteItems}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <FavouriteCard item={item} />}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}

      {activeTab === 'Collections' && (
        <View style={styles.emptyState}>
          <Ionicons name="folder-open-outline" size={48} color={Colors.mediumGray} />
          <Text style={styles.emptyTitle}>No Collections Yet</Text>
          <Text style={styles.emptySubtitle}>Create collections to organise your wardrobe by occasion, trip, or season.</Text>
          <TouchableOpacity style={styles.createBtn}>
            <Text style={styles.createBtnText}>Create Collection</Text>
          </TouchableOpacity>
        </View>
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  addBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 7,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  activeTab: {
    backgroundColor: Colors.black,
    borderColor: Colors.black,
  },
  tabText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  activeTabText: {
    color: Colors.white,
  },
  grid: {
    paddingHorizontal: Spacing.base,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  outfitCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  outfitPreview: {
    height: 120,
    backgroundColor: Colors.background,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    position: 'absolute',
    width: 60,
    height: 80,
  },
  outfitInfo: {
    padding: Spacing.sm,
  },
  outfitName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  outfitMeta: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  outfitFooter: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 4,
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sharedText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: '600',
  },
  likesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  likesText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: '600',
  },
  favCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.sm,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  favImage: {
    width: 90,
    height: 100,
    marginBottom: Spacing.xs,
  },
  favName: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  favBrand: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  createBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  createBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: Typography.fontSize.sm,
  },
});
