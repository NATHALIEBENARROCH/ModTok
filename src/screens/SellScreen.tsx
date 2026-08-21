import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { ClothingItem, useCloset } from '../context/ClosetContext';
import { useOutfit } from '../context/OutfitContext';

const SELL_TABS = ['For Sale', 'For Rent', 'Sold'] as const;
const CATEGORIES = [
  'All', 'Coats', 'Jackets', 'Cardigans', 'Sweaters', 'Tops', 'Blouses',
  'T shirts', 'Dresses', 'Pants', 'Skirts', 'Shorts', 'Shoes', 'Boots', 'Sneakers',
  'Bags', 'Jewelry', 'Accessories', 'Activewear',
];

type SellTab = typeof SELL_TABS[number];

function itemImage(item: ClothingItem) {
  return item.image_url ?? item.image;
}

function SellItemCard({ item, onUnlist, onShare }: { item: ClothingItem; onUnlist: () => void; onShare: () => void }) {
  const listingType = item.listingType === 'rent' ? 'rent' : 'sale';

  return (
    <View style={styles.sellCard}>
      <View style={styles.categoryLabel}>
        <Text style={styles.categoryLabelText}>{item.category}</Text>
      </View>
      <View style={styles.itemCard}>
        <Image source={{ uri: itemImage(item) }} style={styles.itemImage} resizeMode="contain" />
      </View>
      <View style={styles.itemInfo}>
        <View style={styles.itemInfoLeft}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemBrand} numberOfLines={1}>{item.brand || `${listingType === 'rent' ? 'For rent' : 'For sale'}`}</Text>
        </View>
        <View style={styles.itemInfoRight}>
          {item.salePrice ? <Text style={styles.salePrice}>${item.salePrice}{listingType === 'rent' ? '/day' : ''}</Text> : null}
          {item.price ? <Text style={styles.originalPrice}>${item.price}</Text> : null}
        </View>
      </View>
      <View style={styles.listingStatusRow}>
        <View style={styles.listingStatus}>
          <Ionicons name={listingType === 'rent' ? 'calendar-outline' : 'pricetag-outline'} size={14} color={Colors.primary} />
          <Text style={styles.listingStatusText}>{listingType === 'rent' ? 'Listed for rent' : 'Listed for sale'}</Text>
        </View>
        <View style={styles.listingActions}>
          <TouchableOpacity style={styles.storyShareButton} onPress={onShare}>
            <Ionicons name="paper-plane-outline" size={14} color={Colors.primary} />
            <Text style={styles.storyShareButtonText}>Share to Story</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.unlistButton} onPress={onUnlist}>
            <Text style={styles.unlistButtonText}>Unlist</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function SellScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<SellTab>('For Sale');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const { items, updateItem } = useCloset();
  const { createShareStory } = useOutfit();

  const saleItems = useMemo(
    () => items.filter((item) => item.forSale && item.listingType !== 'rent'),
    [items],
  );
  const rentalItems = useMemo(
    () => items.filter((item) => item.forSale && item.listingType === 'rent'),
    [items],
  );
  const baseItems = activeTab === 'For Sale' ? saleItems : activeTab === 'For Rent' ? rentalItems : [];
  const displayItems = selectedCategory === 'All'
    ? baseItems
    : baseItems.filter((item) => item.category === selectedCategory);
  const potentialEarnings = saleItems.reduce((sum, item) => sum + (item.salePrice || 0), 0);

  const openListingFlow = () => {
    if (activeTab === 'Sold') {
      setActiveTab('For Sale');
      return;
    }
    navigation.navigate('SellItemPicker', { listingType: activeTab === 'For Rent' ? 'rent' : 'sale' });
  };

  const unlistItem = (item: ClothingItem) => {
    Alert.alert('Remove listing?', `${item.name} will no longer appear on your Sell page.`, [
      { text: 'Keep listed', style: 'cancel' },
      {
        text: 'Unlist',
        style: 'destructive',
        onPress: async () => {
          const updated = await updateItem(item.id, { forSale: false, salePrice: undefined, listingType: undefined });
          if (!updated) Alert.alert('Could not unlist item', 'Please try again.');
        },
      },
    ]);
  };

  const shareListedItem = async (item: ClothingItem) => {
    const imageUrl = itemImage(item);
    if (!imageUrl) {
      Alert.alert('No photo available', 'Add a photo to this wardrobe item before sharing it to your story.');
      return;
    }
    try {
      const listingType = item.listingType === 'rent' ? 'rent' : 'sale';
      const created = await createShareStory({
        outfit_id: null,
        caption: `${item.name} is now available ${listingType === 'rent' ? 'for rent' : 'for sale'}.`,
        image_urls: [imageUrl],
        tagged_item_id: item.id,
        tagged_item_name: item.name,
        tagged_item_price: item.salePrice ?? null,
      });
      if (!created) {
        Alert.alert('Could not share listing', 'Please sign in and try again.');
        return;
      }
      Alert.alert('Added to Your Story', `${item.name} is now in your story with its ${listingType === 'rent' ? 'rental' : 'sale'} price.`);
    } catch (error) {
      Alert.alert('Could not share listing', 'Run the Share Stories setup in Supabase, then try again.');
      console.error('share listing story error:', error);
    }
  };

  const emptyTitle = activeTab === 'Sold'
    ? 'No Sold Items Yet'
    : activeTab === 'For Rent'
      ? 'Nothing for Rent Yet'
      : 'Nothing Listed Yet';
  const emptySubtitle = activeTab === 'Sold'
    ? 'Items you mark as sold will appear here.'
    : activeTab === 'For Rent'
      ? 'List a piece from your closet for rent.'
      : 'List a piece from your closet for sale.';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.title}>Sell</Text>
        <TouchableOpacity
          style={styles.infoBtn}
          onPress={() => Alert.alert('How Sell works', 'Choose a wardrobe item, choose Sell or Rent, set your price, and save the listing.')}
        >
          <Ionicons name="information-circle-outline" size={22} color={Colors.black} />
        </TouchableOpacity>
      </View>

      <View style={styles.earningsBanner}>
        <View>
          <Text style={styles.earningsLabel}>Potential Earnings</Text>
          <Text style={styles.earningsAmount}>${potentialEarnings.toFixed(0)}</Text>
        </View>
        <View style={styles.earningsRight}>
          <Ionicons name="trending-up" size={32} color={Colors.primary} />
          <Text style={styles.earningsItems}>{saleItems.length + rentalItems.length} items listed</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <View style={styles.tabRow}>
          {SELL_TABS.map((tab) => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.activeTab]}>
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.categoryPill} onPress={() => setShowCategoryPicker(true)}>
          <Text style={styles.categoryPillText}>{selectedCategory === 'All' ? 'All Categories' : selectedCategory}</Text>
          <Ionicons name="chevron-down" size={14} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {displayItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name={activeTab === 'Sold' ? 'checkmark-done-outline' : 'pricetag-outline'} size={48} color={Colors.mediumGray} />
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptySubtitle}>{emptySubtitle}</Text>
          {activeTab !== 'Sold' && (
            <TouchableOpacity style={styles.listNewBtn} onPress={openListingFlow}>
              <Ionicons name="add" size={18} color={Colors.white} />
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
          renderItem={({ item }) => <SellItemCard item={item} onUnlist={() => unlistItem(item)} onShare={() => shareListedItem(item)} />}
          ListFooterComponent={<View style={{ height: 118 }} />}
        />
      )}

      <Modal visible={showCategoryPicker} transparent animationType="slide" onRequestClose={() => setShowCategoryPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCategoryPicker(false)} />
        <View style={styles.bottomSheet}>
          <View style={styles.bottomSheetHandle} />
          <Text style={styles.bottomSheetTitle}>Filter listings by category</Text>
          <FlatList
            data={CATEGORIES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.categoryOption, selectedCategory === item && styles.categoryOptionActive]}
                onPress={() => { setSelectedCategory(item); setShowCategoryPicker(false); }}
              >
                <Text style={[styles.categoryOptionText, selectedCategory === item && styles.categoryOptionTextActive]}>{item === 'All' ? 'All Categories' : item}</Text>
                {selectedCategory === item && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
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
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  headerSpacer: { width: 36 },
  title: { flex: 1, fontSize: Typography.fontSize.xl, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5, textAlign: 'center' },
  infoBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  earningsBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, marginHorizontal: Spacing.base, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.base, borderLeftWidth: 3, borderLeftColor: Colors.primary, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  earningsLabel: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  earningsAmount: { fontSize: Typography.fontSize.xxxl, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  earningsRight: { alignItems: 'flex-end' },
  earningsItems: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, marginTop: 4 },
  filterRow: { paddingHorizontal: Spacing.base, marginBottom: Spacing.base, gap: Spacing.sm },
  tabRow: { flexDirection: 'row', gap: Spacing.sm },
  tab: { paddingHorizontal: Spacing.base, paddingVertical: 7, borderRadius: BorderRadius.pill, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.cardBorder },
  activeTab: { backgroundColor: Colors.black, borderColor: Colors.black },
  tabText: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  activeTabText: { color: Colors.white },
  categoryPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: Colors.black, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.base, paddingVertical: 7, gap: 6 },
  categoryPillText: { color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  list: { paddingHorizontal: Spacing.base },
  sellCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, marginBottom: Spacing.base, overflow: 'hidden', borderWidth: 1, borderColor: Colors.cardBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  categoryLabel: { alignSelf: 'center', backgroundColor: Colors.black, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.base, paddingVertical: 4, marginTop: Spacing.md, marginBottom: Spacing.sm },
  categoryLabelText: { color: Colors.white, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  itemCard: { backgroundColor: Colors.background, marginHorizontal: Spacing.base, borderRadius: BorderRadius.md, height: 140, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.cardBorder },
  itemImage: { width: 100, height: 120 },
  itemInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: Spacing.sm },
  itemInfoLeft: { flex: 1 },
  itemName: { fontSize: Typography.fontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  itemBrand: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  itemInfoRight: { alignItems: 'flex-end' },
  salePrice: { fontSize: Typography.fontSize.md, fontWeight: '800', color: Colors.primary },
  originalPrice: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, textDecorationLine: 'line-through' },
  listingStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md },
  listingStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  listingStatusText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  listingActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  storyShareButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 7, borderWidth: 1, borderColor: Colors.primary, borderRadius: BorderRadius.pill },
  storyShareButtonText: { color: Colors.primary, fontSize: 10, fontWeight: '800' },
  unlistButton: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.pill },
  unlistButtonText: { color: Colors.textPrimary, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxxl },
  emptyTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.base, marginBottom: Spacing.sm },
  emptySubtitle: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl },
  listNewBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  listNewBtnText: { color: Colors.white, fontWeight: '700', fontSize: Typography.fontSize.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  bottomSheet: { backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, paddingBottom: 40, maxHeight: '70%' },
  bottomSheetHandle: { width: 40, height: 4, backgroundColor: Colors.cardBorder, borderRadius: 2, alignSelf: 'center', marginTop: Spacing.sm, marginBottom: Spacing.sm },
  bottomSheetTitle: { fontSize: Typography.fontSize.md, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, marginHorizontal: Spacing.base, marginBottom: Spacing.xs },
  categoryOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },
  categoryOptionActive: { backgroundColor: Colors.background },
  categoryOptionText: { fontSize: Typography.fontSize.base, color: Colors.textPrimary, fontWeight: '500' },
  categoryOptionTextActive: { color: Colors.primary, fontWeight: '700' },
  separator: { height: 1, backgroundColor: Colors.cardBorder, marginHorizontal: Spacing.base },
});
