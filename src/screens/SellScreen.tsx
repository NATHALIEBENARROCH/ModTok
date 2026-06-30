import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { ClothingItem, useCloset } from '../context/ClosetContext';

const SELL_TABS = ['For Sale', 'For Rent', 'Sold'];

const CATEGORIES = [
  'All', 'Coats', 'Jackets', 'Cardigans', 'Sweaters', 'Blouses',
  'T shirts', 'Dresses', 'Pants', 'Skirts', 'Shorts', 'Shoes', 'Bags',
];

function SellItemCard({ item }: { item: ClothingItem }) {
  const [listed, setListed] = useState(item.forSale || false);

  return (
    <View style={styles.sellCard}>
      {/* Category Label */}
      <View style={styles.categoryLabel}>
        <Text style={styles.categoryLabelText}>{item.category}</Text>
      </View>

      {/* Item Card */}
      <View style={styles.itemCard}>
        <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="contain" />
      </View>

      {/* Item Info */}
      <View style={styles.itemInfo}>
        <View style={styles.itemInfoLeft}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemBrand}>{item.brand}</Text>
        </View>
        <View style={styles.itemInfoRight}>
          {item.salePrice && (
            <Text style={styles.salePrice}>${item.salePrice}</Text>
          )}
          {item.price && (
            <Text style={styles.originalPrice}>${item.price}</Text>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={() => setListed(!listed)}
          style={[styles.listBtn, listed && styles.listBtnActive]}
        >
          <Ionicons
            name={listed ? 'checkmark-circle' : 'add-circle-outline'}
            size={16}
            color={listed ? Colors.white : Colors.primary}
          />
          <Text style={[styles.listBtnText, listed && styles.listBtnTextActive]}>
            {listed ? 'Listed' : 'List for Sale'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editBtn}>
          <Ionicons name="create-outline" size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SellScreen() {
  const [activeTab, setActiveTab] = useState('For Sale');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const { width } = useWindowDimensions();

  const { items } = useCloset();
  const forSaleItems = items.filter(i => i.forSale);
  const allItems = items;

  const baseItems = activeTab === 'For Sale' ? forSaleItems : activeTab === 'Sold' ? [] : allItems;
  const displayItems = selectedCategory === 'All'
    ? baseItems
    : baseItems.filter(i => i.category === selectedCategory);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <Text style={styles.title}>Sell</Text>
        <TouchableOpacity style={styles.infoBtn}>
          <Ionicons name="information-circle-outline" size={22} color={Colors.black} />
        </TouchableOpacity>
      </View>

      {/* Earnings Banner */}
      <View style={styles.earningsBanner}>
        <View>
          <Text style={styles.earningsLabel}>Potential Earnings</Text>
          <Text style={styles.earningsAmount}>
            ${forSaleItems.reduce((sum, i) => sum + (i.salePrice || 0), 0).toFixed(0)}
          </Text>
        </View>
        <View style={styles.earningsRight}>
          <Ionicons name="trending-up" size={32} color={Colors.primary} />
          <Text style={styles.earningsItems}>{forSaleItems.length} items listed</Text>
        </View>
      </View>

      {/* Tabs + Category Filter Row */}
      <View style={styles.filterRow}>
        <View style={styles.tabRow}>
          {SELL_TABS.map((tab) => (
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

        {/* Category Dropdown Pill */}
        <TouchableOpacity
          style={styles.categoryPill}
          onPress={() => setShowCategoryPicker(true)}
        >
          <Text style={styles.categoryPillText}>
            {selectedCategory === 'All' ? 'All Categories' : selectedCategory}
          </Text>
          <Ionicons name="chevron-down" size={14} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Items */}
      {displayItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="pricetag-outline" size={48} color={Colors.mediumGray} />
          <Text style={styles.emptyTitle}>
            {activeTab === 'Sold' ? 'No Sold Items Yet' : 'Nothing Listed Yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'Sold'
              ? 'Items you sell will appear here.'
              : 'List items from your closet to sell or rent them.'}
          </Text>
          {activeTab !== 'Sold' && (
            <TouchableOpacity style={styles.listNewBtn}>
              <Text style={styles.listNewBtnText}>List an Item</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={displayItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <SellItemCard item={item} />}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}

      {/* Category Picker Bottom Sheet */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryPicker(false)}
        />
        <View style={styles.bottomSheet}>
          <View style={styles.bottomSheetHandle} />
          <Text style={styles.bottomSheetTitle}>Choose Category</Text>
          <FlatList
            data={CATEGORIES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  selectedCategory === item && styles.categoryOptionActive,
                ]}
                onPress={() => {
                  setSelectedCategory(item);
                  setShowCategoryPicker(false);
                }}
              >
                <Text style={[
                  styles.categoryOptionText,
                  selectedCategory === item && styles.categoryOptionTextActive,
                ]}>
                  {item}
                </Text>
                {selectedCategory === item && (
                  <Ionicons name="checkmark" size={18} color={Colors.primary} />
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </Modal>
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
    flex: 1,
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  infoBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  earningsLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  earningsAmount: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  earningsRight: {
    alignItems: 'flex-end',
  },
  earningsItems: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  filterRow: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  tabRow: {
    flexDirection: 'row',
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
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.black,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.base,
    paddingVertical: 7,
    gap: 6,
  },
  categoryPillText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: Spacing.base,
  },
  sellCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.base,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryLabel: {
    alignSelf: 'center',
    backgroundColor: Colors.black,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.base,
    paddingVertical: 4,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  categoryLabelText: {
    color: Colors.white,
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
  },
  itemCard: {
    backgroundColor: Colors.background,
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  itemImage: {
    width: 100,
    height: 120,
  },
  itemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
  },
  itemInfoLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  itemBrand: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  itemInfoRight: {
    alignItems: 'flex-end',
  },
  salePrice: {
    fontSize: Typography.fontSize.md,
    fontWeight: '800',
    color: Colors.primary,
  },
  originalPrice: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  listBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: Spacing.sm,
    gap: 4,
  },
  listBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  listBtnText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: Typography.fontSize.sm,
  },
  listBtnTextActive: {
    color: Colors.white,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
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
  listNewBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  listNewBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: Typography.fontSize.sm,
  },
  // Modal / Bottom Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  bottomSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.cardBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  bottomSheetTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.xs,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  categoryOptionActive: {
    backgroundColor: Colors.background,
  },
  categoryOptionText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  categoryOptionTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.cardBorder,
    marginHorizontal: Spacing.base,
  },
});
