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
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { ClothingItem, useCloset } from '../context/ClosetContext';

type ListingType = 'sale' | 'rent';

type SellCategory = {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
};

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

export default function SellItemPickerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { items, updateItem } = useCloset();
  const initialType: ListingType = route.params?.listingType === 'rent' ? 'rent' : 'sale';

  const [step, setStep] = useState<'category' | 'item' | 'details'>('category');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
  const [listingType, setListingType] = useState<ListingType>(initialType);
  const [listingPrice, setListingPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const categoryItems = useMemo(
    () => selectedCategory ? items.filter((item) => item.category === selectedCategory) : [],
    [items, selectedCategory],
  );

  const chooseCategory = (category: string) => {
    setSelectedCategory(category);
    setStep('item');
  };

  const chooseItem = (item: ClothingItem) => {
    setSelectedItem(item);
    setListingPrice(item.salePrice ? String(item.salePrice) : '');
    setListingType(item.listingType === 'rent' ? 'rent' : initialType);
    setStep('details');
  };

  const saveListing = async () => {
    if (!selectedItem) return;
    const price = Number(listingPrice.replace(',', '.'));
    if (!Number.isFinite(price) || price <= 0) {
      Alert.alert('Add a price', `Enter a price greater than $0 to list this item for ${listingType === 'rent' ? 'rent' : 'sale'}.`);
      return;
    }

    setSaving(true);
    try {
      const updated = await updateItem(selectedItem.id, {
        forSale: true,
        salePrice: price,
        listingType,
      });
      if (!updated) {
        Alert.alert('Could not list item', 'Please run the marketplace database repair, then try again.');
        return;
      }
      Alert.alert(
        listingType === 'rent' ? 'Listed for rent' : 'Listed for sale',
        `${selectedItem.name} is now listed on your Sell page.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }],
      );
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (step === 'details') {
      setStep('item');
      return;
    }
    if (step === 'item') {
      setStep('category');
      return;
    }
    navigation.goBack();
  };

  const title = step === 'category'
    ? 'Choose a category'
    : step === 'item'
      ? `Choose a ${selectedCategory ?? 'piece'}`
      : 'Create listing';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="chevron-back" size={25} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {step === 'category' && (
        <FlatList
          data={SELL_CATEGORIES}
          keyExtractor={(category) => category.name}
          numColumns={2}
          contentContainerStyle={styles.categoryList}
          columnWrapperStyle={styles.categoryRow}
          ListHeaderComponent={
            <View style={styles.introBlock}>
              <Text style={styles.introTitle}>What would you like to list?</Text>
              <Text style={styles.introText}>Start with a category, then choose the piece from your wardrobe.</Text>
            </View>
          }
          renderItem={({ item: category }) => {
            const count = items.filter((closetItem) => closetItem.category === category.name).length;
            return (
              <TouchableOpacity
                style={styles.categoryCard}
                onPress={() => chooseCategory(category.name)}
                activeOpacity={0.82}
              >
                <View style={styles.categoryIconCircle}>
                  <Ionicons name={category.icon} size={25} color={Colors.primary} />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryCount}>{count === 1 ? '1 piece' : `${count} pieces`}</Text>
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
          ListHeaderComponent={
            <View style={styles.introBlock}>
              <Text style={styles.introTitle}>Your {selectedCategory}</Text>
              <Text style={styles.introText}>Tap the exact piece you want to list.</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="shirt-outline" size={48} color={Colors.mediumGray} />
              <Text style={styles.emptyTitle}>No {selectedCategory} yet</Text>
              <Text style={styles.emptyText}>Choose another category or add this piece to your wardrobe first.</Text>
              <TouchableOpacity style={styles.chooseAnotherButton} onPress={() => setStep('category')}>
                <Text style={styles.chooseAnotherText}>Choose another category</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.itemRow} onPress={() => chooseItem(item)} activeOpacity={0.82}>
              <Image source={{ uri: itemImage(item) }} style={styles.itemImage} resizeMode="contain" />
              <View style={styles.itemCopy}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemMeta} numberOfLines={1}>
                  {item.category}{item.color ? ` · ${item.color}` : ''}
                </Text>
                {item.brand ? <Text style={styles.itemBrand} numberOfLines={1}>{item.brand}</Text> : null}
              </View>
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
              <View style={styles.selectedItemCopy}>
                <Text style={styles.selectedItemName}>{selectedItem.name}</Text>
                <Text style={styles.selectedItemMeta}>{selectedItem.category}{selectedItem.color ? ` · ${selectedItem.color}` : ''}</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>LISTING TYPE</Text>
            <View style={styles.typeToggle}>
              {(['sale', 'rent'] as ListingType[]).map((type) => {
                const active = listingType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeOption, active && styles.typeOptionActive]}
                    onPress={() => setListingType(type)}
                  >
                    <Ionicons name={type === 'sale' ? 'pricetag-outline' : 'calendar-outline'} size={17} color={active ? Colors.white : Colors.textPrimary} />
                    <Text style={[styles.typeOptionText, active && styles.typeOptionTextActive]}>{type === 'sale' ? 'Sell' : 'Rent'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>{listingType === 'rent' ? 'RENTAL PRICE' : 'ASKING PRICE'}</Text>
            <View style={styles.priceField}>
              <Text style={styles.priceSymbol}>$</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                placeholderTextColor={Colors.mediumGray}
                keyboardType="decimal-pad"
                value={listingPrice}
                onChangeText={setListingPrice}
                returnKeyType="done"
              />
              {listingType === 'rent' && <Text style={styles.priceSuffix}>per day</Text>}
            </View>
            <Text style={styles.priceHint}>
              {listingType === 'rent' ? 'You can adjust the rental terms later.' : 'You can change or unlist this item any time.'}
            </Text>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={goBack} disabled={saving}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={saveListing} disabled={saving}>
              <Ionicons name="checkmark" size={19} color={Colors.white} />
              <Text style={styles.saveButtonText}>{saving ? 'Listing...' : listingType === 'rent' ? 'List for rent' : 'List for sale'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm, paddingBottom: Spacing.sm, backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
  },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800' },
  headerSpacer: { width: 42 },
  introBlock: { paddingHorizontal: Spacing.base, paddingTop: Spacing.lg, paddingBottom: Spacing.base },
  introTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.xl, fontWeight: '800', textAlign: 'center' },
  introText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, textAlign: 'center', marginTop: Spacing.xs, lineHeight: 20 },
  categoryList: { paddingHorizontal: Spacing.base },
  categoryRow: { gap: Spacing.sm },
  categoryCard: {
    flex: 1, minHeight: 132, backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.cardBorder, padding: Spacing.base, marginBottom: Spacing.sm,
  },
  categoryIconCircle: { width: 45, height: 45, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9E5E1' },
  categoryName: { marginTop: Spacing.sm, color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '800' },
  categoryCount: { marginTop: 2, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '500' },
  categoryArrow: { position: 'absolute', right: Spacing.base, bottom: Spacing.base },
  itemList: { paddingHorizontal: Spacing.base },
  itemRow: {
    minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder,
  },
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
  selectedImage: { width: 74, height: 86, borderRadius: BorderRadius.sm, backgroundColor: '#FFFDF9' },
  selectedItemCopy: { flex: 1 },
  selectedItemName: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800' },
  selectedItemMeta: { marginTop: 4, color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  fieldLabel: { marginTop: Spacing.lg, marginBottom: Spacing.sm, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '800', letterSpacing: 0.6 },
  typeToggle: { flexDirection: 'row', gap: Spacing.sm },
  typeOption: { flex: 1, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, backgroundColor: Colors.white, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.cardBorder },
  typeOptionActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  typeOptionText: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700' },
  typeOptionTextActive: { color: Colors.white },
  priceField: { flexDirection: 'row', alignItems: 'center', minHeight: 55, paddingHorizontal: Spacing.base, backgroundColor: Colors.white, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder },
  priceSymbol: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800', marginRight: Spacing.xs },
  priceInput: { flex: 1, color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700', paddingVertical: Spacing.sm },
  priceSuffix: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  priceHint: { marginTop: Spacing.sm, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, lineHeight: 18 },
  footer: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: Spacing.base, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.cardBorder },
  cancelButton: { flex: 0.85, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: Colors.cardBorder },
  cancelButtonText: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700' },
  saveButton: { flex: 1.5, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill },
  saveButtonDisabled: { backgroundColor: Colors.mediumGray },
  saveButtonText: { color: Colors.white, fontSize: Typography.fontSize.base, fontWeight: '800' },
});
