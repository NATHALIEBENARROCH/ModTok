import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Image,
  Switch,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  Modal,
  FlatList,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { supabase } from '../lib/supabase';
import { useCloset } from '../context/ClosetContext';
import { useOutfit } from '../context/OutfitContext';

// Upload a local image URI to Supabase Storage and return the public URL
async function uploadImageToSupabase(localUri: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const response = await fetch(localUri);
    if (!response.ok) throw new Error(`Unable to read the selected photo (${response.status}).`);
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) throw new Error('The selected photo was empty.');

    const ext = localUri.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/)?.[1] ?? 'jpg';
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const { error: uploadError } = await supabase.storage
      .from('clothing-photos')
      .upload(filePath, arrayBuffer, { contentType, upsert: false });
    if (uploadError) { console.error('Upload error:', uploadError); return null; }
    const { data } = supabase.storage.from('clothing-photos').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (err) {
    console.error('uploadImageToSupabase error:', err);
    return null;
  }
}

const CLOTHING_CATEGORIES = [
  'Coats', 'Jackets', 'Cardigans', 'Sweaters', 'Tops', 'Blouses',
  'T shirts', 'Dresses', 'Pants', 'Skirts', 'Shorts', 'Shoes', 'Boots', 'Sneakers', 'Bags', 'Jewelry', 'Accessories', 'Activewear',
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

const COLOR_PICKER_SWATCHES = [
  '#EF4444', '#F97316', '#FBBF24', '#84CC16', '#22C55E', '#14B8A6',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#EC4899',
  '#F43F5E', '#7F1D1D', '#92400E', '#A16207', '#365314', '#166534',
  '#115E59', '#0E7490', '#1E3A8A', '#312E81', '#581C87', '#831843',
  '#F8FAFC', '#D1D5DB', '#9CA3AF', '#4B5563', '#1F2937', '#111827',
];

type SavedChoice = {
  id: string;
  choice_type: 'color';
  label: string;
  color_hex: string | null;
};

function colorHexForLabel(label: string): string {
  const value = label.trim().toLowerCase();
  if (value.includes('silver')) return '#C0C0C0';
  if (value.includes('gold')) return '#D4AF37';
  if (value.includes('burgundy') || value.includes('wine')) return '#800020';
  if (value.includes('coral')) return '#FF7F50';
  if (value.includes('orange')) return '#F97316';
  if (value.includes('lavender')) return '#A78BFA';
  if (value.includes('cream')) return '#FFF6DC';
  if (value.includes('teal')) return '#0F766E';
  if (value.includes('olive')) return '#708238';
  return '#8E8E93';
}

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

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add a photo</Text>
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
          <Text style={styles.sourceBtnText}>Choose from Library</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sourceBtn} onPress={openCamera}>
          <Ionicons name="camera-outline" size={20} color={Colors.textPrimary} />
          <Text style={styles.sourceBtnText}>Take a Photo</Text>
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
  occasions: string[];
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
  const [customTag, setCustomTag] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [savedChoices, setSavedChoices] = useState<SavedChoice[]>([]);
  const [showOccasionInput, setShowOccasionInput] = useState(false);
  const [newOccasion, setNewOccasion] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [newColorChoice, setNewColorChoice] = useState('');
  const [pickerColorHex, setPickerColorHex] = useState('#D4AF37');
  const { occasions, addOccasion } = useOutfit();

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

  const toggleOccasion = (occasion: string) => {
    setSelectedOccasions((previous) =>
      previous.includes(occasion)
        ? previous.filter((name) => name !== occasion)
        : [...previous, occasion],
    );
  };

  useEffect(() => {
    let active = true;

    async function loadSavedChoices() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('wardrobe_choices')
        .select('id, choice_type, label, color_hex')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Could not load saved wardrobe choices:', error.message);
        return;
      }
      if (active) setSavedChoices((data ?? []) as SavedChoice[]);
    }

    loadSavedChoices();
    return () => { active = false; };
  }, []);

  const addSavedChoice = async (
    choiceType: 'color',
    rawLabel: string,
    providedHex?: string,
  ): Promise<boolean> => {
    const label = rawLabel.trim();
    if (!label) return false;

    const existing = savedChoices.find(
      (choice) => choice.choice_type === choiceType && choice.label.toLowerCase() === label.toLowerCase(),
    );
    if (existing) {
      setSelectedColor(existing.label);
      return true;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in before saving a reusable choice.');
      return false;
    }

    const colorHex = choiceType === 'color'
      ? (/^#[0-9A-Fa-f]{6}$/.test(providedHex ?? '') ? providedHex! : colorHexForLabel(label))
      : null;

    const { data, error } = await supabase
      .from('wardrobe_choices')
      .upsert(
        { user_id: user.id, choice_type: choiceType, label, color_hex: colorHex },
        { onConflict: 'user_id,choice_type,label' },
      )
      .select('id, choice_type, label, color_hex')
      .single();

    if (error || !data) {
      Alert.alert('Could not save color', 'Please run the attached color repair in Supabase, then try one more time.');
      return false;
    }

    const choice = data as SavedChoice;
    setSavedChoices((previous) => {
      const withoutDuplicate = previous.filter((saved) => saved.id !== choice.id);
      return [...withoutDuplicate, choice];
    });
    setSelectedColor(choice.label);
    return true;
  };

  const savePickedColor = async () => {
    if (!newColorChoice.trim()) {
      Alert.alert('Name your color', 'For example: Gold, Metallic Silver, or Cherry Red.');
      return;
    }
    const saved = await addSavedChoice('color', newColorChoice, pickerColorHex);
    if (!saved) return;
    setNewColorChoice('');
    setShowColorPicker(false);
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
      occasions: selectedOccasions,
      price,
      tags: customTag.trim()
        ? [...selectedStyleTags, customTag.trim()]
        : selectedStyleTags,
      imageUri,
    });
  };

  const savedColors = savedChoices.filter((choice) => choice.choice_type === 'color');

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
        <TextInput
          style={styles.customFieldInput}
          placeholder="Add your own tag (e.g. Vacation, Beach, Work)"
          placeholderTextColor={Colors.mediumGray}
          value={customTag}
          onChangeText={setCustomTag}
          returnKeyType="done"
        />

        {/* Season */}
        <Text style={styles.sectionLabel}>Season</Text>
        <Text style={styles.sectionSub}>Choose the time of year this piece works best.</Text>
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

        {/* Shared occasions */}
        <Text style={styles.sectionLabel}>Occasions</Text>
        <Text style={styles.sectionSub}>Optional — select every occasion this piece can work for.</Text>
        <View style={styles.seasonRow}>
          {occasions.map((occasion) => {
            const isSelected = selectedOccasions.includes(occasion.name);
            return (
              <TouchableOpacity
                key={occasion.id}
                onPress={() => toggleOccasion(occasion.name)}
                style={[styles.seasonPill, isSelected && styles.seasonPillActive]}
              >
                <Text style={[styles.seasonPillText, isSelected && styles.seasonPillTextActive]}>{occasion.name}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.addChoicePill} onPress={() => setShowOccasionInput(true)}>
            <Ionicons name="add" size={15} color={Colors.primary} />
            <Text style={styles.addChoicePillText}>Add occasion</Text>
          </TouchableOpacity>
        </View>
        {showOccasionInput && (
          <View style={styles.choiceInputRow}>
            <TextInput
              style={[styles.customFieldInput, styles.choiceInput]}
              placeholder="e.g. Vacation, Wedding, Work"
              placeholderTextColor={Colors.mediumGray}
              value={newOccasion}
              onChangeText={setNewOccasion}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={async () => {
                if (newOccasion.trim()) await addOccasion(newOccasion.trim());
                setSelectedOccasions((previous) => newOccasion.trim() ? [...previous, newOccasion.trim()] : previous);
                setNewOccasion('');
                setShowOccasionInput(false);
              }}
            />
            <TouchableOpacity
              style={styles.choiceAddButton}
              onPress={async () => {
                if (newOccasion.trim()) await addOccasion(newOccasion.trim());
                setSelectedOccasions((previous) => newOccasion.trim() ? [...previous, newOccasion.trim()] : previous);
                setNewOccasion('');
                setShowOccasionInput(false);
              }}
            >
              <Text style={styles.choiceAddButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}

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
          {savedColors.map((choice) => {
            const isSelected = selectedColor === choice.label;
            const hex = choice.color_hex || colorHexForLabel(choice.label);
            return (
              <TouchableOpacity
                key={choice.id}
                style={styles.colorItem}
                onPress={() => setSelectedColor(choice.label)}
                activeOpacity={0.8}
              >
                <View style={[styles.colorSwatch, { backgroundColor: hex }, isSelected && styles.colorSwatchSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                </View>
                <Text style={[styles.colorLabel, isSelected && styles.colorLabelActive]} numberOfLines={1}>
                  {choice.label}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={styles.colorItem}
            onPress={() => {
              setNewColorChoice('');
              setPickerColorHex('#D4AF37');
              setShowColorPicker(true);
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.colorSwatch, styles.addColorSwatch]}>
              <Ionicons name="add" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.colorLabel}>Add color</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={showColorPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowColorPicker(false)}
        >
          <View style={styles.colorPickerOverlay}>
            <KeyboardAvoidingView
              style={styles.colorPickerKeyboard}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <View style={styles.colorPickerSheet}>
                <View style={styles.colorPickerHeader}>
                  <Text style={styles.colorPickerTitle}>Pick a color</Text>
                  <TouchableOpacity onPress={() => setShowColorPicker(false)}>
                    <Ionicons name="close" size={24} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.colorPickerHint}>1. Tap a shade first</Text>
                <View style={styles.pickerSwatchGrid}>
                  {COLOR_PICKER_SWATCHES.map((hex) => (
                    <TouchableOpacity
                      key={hex}
                      onPress={() => setPickerColorHex(hex)}
                      style={[
                        styles.pickerSwatch,
                        { backgroundColor: hex },
                        pickerColorHex === hex && styles.pickerSwatchSelected,
                      ]}
                      activeOpacity={0.8}
                    >
                      {pickerColorHex === hex && <Ionicons name="checkmark" size={16} color={Colors.white} />}
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.colorPreviewRow}>
                  <View style={[styles.colorPreview, { backgroundColor: pickerColorHex }]} />
                  <TextInput
                    style={styles.colorNameInput}
                    placeholder="2. Name it (e.g. Camel)"
                    placeholderTextColor={Colors.mediumGray}
                    value={newColorChoice}
                    onChangeText={setNewColorChoice}
                    returnKeyType="done"
                    onSubmitEditing={savePickedColor}
                  />
                </View>

                <TouchableOpacity style={styles.savePickedColorButton} onPress={savePickedColor}>
                  <Text style={styles.savePickedColorButtonText}>Save color</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

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
      if (!imageUrl) {
        throw new Error('The photo could not be uploaded. The item was not saved.');
      }
      // Save item to database via context
      const savedItem = await addItem({
        name: itemData.name,
        category: itemData.category,
        brand: itemData.brand || undefined,
        color: itemData.color || undefined,
        season: itemData.season || undefined,
        occasions: itemData.occasions,
        price: itemData.price ? parseFloat(itemData.price) : undefined,
        image: imageUrl,
        image_url: imageUrl,
        tags: itemData.tags,
        isFavorite: false,
      });
      if (!savedItem) {
        throw new Error('The item could not be saved.');
      }
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setImageUri(null);
        setStep(1);
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
    // Keep the photo-source buttons clear of the app's floating tab bar.
    paddingBottom: 92,
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
  customFieldInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  addChoicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  addChoicePillText: {
    color: Colors.primary,
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
  },
  choiceInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  choiceInput: {
    flex: 1,
    marginBottom: 0,
  },
  choiceAddButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceAddButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
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
  addColorSwatch: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
  },
  colorPickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  colorPickerKeyboard: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  colorPickerSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: 42,
  },
  colorPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  colorPickerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  colorPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  colorPreview: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  colorNameInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.sm,
  },
  colorPickerHint: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  pickerSwatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  pickerSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  pickerSwatchSelected: {
    borderWidth: 3,
    borderColor: Colors.black,
  },
  savePickedColorButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  savePickedColorButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: '800',
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
