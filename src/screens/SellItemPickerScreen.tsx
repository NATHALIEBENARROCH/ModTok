import React, { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { ClothingItem, useCloset } from '../context/ClosetContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { CONDITION_LABELS, ListingCondition } from '../types/marketplace';

type SellCategory = { name: string; icon: keyof typeof Ionicons.glyphMap };

const SELL_CATEGORIES: SellCategory[] = [
  { name: 'Dresses', icon: 'woman-outline' },
  { name: 'Jackets', icon: 'shirt-outline' },
  { name: 'Sweaters', icon: 'layers-outline' },
  { name: 'Tops', icon: 'shirt-outline' },
  { name: 'Pants', icon: 'color-palette-outline' },
  { name: 'Skirts', icon: 'sparkles-outline' },
  { name: 'Shoes', icon: 'footsteps-outline' },
  { name: 'Boots', icon: 'walk-outline' },
  { name: 'Sneakers', icon: 'footsteps-outline' },
  { name: 'Bags', icon: 'bag-handle-outline' },
  { name: 'Jewelry', icon: 'diamond-outline' },
  { name: 'Accessories', icon: 'watch-outline' },
];

function itemImage(item: ClothingItem) {
  return item.image_url ?? item.image;
}

// Matches the server: fee = round(10% of price in cents); seller gets the rest.
function sellerReceives(priceText: string): string {
  const cents = Math.round(Number(priceText.replace(',', '.')) * 100);
  return ((cents - Math.round(cents * 0.1)) / 100).toFixed(2);
}

export default function SellItemPickerScreen() {
  const navigation = useNavigation<any>();
  const { items } = useCloset();
  const { createListing, myListings, sellerStatus } = useMarketplace();
  const [step, setStep] = useState<'category' | 'item' | 'details'>('category');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
  const [listingPrice, setListingPrice] = useState('');
  const [shippingPrice, setShippingPrice] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState<ListingCondition>('good');
  const [saving, setSaving] = useState(false);

  const sellerReady = sellerStatus.details_submitted && sellerStatus.charges_enabled && sellerStatus.payouts_enabled;
  const openItemIds = useMemo(
    () => new Set(myListings.filter((listing) => ['draft', 'active', 'reserved'].includes(listing.status)).map((listing) => listing.closet_item_id)),
    [myListings],
  );
  const categoryItems = useMemo(
    () => selectedCategory ? items.filter((item) => item.category === selectedCategory && !openItemIds.has(item.id)) : [],
    [items, openItemIds, selectedCategory],
  );

  const chooseCategory = (category: string) => {
    setSelectedCategory(category);
    setStep('item');
  };

  const chooseItem = (item: ClothingItem) => {
    setSelectedItem(item);
    setListingPrice(item.salePrice ? String(item.salePrice) : '');
    setDescription(item.notes ?? '');
    setStep('details');
  };

  const saveListing = async () => {
    if (!selectedItem) return;
    const price = Number(listingPrice.replace(',', '.'));
    const shipping = shippingPrice.trim() ? Number(shippingPrice.replace(',', '.')) : 0;
    const imageUrl = itemImage(selectedItem);
    if (!sellerReady) {
      Alert.alert('Complete seller setup', 'Connect your Stripe payout account on the Sell page before publishing an item.');
      return;
    }
    if (!imageUrl) {
      Alert.alert('Add a photo', 'This wardrobe item needs a photo before it can be listed.');
      return;
    }
    if (!Number.isFinite(price) || price < 1) {
      Alert.alert('Add a price', 'Enter a sale price of at least $1.00 USD.');
      return;
    }
    if (!Number.isFinite(shipping) || shipping < 0) {
      Alert.alert('Check shipping price', 'Shipping must be $0 or more.');
      return;
    }

    setSaving(true);
    try {
      await createListing({
        closet_item_id: selectedItem.id,
        title: selectedItem.name,
        description: description.trim(),
        category: selectedItem.category,
        brand: selectedItem.brand,
        size: selectedItem.size,
        condition,
        image_urls: [imageUrl],
        price_cents: Math.round(price * 100),
        shipping_price_cents: Math.round(shipping * 100),
      });
      Alert.alert('Listing is live', `${selectedItem.name} is now available in the ModTok marketplace.`, [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Could not publish listing', error?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (step === 'details') return setStep('item');
    if (step === 'item') return setStep('category');
    navigation.goBack();
  };

  const title = step === 'category' ? 'Choose a category' : step === 'item' ? `Choose a ${selectedCategory ?? 'piece'}` : 'Create listing';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}><Ionicons name="chevron-back" size={25} color={Colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {step === 'category' && (
        <FlatList
          data={SELL_CATEGORIES}
          keyExtractor={(item) => item.name}
          numColumns={2}
          contentContainerStyle={styles.categoryList}
          columnWrapperStyle={styles.categoryRow}
          ListHeaderComponent={
            <View style={styles.introBlock}>
              <Text style={styles.introTitle}>What would you like to sell?</Text>
              <Text style={styles.introText}>Choose a category, then select the exact piece from your wardrobe.</Text>
            </View>
          }
          renderItem={({ item: category }) => {
            const count = items.filter((closetItem) => closetItem.category === category.name && !openItemIds.has(closetItem.id)).length;
            return (
              <TouchableOpacity style={styles.categoryCard} onPress={() => chooseCategory(category.name)} activeOpacity={0.82}>
                <View style={styles.categoryIconCircle}><Ionicons name={category.icon} size={25} color={Colors.primary} /></View>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryCount}>{count === 1 ? '1 available piece' : `${count} available pieces`}</Text>
                <Ionicons name="chevron-forward" size={17} color={Colors.textSecondary} style={styles.categoryArrow} />
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={<View style={{ height: 116 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {step === 'item' && (
        <FlatList
          data={categoryItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.itemList}
          ListHeaderComponent={<View style={styles.introBlock}><Text style={styles.introTitle}>Your {selectedCategory}</Text><Text style={styles.introText}>Already-listed pieces are hidden here.</Text></View>}
          ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="shirt-outline" size={48} color={Colors.mediumGray} /><Text style={styles.emptyTitle}>No available {selectedCategory}</Text><Text style={styles.emptyText}>Choose another category or add a piece to your wardrobe first.</Text><TouchableOpacity style={styles.chooseAnotherButton} onPress={() => setStep('category')}><Text style={styles.chooseAnotherText}>Choose another category</Text></TouchableOpacity></View>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.itemRow} onPress={() => chooseItem(item)} activeOpacity={0.82}>
              <Image source={{ uri: itemImage(item) }} style={styles.itemImage} resizeMode="contain" />
              <View style={styles.itemCopy}><Text style={styles.itemName} numberOfLines={1}>{item.name}</Text><Text style={styles.itemMeta} numberOfLines={1}>{item.category}{item.color ? ` · ${item.color}` : ''}</Text>{item.brand ? <Text style={styles.itemBrand} numberOfLines={1}>{item.brand}</Text> : null}</View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          ListFooterComponent={<View style={{ height: 116 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {step === 'details' && selectedItem && (
        <KeyboardAvoidingView style={styles.detailsKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.detailsContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.selectedItemCard}>
              <Image source={{ uri: itemImage(selectedItem) }} style={styles.selectedImage} resizeMode="contain" />
              <View style={styles.selectedItemCopy}><Text style={styles.selectedItemName}>{selectedItem.name}</Text><Text style={styles.selectedItemMeta}>{selectedItem.category}{selectedItem.color ? ` · ${selectedItem.color}` : ''}</Text></View>
            </View>

            <Text style={styles.fieldLabel}>CONDITION</Text>
            <View style={styles.conditionGrid}>
              {(Object.keys(CONDITION_LABELS) as ListingCondition[]).map((value) => (
                <TouchableOpacity key={value} style={[styles.conditionButton, condition === value && styles.conditionButtonActive]} onPress={() => setCondition(value)}>
                  <Text style={[styles.conditionText, condition === value && styles.conditionTextActive]}>{CONDITION_LABELS[value]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>DESCRIPTION</Text>
            <TextInput style={[styles.input, styles.descriptionInput]} multiline value={description} onChangeText={setDescription} placeholder="Describe condition, fit, materials, or anything the buyer should know." placeholderTextColor={Colors.mediumGray} textAlignVertical="top" maxLength={2000} />

            <Text style={styles.fieldLabel}>SALE PRICE (USD)</Text>
            <View style={styles.priceField}><Text style={styles.priceSymbol}>$</Text><TextInput style={styles.priceInput} placeholder="0.00" placeholderTextColor={Colors.mediumGray} keyboardType="decimal-pad" value={listingPrice} onChangeText={setListingPrice} returnKeyType="done" /></View>

            <Text style={styles.fieldLabel}>SHIPPING PRICE (USD)</Text>
            <View style={styles.priceField}><Text style={styles.priceSymbol}>$</Text><TextInput style={styles.priceInput} placeholder="0.00 for free shipping" placeholderTextColor={Colors.mediumGray} keyboardType="decimal-pad" value={shippingPrice} onChangeText={setShippingPrice} returnKeyType="done" /></View>
            <Text style={styles.priceHint}>The buyer sees one total in USD. You will add carrier and tracking after the sale.</Text>
            <Text style={styles.priceHint}>
              ModTok keeps a 10% fee on the sale price (not on shipping).
              {Number(listingPrice.replace(',', '.')) >= 1
                ? ` You receive $${sellerReceives(listingPrice)} plus shipping.`
                : ''}
            </Text>
            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={goBack} disabled={saving}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={saveListing} disabled={saving}><Ionicons name="checkmark" size={19} color={Colors.white} /><Text style={styles.saveButtonText}>{saving ? 'Publishing...' : 'List for sale'}</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: Spacing.sm, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800' },
  headerSpacer: { width: 42 },
  introBlock: { paddingHorizontal: Spacing.base, paddingTop: Spacing.lg, paddingBottom: Spacing.base },
  introTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.xl, fontWeight: '800', textAlign: 'center' },
  introText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, textAlign: 'center', marginTop: Spacing.xs, lineHeight: 20 },
  categoryList: { paddingHorizontal: Spacing.base },
  categoryRow: { gap: Spacing.sm },
  categoryCard: { flex: 1, minHeight: 132, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder, padding: Spacing.base, marginBottom: Spacing.sm },
  categoryIconCircle: { width: 45, height: 45, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9E5E1' },
  categoryName: { marginTop: Spacing.sm, color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '800' },
  categoryCount: { marginTop: 2, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '500' },
  categoryArrow: { position: 'absolute', right: Spacing.base, bottom: Spacing.base },
  itemList: { paddingHorizontal: Spacing.base },
  itemRow: { minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm, backgroundColor: Colors.white, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder },
  itemImage: { width: 62, height: 70, borderRadius: BorderRadius.sm, backgroundColor: '#FFFDF9' },
  itemCopy: { flex: 1 },
  itemName: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '800' },
  itemMeta: { marginTop: 3, color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  itemBrand: { marginTop: 2, color: Colors.textSecondary, fontSize: Typography.fontSize.xs },
  emptyState: { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxxl, gap: Spacing.sm },
  emptyTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800' },
  emptyText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, textAlign: 'center', lineHeight: 20 },
  chooseAnotherButton: { marginTop: Spacing.sm, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, borderColor: Colors.primary, borderWidth: 1.5 },
  chooseAnotherText: { color: Colors.primary, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  detailsKeyboard: { flex: 1 },
  detailsContent: { padding: Spacing.base, paddingBottom: Spacing.lg },
  selectedItemCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder },
  selectedImage: { width: 74, height: 94, borderRadius: BorderRadius.sm, backgroundColor: '#FFFDF9' },
  selectedItemCopy: { flex: 1 },
  selectedItemName: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800' },
  selectedItemMeta: { marginTop: 4, color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  fieldLabel: { marginTop: Spacing.lg, marginBottom: Spacing.sm, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '800', letterSpacing: 0.6 },
  conditionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  conditionButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: Spacing.md, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.white },
  conditionButtonActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  conditionText: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  conditionTextActive: { color: Colors.white },
  input: { minHeight: 52, paddingHorizontal: Spacing.md, color: Colors.textPrimary, fontSize: Typography.fontSize.base, backgroundColor: Colors.white, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder },
  descriptionInput: { minHeight: 110, paddingTop: Spacing.md, paddingBottom: Spacing.md },
  priceField: { flexDirection: 'row', alignItems: 'center', minHeight: 55, paddingHorizontal: Spacing.base, backgroundColor: Colors.white, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder },
  priceSymbol: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800', marginRight: Spacing.xs },
  priceInput: { flex: 1, color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700', paddingVertical: Spacing.sm },
  priceHint: { marginTop: Spacing.sm, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, lineHeight: 18 },
  footer: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: Spacing.base, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.cardBorder },
  cancelButton: { flex: 0.85, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: Colors.cardBorder },
  cancelButtonText: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700' },
  saveButton: { flex: 1.5, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill },
  saveButtonDisabled: { backgroundColor: Colors.mediumGray },
  saveButtonText: { color: Colors.white, fontSize: Typography.fontSize.base, fontWeight: '800' },
});
