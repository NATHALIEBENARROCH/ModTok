import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { ClothingItem, useCloset } from '../context/ClosetContext';
import { Outfit, useOutfit } from '../context/OutfitContext';
import { uploadImageToSupabase } from '../lib/uploadImage';

const PAGE_WIDTH = Dimensions.get('window').width - Spacing.base * 2;
const GRID_GAP = Spacing.sm;
const GRID_CELL = Math.floor((PAGE_WIDTH - GRID_GAP * 2) / 3);

type EditorRow = { key: string; itemId: string };
type PickerState = { rowKey: string | null; category: string } | null;

/** One piece of the outfit. Swipe sideways to swap it for another piece of the same category. */
function OutfitPieceRow({
  itemId, candidates, onChange, onRemove, onSeeAll,
}: {
  itemId: string;
  candidates: ClothingItem[];
  onChange: (itemId: string) => void;
  onRemove: () => void;
  onSeeAll: () => void;
}) {
  const listRef = useRef<FlatList<ClothingItem>>(null);
  const index = Math.max(0, candidates.findIndex((item) => item.id === itemId));
  const initialIndex = useRef(index).current;
  const current = candidates[index];

  const goTo = (next: number) => {
    if (next < 0 || next >= candidates.length) return;
    listRef.current?.scrollToOffset({ offset: next * PAGE_WIDTH, animated: true });
    onChange(candidates[next].id);
  };

  return (
    <View style={styles.pieceCard}>
      <View style={styles.pieceHeader}>
        <Text style={styles.pieceCategory} numberOfLines={1}>{current?.category ?? 'Item'}</Text>
        <Text style={styles.pieceCounter}>{index + 1} of {candidates.length}</Text>
        <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.pieceSeeAll}>See all</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRemove} style={styles.pieceRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View>
        <FlatList
          ref={listRef}
          data={candidates}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: PAGE_WIDTH, offset: PAGE_WIDTH * i, index: i })}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          onMomentumScrollEnd={(event) => {
            const next = Math.round(event.nativeEvent.contentOffset.x / PAGE_WIDTH);
            const target = candidates[Math.min(Math.max(next, 0), candidates.length - 1)];
            if (target && target.id !== itemId) onChange(target.id);
          }}
          renderItem={({ item }) => (
            <View style={styles.piecePage}>
              <Image source={{ uri: item.image_url ?? item.image }} style={styles.pieceImage} resizeMode="contain" />
            </View>
          )}
        />
        {index > 0 && (
          <TouchableOpacity style={[styles.pieceArrow, styles.pieceArrowLeft]} onPress={() => goTo(index - 1)}>
            <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}
        {index < candidates.length - 1 && (
          <TouchableOpacity style={[styles.pieceArrow, styles.pieceArrowRight]} onPress={() => goTo(index + 1)}>
            <Ionicons name="chevron-forward" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.pieceName} numberOfLines={1}>
        {current?.name}{current?.color ? ` · ${current.color}` : ''}
      </Text>
    </View>
  );
}

export default function OutfitDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { items } = useCloset();
  const { outfits, occasions, updateOutfit } = useOutfit();
  const outfitId: string | undefined = route.params?.outfitId ?? route.params?.outfit?.id;
  const outfit: Outfit | undefined = outfits.find((saved) => saved.id === outfitId) ?? route.params?.outfit;

  const [editorVisible, setEditorVisible] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [occasionDraft, setOccasionDraft] = useState('');
  const [editorRows, setEditorRows] = useState<EditorRow[]>([]);
  const [picker, setPicker] = useState<PickerState>(null);
  const rowKeyCounter = useRef(0);
  const newRowKey = () => `row-${rowKeyCounter.current++}`;
  const selectedItemIds = Array.from(new Set(editorRows.map((row) => row.itemId)));
  const [lookPhotoUri, setLookPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedConfirmation, setSavedConfirmation] = useState(false);

  useEffect(() => {
    if (!outfit) return;
    setNameDraft(outfit.name);
    setOccasionDraft(outfit.occasion_id ?? '');
    setLookPhotoUri(outfit.look_image_url ?? null);
  }, [outfit?.id, outfit?.name, outfit?.occasion_id, outfit?.item_ids, outfit?.look_image_url]);

  const outfitItems = useMemo(() => {
    if (!outfit) return [];
    return outfit.item_ids
      .map((itemId) => items.find((item) => item.id === itemId))
      .filter((item): item is ClothingItem => Boolean(item));
  }, [items, outfit]);

  const itemsByCategory = useMemo(() => {
    const groups: Record<string, ClothingItem[]> = {};
    items.forEach((item) => {
      (groups[item.category] = groups[item.category] ?? []).push(item);
    });
    return groups;
  }, [items]);
  const categories = useMemo(() => Object.keys(itemsByCategory), [itemsByCategory]);

  if (!outfit) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.black} />
          </TouchableOpacity>
          <Text style={styles.title}>Outfit</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="bookmark-outline" size={48} color={Colors.lightGray} />
          <Text style={styles.emptyTitle}>This outfit is no longer available</Text>
          <Text style={styles.emptyText}>Return to Save to choose another outfit.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedOccasion = occasions.find((occasion) => occasion.id === outfit.occasion_id);

  const openEditor = () => {
    setNameDraft(outfit.name);
    setOccasionDraft(outfit.occasion_id ?? '');
    setEditorRows(
      (outfit.item_ids ?? [])
        .filter((itemId) => items.some((item) => item.id === itemId))
        .map((itemId) => ({ key: newRowKey(), itemId })),
    );
    setPicker(null);
    setLookPhotoUri(outfit.look_image_url ?? null);
    setEditorVisible(true);
  };

  const chooseLookPhoto = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is needed to add a photo wearing this look.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets.length > 0) setLookPhotoUri(result.assets[0].uri);
  };

  const swapRow = (rowKey: string, itemId: string) => {
    setEditorRows((current) => current.map((row) => (row.key === rowKey ? { ...row, itemId } : row)));
  };

  const removeRow = (rowKey: string) => {
    setEditorRows((current) => current.filter((row) => row.key !== rowKey));
  };

  const pickFromGrid = (itemId: string) => {
    if (!picker) return;
    const rowKey = picker.rowKey;
    setEditorRows((current) =>
      rowKey
        // A new key makes the row redraw already positioned on the chosen piece.
        ? current.map((row) => (row.key === rowKey ? { key: newRowKey(), itemId } : row))
        : [...current, { key: newRowKey(), itemId }],
    );
    setPicker(null);
  };

  const saveChanges = async () => {
    const nextName = nameDraft.trim();
    if (!nextName) {
      Alert.alert('Name required', 'Please give this outfit a name.');
      return;
    }
    if (selectedItemIds.length === 0) {
      Alert.alert('Add an item', 'Choose at least one item for this outfit.');
      return;
    }

    setSaving(true);
    try {
      let lookImageUrl = lookPhotoUri;
      if (lookPhotoUri && !lookPhotoUri.startsWith('http')) {
        lookImageUrl = await uploadImageToSupabase(lookPhotoUri, 'worn-look');
        if (!lookImageUrl) {
          Alert.alert('Could not upload photo', 'Please choose the photo again and retry.');
          return;
        }
      }
      await updateOutfit(outfit.id, {
        name: nextName,
        occasion_id: occasionDraft || null,
        item_ids: selectedItemIds,
        look_image_url: lookImageUrl,
      });
      setEditorVisible(false);
      setSavedConfirmation(true);
      setTimeout(() => setSavedConfirmation(false), 2500);
    } catch (error) {
      Alert.alert('Could not update outfit', 'Run the saved-outfit repair in Supabase, then try again.');
      console.error('update outfit error:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{outfit.name}</Text>
        <TouchableOpacity style={styles.headerEditButton} onPress={openEditor}>
          <Ionicons name="create-outline" size={21} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {savedConfirmation && (
        <View style={styles.savedConfirmation}>
          <Ionicons name="checkmark-circle" size={17} color={Colors.white} />
          <Text style={styles.savedConfirmationText}>Outfit updated</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Ionicons name="bookmark" size={22} color={Colors.primary} />
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{outfit.name}</Text>
            <Text style={styles.heroSubtitle}>
              {outfitItems.length} item{outfitItems.length === 1 ? '' : 's'} in this look
            </Text>
          </View>
        </View>

        {outfit.look_image_url && (
          <View style={styles.lookPhotoHero}>
            <Image source={{ uri: outfit.look_image_url }} style={styles.lookPhotoHeroImage} resizeMode="contain" />
            <View style={styles.lookPhotoLabel}><Ionicons name="person-outline" size={14} color={Colors.white} /><Text style={styles.lookPhotoLabelText}>Wearing this look</Text></View>
          </View>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaTag}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textPrimary} />
            <Text style={styles.metaText}>{selectedOccasion?.name ?? 'No occasion selected'}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your outfit</Text>
          <Text style={styles.sectionCount}>{outfitItems.length} selected</Text>
        </View>

        {outfitItems.length > 0 ? outfitItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.itemCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ItemDetail', { item })}
          >
            <Image
              source={{ uri: item.image_url ?? item.image }}
              style={styles.itemImage}
              resizeMode="contain"
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemCategory}>{item.category}</Text>
              <Text style={styles.itemName}>{item.name}</Text>
              {!!item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )) : (
          <View style={styles.noItemsCard}>
            <Ionicons name="shirt-outline" size={30} color={Colors.lightGray} />
            <Text style={styles.emptyText}>The original items are no longer in your closet.</Text>
          </View>
        )}

        <TouchableOpacity style={styles.editButton} onPress={openEditor}>
          <Ionicons name="create-outline" size={18} color={Colors.white} />
          <Text style={styles.editButtonText}>Edit Outfit</Text>
        </TouchableOpacity>
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={editorVisible} animationType="slide" onRequestClose={() => setEditorVisible(false)}>
        <SafeAreaView style={styles.editorSafeArea}>
          <KeyboardAvoidingView
            style={styles.editorKeyboard}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.editorHeader}>
              <Text style={styles.editorTitle}>Edit Outfit</Text>
            </View>

            <ScrollView
              contentContainerStyle={styles.editorContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.fieldLabel}>OUTFIT NAME</Text>
              <TextInput
                style={styles.nameInput}
                value={nameDraft}
                onChangeText={setNameDraft}
                placeholder="Name this outfit"
                placeholderTextColor={Colors.mediumGray}
                returnKeyType="done"
              />

              <Text style={styles.fieldLabel}>PHOTO WEARING THIS LOOK <Text style={styles.optionalLabel}>(OPTIONAL)</Text></Text>
              <TouchableOpacity style={styles.lookPhotoEditorCard} onPress={chooseLookPhoto} activeOpacity={0.82}>
                {lookPhotoUri ? <Image source={{ uri: lookPhotoUri }} style={styles.lookPhotoEditorPreview} resizeMode="cover" /> : <View style={styles.lookPhotoEditorIcon}><Ionicons name="person-add-outline" size={22} color={Colors.primary} /></View>}
                <View style={styles.lookPhotoEditorCopy}>
                  <Text style={styles.lookPhotoEditorTitle}>{lookPhotoUri ? 'Photo ready to save' : 'Add a photo wearing this look'}</Text>
                  <Text style={styles.lookPhotoEditorText}>{lookPhotoUri ? 'Tap to choose another image' : 'Use it for Saved, Profile, and Share.'}</Text>
                </View>
                {lookPhotoUri ? <TouchableOpacity style={styles.removeLookPhotoBtn} onPress={() => setLookPhotoUri(null)}><Ionicons name="close-circle" size={22} color={Colors.textSecondary} /></TouchableOpacity> : <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />}
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>OCCASION <Text style={styles.optionalLabel}>(OPTIONAL)</Text></Text>
              <TouchableOpacity
                style={[styles.occasionChip, occasionDraft === '' && styles.occasionChipActive]}
                onPress={() => setOccasionDraft('')}
              >
                <Text style={[styles.occasionChipText, occasionDraft === '' && styles.occasionChipTextActive]}>No occasion</Text>
              </TouchableOpacity>
              <View style={styles.occasionList}>
                {occasions.map((occasion) => {
                  const active = occasionDraft === occasion.id;
                  return (
                    <TouchableOpacity
                      key={occasion.id}
                      style={[styles.occasionChip, active && styles.occasionChipActive]}
                      onPress={() => setOccasionDraft(occasion.id)}
                    >
                      <Text style={[styles.occasionChipText, active && styles.occasionChipTextActive]}>{occasion.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.itemsEditorHeader}>
                <Text style={styles.fieldLabel}>ITEMS</Text>
                <Text style={styles.itemsSelectionCount}>{selectedItemIds.length} selected</Text>
              </View>
              <Text style={styles.editorHint}>Swipe a piece left or right to swap it for another from the same category.</Text>

              {editorRows.map((row) => {
                const rowItem = items.find((item) => item.id === row.itemId);
                if (!rowItem) return null;
                return (
                  <OutfitPieceRow
                    key={row.key}
                    itemId={row.itemId}
                    candidates={itemsByCategory[rowItem.category] ?? [rowItem]}
                    onChange={(itemId) => swapRow(row.key, itemId)}
                    onRemove={() => removeRow(row.key)}
                    onSeeAll={() => setPicker({ rowKey: row.key, category: rowItem.category })}
                  />
                );
              })}

              {categories.length > 0 && (
                <TouchableOpacity
                  style={styles.addPieceButton}
                  onPress={() => setPicker({ rowKey: null, category: categories[0] })}
                >
                  <Ionicons name="add" size={20} color={Colors.primary} />
                  <Text style={styles.addPieceText}>Add a piece</Text>
                </TouchableOpacity>
              )}

              {items.length === 0 && (
                <View style={styles.noItemsCard}>
                  <Text style={styles.emptyText}>Add clothing to your closet before editing an outfit.</Text>
                </View>
              )}
              <View style={{ height: Spacing.md }} />
            </ScrollView>

            <View style={styles.editorFooter}>
              <TouchableOpacity
                style={styles.footerCancelButton}
                onPress={() => setEditorVisible(false)}
                disabled={saving}
              >
                <Ionicons name="close" size={18} color={Colors.textPrimary} />
                <Text style={styles.footerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerSaveButton, saving && styles.footerSaveButtonDisabled]}
                onPress={saveChanges}
                disabled={saving}
              >
                <Ionicons name="checkmark" size={19} color={Colors.white} />
                <Text style={styles.footerSaveText}>{saving ? 'Saving...' : 'Save changes'}</Text>
              </TouchableOpacity>
            </View>

            {picker && (
              <View style={styles.pickerOverlay}>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={() => setPicker(null)} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={Colors.black} />
                  </TouchableOpacity>
                  <Text style={styles.title} numberOfLines={1}>
                    {picker.rowKey ? picker.category : 'Add a piece'}
                  </Text>
                  <View style={styles.headerSpacer} />
                </View>
                {!picker.rowKey && (
                  <View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerChips}>
                      {categories.map((category) => {
                        const active = picker.category === category;
                        return (
                          <TouchableOpacity
                            key={category}
                            style={[styles.occasionChip, styles.pickerChip, active && styles.occasionChipActive]}
                            onPress={() => setPicker({ rowKey: null, category })}
                          >
                            <Text style={[styles.occasionChipText, active && styles.occasionChipTextActive]}>{category}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
                <FlatList
                  key={picker.category}
                  data={itemsByCategory[picker.category] ?? []}
                  keyExtractor={(item) => item.id}
                  numColumns={3}
                  columnWrapperStyle={styles.pickerGridRow}
                  contentContainerStyle={styles.pickerGrid}
                  renderItem={({ item }) => {
                    const used = selectedItemIds.includes(item.id);
                    return (
                      <TouchableOpacity
                        style={[styles.pickerCell, used && styles.pickerCellUsed]}
                        onPress={() => pickFromGrid(item.id)}
                        disabled={used}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: item.image_url ?? item.image }} style={styles.pickerCellImage} resizeMode="contain" />
                        <Text style={styles.pickerCellName} numberOfLines={1}>{item.name}</Text>
                        {used && (
                          <View style={styles.pickerCellCheck}>
                            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  editorSafeArea: { flex: 1, backgroundColor: Colors.background },
  editorKeyboard: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm, paddingBottom: Spacing.sm, borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder, backgroundColor: Colors.white,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  headerSpacer: { width: 40 },
  headerEditButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: Spacing.base, paddingTop: Spacing.base },
  savedConfirmation: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    backgroundColor: Colors.green, paddingVertical: Spacing.sm,
  },
  savedConfirmationText: { color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  heroCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder,
    padding: Spacing.base, gap: Spacing.sm,
  },
  heroCopy: { flex: 1 },
  lookPhotoHero: { height: 440, marginTop: Spacing.md, borderRadius: BorderRadius.lg, overflow: 'hidden', backgroundColor: Colors.background, position: 'relative' },
  lookPhotoHeroImage: { width: '100%', height: '100%' },
  lookPhotoLabel: { position: 'absolute', left: Spacing.sm, bottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.sm, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.68)', borderRadius: BorderRadius.pill },
  lookPhotoLabelText: { color: Colors.white, fontSize: Typography.fontSize.xs, fontWeight: '800' },
  heroTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  heroSubtitle: { marginTop: 3, fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  metaRow: { flexDirection: 'row', marginTop: Spacing.md, marginBottom: Spacing.xl },
  metaTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: 7,
  },
  metaText: { fontSize: Typography.fontSize.xs, fontWeight: '600', color: Colors.textPrimary },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: Typography.fontSize.base, fontWeight: '700', color: Colors.textPrimary },
  sectionCount: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder,
    padding: Spacing.sm, gap: Spacing.md, marginBottom: Spacing.sm,
  },
  itemImage: { width: 70, height: 82, backgroundColor: Colors.background, borderRadius: BorderRadius.md },
  itemInfo: { flex: 1 },
  itemCategory: { color: Colors.primary, fontSize: Typography.fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  itemName: { marginTop: 3, color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700' },
  itemBrand: { marginTop: 2, color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  noItemsCard: { alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.cardBorder },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  emptyTitle: { fontSize: Typography.fontSize.base, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  emptyText: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  editButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.lg, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md },
  editButtonText: { color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  editorHeader: {
    alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, backgroundColor: Colors.white,
  },
  editorTitle: { fontSize: Typography.fontSize.md, fontWeight: '700', color: Colors.textPrimary },
  editorFooter: {
    flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm, paddingBottom: Spacing.base, borderTopWidth: 1,
    borderTopColor: Colors.cardBorder, backgroundColor: Colors.white,
  },
  footerCancelButton: {
    flex: 0.85, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: Colors.cardBorder,
    backgroundColor: Colors.white,
  },
  footerCancelText: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700' },
  footerSaveButton: {
    flex: 1.4, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, borderRadius: BorderRadius.pill, backgroundColor: Colors.primary,
  },
  footerSaveButtonDisabled: { backgroundColor: Colors.mediumGray },
  footerSaveText: { color: Colors.white, fontSize: Typography.fontSize.base, fontWeight: '800' },
  editorContent: { padding: Spacing.base },
  fieldLabel: { fontSize: Typography.fontSize.xs, fontWeight: '700', letterSpacing: 0.5, color: Colors.textSecondary, marginTop: Spacing.md, marginBottom: Spacing.sm },
  optionalLabel: { fontWeight: '500', textTransform: 'none', letterSpacing: 0 },
  nameInput: { backgroundColor: Colors.white, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.textPrimary, fontSize: Typography.fontSize.base },
  lookPhotoEditorCard: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.md, backgroundColor: Colors.white },
  lookPhotoEditorIcon: { width: 52, height: 58, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryLight },
  lookPhotoEditorPreview: { width: 52, height: 58, borderRadius: BorderRadius.sm, backgroundColor: Colors.background },
  lookPhotoEditorCopy: { flex: 1 },
  lookPhotoEditorTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  lookPhotoEditorText: { marginTop: 3, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, lineHeight: 16 },
  removeLookPhotoBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  occasionList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  occasionChip: { alignSelf: 'flex-start', borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: 8, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.white, marginBottom: Spacing.sm },
  occasionChipActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  occasionChipText: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  occasionChipTextActive: { color: Colors.white },
  itemsEditorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  itemsSelectionCount: { color: Colors.primary, fontWeight: '700', fontSize: Typography.fontSize.xs },
  editorHint: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginBottom: Spacing.md },
  pieceCard: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, overflow: 'hidden' },
  pieceHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xs },
  pieceCategory: { flexShrink: 1, color: Colors.primary, fontSize: Typography.fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  pieceCounter: { flex: 1, color: Colors.textSecondary, fontSize: Typography.fontSize.xs },
  pieceSeeAll: { color: Colors.primary, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  pieceRemove: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  piecePage: { width: PAGE_WIDTH, height: 220, alignItems: 'center', justifyContent: 'center' },
  pieceImage: { width: PAGE_WIDTH - 96, height: 210 },
  pieceArrow: { position: 'absolute', top: 92, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.cardBorder },
  pieceArrowLeft: { left: Spacing.sm },
  pieceArrowRight: { right: Spacing.sm },
  pieceName: { textAlign: 'center', color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '700', paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, paddingTop: Spacing.xs },
  addPieceButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, minHeight: 52, borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed', backgroundColor: Colors.white, marginBottom: Spacing.sm },
  addPieceText: { color: Colors.primary, fontSize: Typography.fontSize.base, fontWeight: '700' },
  pickerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.background },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, backgroundColor: Colors.white },
  pickerChips: { paddingHorizontal: Spacing.base, paddingTop: Spacing.md, gap: Spacing.sm },
  pickerChip: { marginBottom: 0 },
  pickerGrid: { padding: Spacing.base },
  pickerGridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
  pickerCell: { width: GRID_CELL, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.md, padding: Spacing.xs },
  pickerCellUsed: { opacity: 0.5 },
  pickerCellImage: { width: '100%', height: GRID_CELL * 1.15, backgroundColor: Colors.background, borderRadius: BorderRadius.sm },
  pickerCellName: { marginTop: 4, color: Colors.textPrimary, fontSize: Typography.fontSize.xs, fontWeight: '600' },
  pickerCellCheck: { position: 'absolute', top: 6, right: 6 },
});
