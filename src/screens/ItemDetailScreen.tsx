import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
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
import { supabase } from '../lib/supabase';
import { Occasion, useOutfit } from '../context/OutfitContext';

const CLOTHING_CATEGORIES = [
  'Coats', 'Jackets', 'Cardigans', 'Sweaters', 'Tops', 'Blouses',
  'T shirts', 'Dresses', 'Pants', 'Skirts', 'Shorts', 'Shoes', 'Boots', 'Sneakers', 'Bags', 'Jewelry', 'Accessories', 'Activewear',
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

type SavedChoice = {
  id: string;
  choice_type: 'color';
  label: string;
  color_hex: string | null;
};

function fallbackColorHex(label: string): string {
  const value = label.toLowerCase();
  if (value.includes('silver')) return '#C0C0C0';
  if (value.includes('gold')) return '#D4AF37';
  if (value.includes('burgundy') || value.includes('wine')) return '#800020';
  if (value.includes('green')) return '#2E7D32';
  return '#8E8E93';
}

export default function ItemDetailScreen() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const isNarrow = width < 480;
  const route = useRoute<any>();
  const item: ClothingItem = route.params?.item;

  const { removeItem, updateItem } = useCloset();
  const { occasions, addOccasion, renameOccasion, deleteOccasion } = useOutfit();
  const [isFavorite, setIsFavorite] = useState(item?.isFavorite || false);
  const [saved, setSaved] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCategoryAlert, setShowCategoryAlert] = useState(false);

  // Editable fields
  const [name, setName] = useState(item?.name || '');
  const [brand, setBrand] = useState(item?.brand || '');
  const [price, setPrice] = useState(item?.price ? String(item.price) : '');
  const [caption, setCaption] = useState(item?.notes || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    item?.category ? [item.category] : []
  );

  // Style tags — preset + custom
  const [selectedStyleTags, setSelectedStyleTags] = useState<string[]>(item?.tags || []);
  const [customStyleTags, setCustomStyleTags] = useState<string[]>([]);
  const [showStyleInput, setShowStyleInput] = useState(false);
  const [newStyleTag, setNewStyleTag] = useState('');

  // Saved seasons, occasions, and custom colors
  const [selectedSeason, setSelectedSeason] = useState(item?.season || '');
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>(item?.occasions || []);
  const [showOccasionInput, setShowOccasionInput] = useState(false);
  const [newOccasion, setNewOccasion] = useState('');
  const [showOccasionManager, setShowOccasionManager] = useState(false);
  const [editingOccasion, setEditingOccasion] = useState<Occasion | null>(null);
  const [occasionLabelDraft, setOccasionLabelDraft] = useState('');
  const [selectedColor, setSelectedColor] = useState(item?.color || '');
  const [savedChoices, setSavedChoices] = useState<SavedChoice[]>([]);
  const [showChoiceManager, setShowChoiceManager] = useState(false);
  const [editingChoice, setEditingChoice] = useState<SavedChoice | null>(null);
  const [choiceLabelDraft, setChoiceLabelDraft] = useState('');
  const editorScrollRef = useRef<ScrollView>(null);
  const styleSectionY = useRef(0);
  const seasonSectionY = useRef(0);

  const bringFieldAboveKeyboard = (sectionY: number) => {
    setTimeout(() => {
      editorScrollRef.current?.scrollTo({ y: Math.max(0, sectionY - 72), animated: true });
    }, 280);
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
        console.warn('Could not load item editor choices:', error.message);
        return;
      }
      if (active) setSavedChoices((data ?? []) as SavedChoice[]);
    }

    loadSavedChoices();
    return () => { active = false; };
  }, []);

  if (!item) return null;

  const allStyleTags = Array.from(new Set([...DEFAULT_STYLE_TAGS, ...selectedStyleTags, ...customStyleTags]));
  const savedColors = savedChoices.filter((choice) => choice.choice_type === 'color');
  const allSeasons = DEFAULT_SEASONS;
  const currentCustomColor = !COLORS_LIST.some((color) => color.name === selectedColor) && selectedColor
    ? { id: 'current-item-color', choice_type: 'color' as const, label: selectedColor, color_hex: null }
    : null;
  const allCustomColors = currentCustomColor && !savedColors.some((choice) => choice.label === currentCustomColor.label)
    ? [...savedColors, currentCustomColor]
    : savedColors;

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

  const addCustomStyleTag = () => {
    const tag = newStyleTag.trim();
    if (!tag) return;
    if (!customStyleTags.includes(tag)) setCustomStyleTags((p) => [...p, tag]);
    setSelectedStyleTags((p) => p.includes(tag) ? p : [...p, tag]);
    setNewStyleTag('');
    setShowStyleInput(false);
  };

  const addSharedOccasion = async () => {
    const label = newOccasion.trim();
    if (!label) return;
    const existing = occasions.find((occasion) => occasion.name.toLowerCase() === label.toLowerCase());
    try {
      if (!existing) await addOccasion(label);
      setSelectedOccasions((previous) => previous.includes(existing?.name ?? label) ? previous : [...previous, existing?.name ?? label]);
      setNewOccasion('');
      setShowOccasionInput(false);
    } catch {
      Alert.alert('Could not save occasion', 'Please choose a different name and try again.');
    }
  };

  const saveOccasionRename = async () => {
    if (!editingOccasion || !occasionLabelDraft.trim()) return;
    const nextName = occasionLabelDraft.trim();
    try {
      await renameOccasion(editingOccasion.id, nextName);
      setSelectedOccasions((previous) => previous.map((name) => name === editingOccasion.name ? nextName : name));
      setEditingOccasion(null);
      setOccasionLabelDraft('');
    } catch {
      Alert.alert('Could not rename occasion', 'Please choose a different name and try again.');
    }
  };

  const removeSharedOccasion = (occasion: Occasion) => {
    Alert.alert(
      `Delete ${occasion.name}?`,
      'This removes the reusable occasion. It does not delete any clothing items or outfits.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOccasion(occasion.id);
              setSelectedOccasions((previous) => previous.filter((name) => name !== occasion.name));
              if (editingOccasion?.id === occasion.id) setEditingOccasion(null);
            } catch {
              Alert.alert('Could not delete occasion', 'Please try again.');
            }
          },
        },
      ],
    );
  };

  const saveChoiceRename = async () => {
    if (!editingChoice || !choiceLabelDraft.trim()) return;
    const label = choiceLabelDraft.trim();
    const { data, error } = await supabase
      .from('wardrobe_choices')
      .update({ label })
      .eq('id', editingChoice.id)
      .select('id, choice_type, label, color_hex')
      .single();

    if (error) {
      Alert.alert('Could not rename choice', 'Please choose a different name and try again.');
      return;
    }

    const updated = data as SavedChoice;
    setSavedChoices((previous) => previous.map((choice) => choice.id === updated.id ? updated : choice));
    if (selectedColor === editingChoice.label) setSelectedColor(updated.label);
    setEditingChoice(null);
    setChoiceLabelDraft('');
  };

  const deleteSavedChoice = (choice: SavedChoice) => {
    Alert.alert(
      `Delete ${choice.label}?`,
      'This removes the reusable choice. It does not delete any clothing items.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('wardrobe_choices').delete().eq('id', choice.id);
            if (error) {
              Alert.alert('Could not delete choice', 'Please try again.');
              return;
            }
            setSavedChoices((previous) => previous.filter((savedChoice) => savedChoice.id !== choice.id));
            if (selectedColor === choice.label) setSelectedColor('');
            if (editingChoice?.id === choice.id) setEditingChoice(null);
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    setShowDeleteModal(false);
    removeItem(item.id);
    navigation.goBack();
  };

  const handleSave = async () => {
    if (selectedCategories.length === 0) {
      setShowCategoryAlert(true);
      return;
    }

    const updatedItem = await updateItem(item.id, {
      name: name.trim() || item.name,
      category: selectedCategories[0],
      brand: brand.trim() || undefined,
      price: price.trim() ? Number(price) : undefined,
      notes: caption.trim() || undefined,
      tags: selectedStyleTags,
      season: selectedSeason || undefined,
      occasions: selectedOccasions,
      color: selectedColor || undefined,
      isFavorite,
    });

    if (!updatedItem) {
      Alert.alert('Could not save changes', 'Please try again.');
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
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
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

      <ScrollView
        ref={editorScrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >

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
        <View
          style={styles.tagGrid}
          onLayout={(event) => { styleSectionY.current = event.nativeEvent.layout.y; }}
        >
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
                onFocus={() => bringFieldAboveKeyboard(styleSectionY.current)}
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
        <Text style={styles.sectionSub}>Choose the time of year this piece works best.</Text>
        <View style={styles.seasonRow} onLayout={(event) => { seasonSectionY.current = event.nativeEvent.layout.y; }}>
          {allSeasons.map((season) => (
            <TouchableOpacity
              key={season}
              onPress={() => setSelectedSeason(season)}
              style={[styles.seasonPill, selectedSeason === season && styles.seasonPillActive]}
            >
              <Text style={[styles.seasonPillText, selectedSeason === season && styles.seasonPillTextActive]}>{season}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Shared occasions */}
        <Text style={styles.sectionLabel}>Occasions</Text>
        <Text style={styles.sectionSub}>Optional — select every occasion this item works for.</Text>
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
          <TouchableOpacity style={styles.addPill} onPress={() => setShowOccasionInput(true)}>
            <Ionicons name="add" size={14} color={Colors.primary} />
            <Text style={styles.addPillText}>Add</Text>
          </TouchableOpacity>
        </View>
        {showOccasionInput && (
          <View style={styles.inlineInputRow}>
            <TextInput
              style={styles.inlineInput}
              value={newOccasion}
              onChangeText={setNewOccasion}
              placeholder="e.g. Vacation, Wedding, Work"
              placeholderTextColor={Colors.mediumGray}
              autoFocus
              onFocus={() => bringFieldAboveKeyboard(seasonSectionY.current)}
              onSubmitEditing={addSharedOccasion}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.inlineAddBtn} onPress={addSharedOccasion}>
              <Ionicons name="checkmark" size={16} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.inlineCancelBtn} onPress={() => { setShowOccasionInput(false); setNewOccasion(''); }}>
              <Ionicons name="close" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity style={styles.manageChoicesButton} onPress={() => setShowOccasionManager(true)}>
          <Ionicons name="create-outline" size={16} color={Colors.primary} />
          <Text style={styles.manageChoicesButtonText}>Edit shared occasions</Text>
        </TouchableOpacity>

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
          {allCustomColors.map((choice) => {
            const isSelected = selectedColor === choice.label;
            const hex = choice.color_hex || fallbackColorHex(choice.label);
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
        </View>
        <TouchableOpacity style={styles.manageChoicesButton} onPress={() => setShowChoiceManager(true)}>
          <Ionicons name="create-outline" size={16} color={Colors.primary} />
          <Text style={styles.manageChoicesButtonText}>Edit saved colors</Text>
        </TouchableOpacity>

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
          <Ionicons name="trash-outline" size={16} color={'#D93025'} />
          <Text style={styles.deleteButtonText}>Delete Item</Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Saved Choice Manager */}
      <Modal
        visible={showChoiceManager}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowChoiceManager(false);
          setEditingChoice(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.choiceManagerKeyboard}
          >
            <View style={styles.choiceManagerBox}>
              <View style={styles.choiceManagerHeader}>
                <Text style={styles.choiceManagerTitle}>{editingChoice ? `Edit ${editingChoice.label}` : 'Saved colors'}</Text>
                <TouchableOpacity onPress={() => { setShowChoiceManager(false); setEditingChoice(null); }}>
                  <Ionicons name="close" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {editingChoice ? (
                <>
                  <Text style={styles.choiceManagerHint}>Correct the spelling or give this saved choice a clearer name.</Text>
                  <TextInput
                    style={styles.choiceManagerInput}
                    value={choiceLabelDraft}
                    onChangeText={setChoiceLabelDraft}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={saveChoiceRename}
                  />
                  <View style={styles.choiceManagerButtons}>
                    <TouchableOpacity style={styles.choiceManagerCancelButton} onPress={() => { setEditingChoice(null); setChoiceLabelDraft(''); }}>
                      <Text style={styles.choiceManagerCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.choiceManagerSaveButton} onPress={saveChoiceRename}>
                      <Text style={styles.choiceManagerSaveText}>Save name</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.choiceManagerHint}>Tap the pencil to rename a color, or the trash icon to remove it from future selections.</Text>
                  <ScrollView style={styles.choiceManagerList} contentContainerStyle={styles.choiceManagerListContent}>
                    {savedChoices.length === 0 ? (
                      <Text style={styles.choiceManagerEmpty}>No saved custom choices yet.</Text>
                    ) : savedChoices.map((choice) => (
                      <View key={choice.id} style={styles.choiceManagerRow}>
                        <View style={styles.choiceManagerChoiceInfo}>
                          <View style={[styles.choiceManagerSwatch, { backgroundColor: choice.color_hex || fallbackColorHex(choice.label) }]} />
                          <View>
                            <Text style={styles.choiceManagerLabel}>{choice.label}</Text>
                            <Text style={styles.choiceManagerType}>Color</Text>
                          </View>
                        </View>
                        <View style={styles.choiceManagerActions}>
                          <TouchableOpacity
                            style={styles.choiceManagerIconButton}
                            onPress={() => { setEditingChoice(choice); setChoiceLabelDraft(choice.label); }}
                          >
                            <Ionicons name="pencil-outline" size={17} color={Colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.choiceManagerIconButton}
                            onPress={() => deleteSavedChoice(choice)}
                          >
                            <Ionicons name="trash-outline" size={17} color="#D93025" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Shared Occasion Manager */}
      <Modal
        visible={showOccasionManager}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowOccasionManager(false); setEditingOccasion(null); }}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.choiceManagerKeyboard}
          >
            <View style={styles.choiceManagerBox}>
              <View style={styles.choiceManagerHeader}>
                <Text style={styles.choiceManagerTitle}>{editingOccasion ? `Edit ${editingOccasion.name}` : 'Shared occasions'}</Text>
                <TouchableOpacity onPress={() => { setShowOccasionManager(false); setEditingOccasion(null); }}>
                  <Ionicons name="close" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {editingOccasion ? (
                <>
                  <Text style={styles.choiceManagerHint}>Correct the spelling or give this occasion a clearer name. It will update everywhere you use occasions.</Text>
                  <TextInput
                    style={styles.choiceManagerInput}
                    value={occasionLabelDraft}
                    onChangeText={setOccasionLabelDraft}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={saveOccasionRename}
                  />
                  <View style={styles.choiceManagerButtons}>
                    <TouchableOpacity style={styles.choiceManagerCancelButton} onPress={() => { setEditingOccasion(null); setOccasionLabelDraft(''); }}>
                      <Text style={styles.choiceManagerCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.choiceManagerSaveButton} onPress={saveOccasionRename}>
                      <Text style={styles.choiceManagerSaveText}>Save name</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.choiceManagerHint}>These are the same occasions used by items and outfits. Tap the pencil to rename one or the trash icon to remove it from future selections.</Text>
                  <ScrollView style={styles.choiceManagerList} contentContainerStyle={styles.choiceManagerListContent}>
                    {occasions.length === 0 ? (
                      <Text style={styles.choiceManagerEmpty}>No shared occasions yet.</Text>
                    ) : occasions.map((occasion) => (
                      <View key={occasion.id} style={styles.choiceManagerRow}>
                        <View style={styles.choiceManagerChoiceInfo}>
                          <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                          <View>
                            <Text style={styles.choiceManagerLabel}>{occasion.name}</Text>
                            <Text style={styles.choiceManagerType}>Shared occasion</Text>
                          </View>
                        </View>
                        <View style={styles.choiceManagerActions}>
                          <TouchableOpacity
                            style={styles.choiceManagerIconButton}
                            onPress={() => { setEditingOccasion(occasion); setOccasionLabelDraft(occasion.name); }}
                          >
                            <Ionicons name="pencil-outline" size={17} color={Colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.choiceManagerIconButton} onPress={() => removeSharedOccasion(occasion)}>
                            <Ionicons name="trash-outline" size={17} color="#D93025" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

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
  keyboardContainer: { flex: 1 },
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
  manageChoicesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.base,
  },
  manageChoicesButtonText: {
    color: Colors.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
  },
  choiceManagerKeyboard: {
    width: '100%',
    maxWidth: 410,
  },
  choiceManagerBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    maxHeight: '76%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  choiceManagerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  choiceManagerTitle: {
    flex: 1,
    fontSize: Typography.fontSize.md,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginRight: Spacing.sm,
  },
  choiceManagerHint: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 19,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
  },
  choiceManagerList: { maxHeight: 360 },
  choiceManagerListContent: { gap: Spacing.sm },
  choiceManagerEmpty: {
    textAlign: 'center',
    color: Colors.textSecondary,
    paddingVertical: Spacing.lg,
  },
  choiceManagerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  choiceManagerChoiceInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  choiceManagerSwatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  choiceManagerLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  choiceManagerType: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  choiceManagerActions: { flexDirection: 'row', gap: Spacing.xs },
  choiceManagerIconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: Colors.background,
  },
  choiceManagerInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.base,
    marginBottom: Spacing.base,
  },
  choiceManagerButtons: { flexDirection: 'row', gap: Spacing.sm },
  choiceManagerCancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.pill,
  },
  choiceManagerCancelText: { color: Colors.textPrimary, fontWeight: '700' },
  choiceManagerSaveButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
  },
  choiceManagerSaveText: { color: Colors.white, fontWeight: '800' },
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
