import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  useWindowDimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCloset } from '../context/ClosetContext';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { ClothingItem } from '../context/ClosetContext';

const CLOTHING_CATEGORIES = [
  'Coats', 'Jackets', 'Cardigans', 'Sweaters', 'Blouses',
  'T shirts', 'Dresses', 'Pants', 'Skirts', 'Shorts', 'Shoes', 'Bags', 'Accessories', 'Activewear',
];

const DEFAULT_STYLE_TAGS = [
  'Casual', 'Chic', 'Career', 'Sexy', 'Chill', 'Boho', 'Sporty',
  'Elegant', 'Edgy', 'Minimalist', 'Romantic', 'Streetwear', 'Vintage', 'Preppy',
];

const DEFAULT_SEASONS = ['Spring/Summer', 'Fall/Winter', 'All Season'];

const COLORS_LIST = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#1A1A1A' },
  { name: 'Navy', hex: '#1B2A4A' },
  { name: 'Beige', hex: '#D4B896' },
  { name: 'Brown', hex: '#7B4F2E' },
  { name: 'Pink', hex: '#F4A7B9' },
  { name: 'Red', hex: '#D93025' },
  { name: 'Green', hex: '#2E7D32' },
  { name: 'Blue', hex: '#1565C0' },
  { name: 'Gray', hex: '#9E9E9E' },
  { name: 'Yellow', hex: '#F9A825' },
  { name: 'Purple', hex: '#6A1B9A' },
];

export default function ItemDetailScreen() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const isNarrow = width < 480;
  const route = useRoute<any>();
  const item: ClothingItem = route.params?.item;

  const { removeItem } = useCloset();
  const [isFavorite, setIsFavorite] = useState(item?.isFavorite || false);
  const [saved, setSaved] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCategoryAlert, setShowCategoryAlert] = useState(false);

  // Editable fields
  const [name, setName] = useState(item?.name || '');
  const [brand, setBrand] = useState(item?.brand || '');
  const [price, setPrice] = useState(item?.price ? String(item.price) : '');
  const [caption, setCaption] = useState(item?.caption || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    item?.category ? [item.category] : []
  );

  // Style tags — preset + custom
  const [selectedStyleTags, setSelectedStyleTags] = useState<string[]>(item?.tags || []);
  const [customStyleTags, setCustomStyleTags] = useState<string[]>([]);
  const [showStyleInput, setShowStyleInput] = useState(false);
  const [newStyleTag, setNewStyleTag] = useState('');

  // Seasons — preset + custom
  const [selectedSeason, setSelectedSeason] = useState(item?.season || '');
  const [customSeasons, setCustomSeasons] = useState<string[]>([]);
  const [showSeasonInput, setShowSeasonInput] = useState(false);
  const [newSeason, setNewSeason] = useState('');

  // Color — preset + custom
  const [selectedColor, setSelectedColor] = useState(item?.color || '');
  const [customColorName, setCustomColorName] = useState('');
  const [showColorInput, setShowColorInput] = useState(false);
  const [newColorName, setNewColorName] = useState('');

  if (!item) return null;

  const allStyleTags = [...DEFAULT_STYLE_TAGS, ...customStyleTags];
  const allSeasons = [...DEFAULT_SEASONS, ...customSeasons];

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleStyleTag = (tag: string) => {
    setSelectedStyleTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addCustomStyleTag = () => {
    const tag = newStyleTag.trim();
    if (!tag) return;
    if (!customStyleTags.includes(tag)) setCustomStyleTags((p) => [...p, tag]);
    setSelectedStyleTags((p) => p.includes(tag) ? p : [...p, tag]);
    setNewStyleTag('');
    setShowStyleInput(false);
  };

  const addCustomSeason = () => {
    const s = newSeason.trim();
    if (!s) return;
    if (!customSeasons.includes(s)) setCustomSeasons((p) => [...p, s]);
    setSelectedSeason(s);
    setNewSeason('');
    setShowSeasonInput(false);
  };

  const addCustomColor = () => {
    const c = newColorName.trim();
    if (!c) return;
    setCustomColorName(c);
    setSelectedColor(c);
    setNewColorName('');
    setShowColorInput(false);
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    setShowDeleteModal(false);
    removeItem(item.id);
    navigation.goBack();
  };

  const handleSave = () => {
    if (selectedCategories.length === 0) {
      setShowCategoryAlert(true);
      return;
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      navigation.goBack();
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{name || item.name}</Text>
        <TouchableOpacity onPress={() => setIsFavorite(!isFavorite)} style={styles.iconBtn}>
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={22}
            color={isFavorite ? Colors.primary : Colors.black}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Item Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.image }} style={styles.image} resizeMode="contain" />
          <TouchableOpacity style={styles.changePhotoOverlay}>
            <Ionicons name="camera" size={18} color={Colors.white} />
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Name, Brand, Price, Caption */}
        <View style={styles.card}>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Item Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={name}
              onChangeText={setName}
              placeholder="Item name"
              placeholderTextColor={Colors.mediumGray}
            />
          </View>
          <View style={[styles.fieldRow, isNarrow && styles.fieldRowNarrow]}>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Brand</Text>
              <TextInput
                style={styles.fieldInput}
                value={brand}
                onChangeText={setBrand}
                placeholder="e.g. Zara"
                placeholderTextColor={Colors.mediumGray}
              />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Price ($)</Text>
              <TextInput
                style={styles.fieldInput}
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor={Colors.mediumGray}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Caption</Text>
            <TextInput
              style={[styles.fieldInput, styles.captionInput]}
              value={caption}
              onChangeText={setCaption}
              placeholder="Add a caption..."
              placeholderTextColor={Colors.mediumGray}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Category */}
        <Text style={styles.sectionLabel}>Category</Text>
        <View style={styles.listCard}>
          {CLOTHING_CATEGORIES.map((cat, i) => (
            <View
              key={cat}
              style={[styles.listRow, i < CLOTHING_CATEGORIES.length - 1 && styles.listRowBorder]}
            >
              <Switch
                value={selectedCategories.includes(cat)}
                onValueChange={() => toggleCategory(cat)}
                trackColor={{ false: Colors.lightGray, true: Colors.primary }}
                thumbColor={Colors.white}
                ios_backgroundColor={Colors.lightGray}
              />
              <Text style={styles.listRowText}>{cat}</Text>
            </View>
          ))}
        </View>

        {/* Style Tags */}
        <Text style={styles.sectionLabel}>Style</Text>
        <Text style={styles.sectionSub}>Tag the vibe of this piece</Text>
        <View style={styles.tagGrid}>
          {allStyleTags.map((tag) => {
            const isActive = selectedStyleTags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.tagPill, isActive && styles.tagPillActive]}
                onPress={() => toggleStyleTag(tag)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tagPillText, isActive && styles.tagPillTextActive]}>{tag}</Text>
              </TouchableOpacity>
            );
          })}
          {/* Add custom style tag */}
          {showStyleInput ? (
            <View style={styles.inlineInputRow}>
              <TextInput
                style={styles.inlineInput}
                value={newStyleTag}
                onChangeText={setNewStyleTag}
                placeholder="e.g. Parisian"
                placeholderTextColor={Colors.mediumGray}
                autoFocus
                onSubmitEditing={addCustomStyleTag}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.inlineAddBtn} onPress={addCustomStyleTag}>
                <Ionicons name="checkmark" size={16} color={Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.inlineCancelBtn} onPress={() => { setShowStyleInput(false); setNewStyleTag(''); }}>
                <Ionicons name="close" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addPill}
              onPress={() => setShowStyleInput(true)}
            >
              <Ionicons name="add" size={14} color={Colors.primary} />
              <Text style={styles.addPillText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Season */}
        <Text style={styles.sectionLabel}>Season</Text>
        <View style={styles.seasonRow}>
          {allSeasons.map((season) => (
            <TouchableOpacity
              key={season}
              onPress={() => setSelectedSeason(season)}
              style={[styles.seasonPill, selectedSeason === season && styles.seasonPillActive]}
            >
              <Text style={[styles.seasonPillText, selectedSeason === season && styles.seasonPillTextActive]}>
                {season}
              </Text>
            </TouchableOpacity>
          ))}
          {/* Add custom season */}
          {showSeasonInput ? (
            <View style={styles.inlineInputRow}>
              <TextInput
                style={styles.inlineInput}
                value={newSeason}
                onChangeText={setNewSeason}
                placeholder="e.g. Tuscany Autumn"
                placeholderTextColor={Colors.mediumGray}
                autoFocus
                onSubmitEditing={addCustomSeason}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.inlineAddBtn} onPress={addCustomSeason}>
                <Ionicons name="checkmark" size={16} color={Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.inlineCancelBtn} onPress={() => { setShowSeasonInput(false); setNewSeason(''); }}>
                <Ionicons name="close" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addPill}
              onPress={() => setShowSeasonInput(true)}
            >
              <Ionicons name="add" size={14} color={Colors.primary} />
              <Text style={styles.addPillText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Color */}
        <Text style={styles.sectionLabel}>Color</Text>
        <View style={styles.colorGrid}>
          {COLORS_LIST.map((color) => {
            const isSelected = selectedColor === color.name;
            return (
              <TouchableOpacity
                key={color.name}
                style={styles.colorItem}
                onPress={() => setSelectedColor(color.name)}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.colorSwatch,
                  { backgroundColor: color.hex },
                  color.name === 'White' && styles.colorSwatchBorder,
                  isSelected && styles.colorSwatchSelected,
                ]}>
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={['White', 'Beige', 'Yellow'].includes(color.name) ? Colors.black : Colors.white}
                    />
                  )}
                </View>
                <Text style={[styles.colorLabel, isSelected && styles.colorLabelActive]}>
                  {color.name}
                </Text>
              </TouchableOpacity>
            );
          })}
          {/* Custom color swatch */}
          {customColorName ? (
            <TouchableOpacity
              style={styles.colorItem}
              onPress={() => setSelectedColor(customColorName)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.colorSwatch,
                styles.customColorSwatch,
                selectedColor === customColorName && styles.colorSwatchSelected,
              ]}>
                {selectedColor === customColorName ? (
                  <Ionicons name="checkmark" size={14} color={Colors.white} />
                ) : (
                  <Ionicons name="color-palette-outline" size={14} color={Colors.primary} />
                )}
              </View>
              <Text style={[styles.colorLabel, selectedColor === customColorName && styles.colorLabelActive]}>
                {customColorName}
              </Text>
            </TouchableOpacity>
          ) : null}
          {/* Add custom color */}
          {showColorInput ? (
            <View style={[styles.inlineInputRow, { width: '100%' }]}>
              <TextInput
                style={styles.inlineInput}
                value={newColorName}
                onChangeText={setNewColorName}
                placeholder="e.g. Dusty Rose"
                placeholderTextColor={Colors.mediumGray}
                autoFocus
                onSubmitEditing={addCustomColor}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.inlineAddBtn} onPress={addCustomColor}>
                <Ionicons name="checkmark" size={16} color={Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.inlineCancelBtn} onPress={() => { setShowColorInput(false); setNewColorName(''); }}>
                <Ionicons name="close" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.colorItem}
              onPress={() => setShowColorInput(true)}
            >
              <View style={[styles.colorSwatch, styles.addColorSwatch]}>
                <Ionicons name="add" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.colorLabel}>Custom</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Added Date */}
        <Text style={styles.addedDate}>Added {item.addedDate}</Text>

        {/* Sell Item button only */}
        <View style={styles.actionRow}>
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

        {/* Delete Button */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.85}>
          <Ionicons name="trash-outline" size={16} color={Colors.error || '#D93025'} />
          <Text style={styles.deleteButtonText}>Delete Item</Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Ionicons name="trash-outline" size={32} color="#D93025" style={{ marginBottom: Spacing.sm }} />
            <Text style={styles.modalTitle}>Delete Item</Text>
            <Text style={styles.modalMessage}>Are you sure you want to permanently delete this item? This cannot be undone.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowDeleteModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDeleteBtn} onPress={confirmDelete}>
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Required Modal */}
      <Modal visible={showCategoryAlert} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Ionicons name="alert-circle-outline" size={32} color={Colors.primary} style={{ marginBottom: Spacing.sm }} />
            <Text style={styles.modalTitle}>Category Required</Text>
            <Text style={styles.modalMessage}>Please select at least one category before saving.</Text>
            <TouchableOpacity style={[styles.modalDeleteBtn, { backgroundColor: Colors.primary }]} onPress={() => setShowCategoryAlert(false)}>
              <Text style={styles.modalDeleteText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Saved toast */}
      {saved && (
        <View style={styles.savedToast}>
          <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
          <Text style={styles.savedToastText}>Changes saved!</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    backgroundColor: Colors.white,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  scrollContent: { paddingHorizontal: Spacing.base, paddingTop: Spacing.base },
  imageContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.base,
    overflow: 'hidden',
  },
  image: { width: '70%', height: 260 },
  changePhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  changePhotoText: { color: Colors.white, fontWeight: '600', fontSize: Typography.fontSize.sm },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  fieldBlock: { marginBottom: Spacing.xs },
  fieldRow: { flexDirection: 'row', gap: Spacing.md },
  fieldRowNarrow: { flexDirection: 'column' },
  fieldHalf: { flex: 1 },
  fieldLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  captionInput: { height: 72, textAlignVertical: 'top' },
  sectionLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
    marginTop: Spacing.sm,
  },
  sectionSub: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  listCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
    marginBottom: Spacing.base,
  },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.base },
  listRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  listRowText: { fontSize: Typography.fontSize.base, color: Colors.textPrimary, marginLeft: Spacing.md, fontWeight: '500' },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.base },
  tagPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.white,
  },
  tagPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tagPillText: { fontSize: Typography.fontSize.sm, color: Colors.textPrimary, fontWeight: '600' },
  tagPillTextActive: { color: Colors.white },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
    gap: 3,
  },
  addPillText: { fontSize: Typography.fontSize.sm, color: Colors.primary, fontWeight: '600' },
  inlineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  inlineInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    minWidth: 120,
  },
  inlineAddBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineCancelBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seasonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.base },
  seasonPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.white,
  },
  seasonPillActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  seasonPillText: { fontSize: Typography.fontSize.xs, color: Colors.textPrimary, fontWeight: '600' },
  seasonPillTextActive: { color: Colors.white },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.base },
  colorItem: { alignItems: 'center', gap: 4, width: 44 },
  colorSwatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  colorSwatchBorder: { borderWidth: 1.5, borderColor: Colors.cardBorder },
  colorSwatchSelected: { borderWidth: 3, borderColor: Colors.primary },
  customColorSwatch: { backgroundColor: Colors.lightGray },
  addColorSwatch: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  colorLabel: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center' },
  colorLabelActive: { color: Colors.primary, fontWeight: '700' },
  addedDate: { fontSize: Typography.fontSize.xs, color: Colors.textLight, marginBottom: Spacing.base },
  actionRow: { marginBottom: Spacing.base },
  sellBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  sellBtnText: { color: Colors.primary, fontWeight: '700', fontSize: Typography.fontSize.sm },
  listedBadge: {
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
  listedText: { color: Colors.primary, fontWeight: '700', fontSize: Typography.fontSize.sm },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    borderColor: '#D93025',
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  deleteButtonText: { color: '#D93025', fontWeight: '700', fontSize: Typography.fontSize.sm },
  saveButton: {
    backgroundColor: Colors.black,
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  saveButtonText: { color: Colors.white, fontWeight: '700', fontSize: Typography.fontSize.base },
  savedToast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  savedToastText: { color: Colors.white, fontWeight: '600', fontSize: Typography.fontSize.sm },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.pill,
    backgroundColor: '#D93025',
    alignItems: 'center',
  },
  modalDeleteText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Colors.white,
  },
});
