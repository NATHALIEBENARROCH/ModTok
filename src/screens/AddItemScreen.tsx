import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Image,
  Switch,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { supabase } from '../lib/supabase';
import { useCloset } from '../context/ClosetContext';

// Upload a local image URI to Supabase Storage and return the public URL
async function uploadImageToSupabase(localUri: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const response = await fetch(localUri);
    const blob = await response.blob();
    const ext = localUri.split('.').pop()?.split('?')[0] ?? 'jpg';
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('clothing-photos')
      .upload(filePath, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
    if (uploadError) { console.error('Upload error:', uploadError); return null; }
    const { data } = supabase.storage.from('clothing-photos').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (err) {
    console.error('uploadImageToSupabase error:', err);
    return null;
  }
}

const CLOTHING_CATEGORIES = [
  'Coats', 'Jackets', 'Cardigans', 'Sweaters', 'Blouses',
  'T shirts', 'Dresses', 'Pants', 'Skirts', 'Shorts', 'Shoes', 'Bags', 'Accessories', 'Activewear',
];

const STYLE_TAGS = [
  'Casual', 'Chic', 'Career', 'Sexy', 'Chill', 'Boho', 'Sporty',
  'Elegant', 'Edgy', 'Minimalist', 'Romantic', 'Streetwear', 'Vintage', 'Preppy',
];

const SEASONS = ['Spring/Summer', 'Fall/Winter', 'All Season'];

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

// ─── STEP 1: Photo Picker ────────────────────────────────────────────────────
function StepPickPhoto({
  onNext,
  onCancel,
}: {
  onNext: (uri: string) => void;
  onCancel: () => void;
}) {
  const [selectedUri, setSelectedUri] = useState<string | null>(null);

  const openLibrary = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets.length > 0) {
      setSelectedUri(result.assets[0].uri);
    }
  };

  const openCamera = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required.');
        return;
      }
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.9,
    });
    if (!result.canceled && result.assets.length > 0) {
      setSelectedUri(result.assets[0].uri);
    }
  };

  // Auto-open library on mount
  React.useEffect(() => {
    openLibrary();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recents</Text>
        <TouchableOpacity
          onPress={() => selectedUri && onNext(selectedUri)}
          disabled={!selectedUri}
        >
          <Text style={[styles.nextText, !selectedUri && styles.nextTextDisabled]}>Next</Text>
        </TouchableOpacity>
      </View>

      {/* Preview of selected photo */}
      <View style={styles.photoPreviewArea}>
        {selectedUri ? (
          <Image source={{ uri: selectedUri }} style={styles.fullPreview} resizeMode="cover" />
        ) : (
          <View style={styles.photoPreviewPlaceholder}>
            <Ionicons name="image-outline" size={48} color={Colors.mediumGray} />
            <Text style={styles.photoPreviewPlaceholderText}>No photo selected</Text>
          </View>
        )}
      </View>

      {/* Source buttons */}
      <View style={styles.sourceRow}>
        <TouchableOpacity style={styles.sourceBtn} onPress={openLibrary}>
          <Ionicons name="images-outline" size={20} color={Colors.textPrimary} />
          <Text style={styles.sourceBtnText}>Library</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sourceBtn} onPress={openCamera}>
          <Ionicons name="camera-outline" size={20} color={Colors.textPrimary} />
          <Text style={styles.sourceBtnText}>Camera</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── STEP 2: Details ─────────────────────────────────────────────────────────
interface ItemFormData {
  name: string;
  category: string;
  brand: string;
  color: string;
  season: string;
  price: string;
  tags: string[];
  imageUri: string;
}

function StepDetails({
  imageUri,
  onBack,
  onSave,
}: {
  imageUri: string;
  onBack: () => void;
  onSave: (data: ItemFormData) => void;
}) {
  const { width } = useWindowDimensions();
  const isNarrow = width < 480;

  const [caption, setCaption] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStyleTags, setSelectedStyleTags] = useState<string[]>([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');

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

  const handleSave = () => {
    if (selectedCategories.length === 0) {
      Alert.alert('Category Required', 'Please select at least one category.');
      return;
    }
    onSave({
      name: caption.trim() || selectedCategories[0],
      category: selectedCategories[0],
      brand,
      color: selectedColor,
      season: selectedSeason,
      price,
      tags: selectedStyleTags,
      imageUri,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Item</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Thumbnail + Caption */}
        <View style={styles.thumbCaptionRow}>
          <Image source={{ uri: imageUri }} style={styles.thumbnail} resizeMode="cover" />
          <TextInput
            style={styles.captionInput}
            placeholder="Write Caption"
            placeholderTextColor={Colors.primary}
            value={caption}
            onChangeText={setCaption}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Brand & Price */}
        <View style={[styles.fieldRow, isNarrow && styles.fieldRowNarrow]}>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>Brand</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. Zara"
              placeholderTextColor={Colors.mediumGray}
              value={brand}
              onChangeText={setBrand}
            />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>Price ($)</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="0.00"
              placeholderTextColor={Colors.mediumGray}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Choose Category */}
        <Text style={styles.sectionLabel}>Choose category</Text>
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
          {STYLE_TAGS.map((tag) => {
            const isActive = selectedStyleTags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.tagPill, isActive && styles.tagPillActive]}
                onPress={() => toggleStyleTag(tag)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tagPillText, isActive && styles.tagPillTextActive]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Season */}
        <Text style={styles.sectionLabel}>Season</Text>
        <View style={styles.seasonRow}>
          {SEASONS.map((season) => (
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
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Main Screen (orchestrates steps) ────────────────────────────────────────
export default function AddItemScreen() {
  const navigation = useNavigation<any>();
  const { addItem } = useCloset();
  const [step, setStep] = useState<1 | 2>(1);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleNext = (uri: string) => {
    setImageUri(uri);
    setStep(2);
  };

  const handleSave = async (itemData: ItemFormData) => {
    setSaving(true);
    try {
      // Upload photo to Supabase Storage
      const imageUrl = await uploadImageToSupabase(itemData.imageUri);
      // Save item to database via context
      await addItem({
        name: itemData.name,
        category: itemData.category,
        brand: itemData.brand || undefined,
        color: itemData.color || undefined,
        season: itemData.season || undefined,
        price: itemData.price ? parseFloat(itemData.price) : undefined,
        image: imageUrl ?? itemData.imageUri,
        image_url: imageUrl ?? undefined,
        tags: itemData.tags,
        isFavorite: false,
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        navigation.goBack();
      }, 1200);
    } catch (err) {
      Alert.alert('Error', 'Could not save item. Please try again.');
      console.error('handleSave error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (step === 1) {
    return (
      <StepPickPhoto
        onNext={handleNext}
        onCancel={() => navigation.goBack()}
      />
    );
  }

  return (
    <>
      <StepDetails
        imageUri={imageUri!}
        onBack={() => setStep(1)}
        onSave={handleSave}
      />
      {saving && (
        <View style={[styles.savedToast, { backgroundColor: Colors.primary }]}>
          <ActivityIndicator size="small" color={Colors.white} />
          <Text style={styles.savedToastText}>Saving to your closet...</Text>
        </View>
      )}
      {saved && (
        <View style={styles.savedToast}>
          <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
          <Text style={styles.savedToastText}>Item saved to your closet!</Text>
        </View>
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    backgroundColor: Colors.white,
  },
  cancelText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    fontWeight: '500',
    minWidth: 56,
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  nextText: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    fontWeight: '700',
    minWidth: 56,
    textAlign: 'right',
  },
  nextTextDisabled: {
    color: Colors.mediumGray,
  },
  saveText: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    fontWeight: '700',
    minWidth: 56,
    textAlign: 'right',
  },
  // Step 1
  photoPreviewArea: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  fullPreview: {
    flex: 1,
    width: '100%',
  },
  photoPreviewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  photoPreviewPlaceholderText: {
    color: Colors.mediumGray,
    fontSize: Typography.fontSize.base,
  },
  sourceRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  sourceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
  },
  sourceBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  // Step 2
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
  },
  thumbCaptionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.base,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.md,
  },
  thumbnail: {
    width: 90,
    height: 110,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.lightGray,
  },
  captionInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  fieldRowNarrow: {
    flexDirection: 'column',
  },
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
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
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
  // Category list (switch style)
  listCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
    marginBottom: Spacing.base,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  listRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  listRowText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    marginLeft: Spacing.md,
    fontWeight: '500',
  },
  // Style Tags
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  tagPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.white,
  },
  tagPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tagPillText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  tagPillTextActive: {
    color: Colors.white,
  },
  // Season
  seasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  seasonPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.white,
  },
  seasonPillActive: {
    backgroundColor: Colors.black,
    borderColor: Colors.black,
  },
  seasonPillText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  seasonPillTextActive: { color: Colors.white },
  // Color
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  colorItem: {
    alignItems: 'center',
    gap: 4,
    width: 44,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchBorder: {
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  colorLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  colorLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  // Toast
  savedToast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.green,
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
  savedToastText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: Typography.fontSize.sm,
  },
});
