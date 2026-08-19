import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { ClothingItem, useCloset } from '../context/ClosetContext';
import { Outfit, useOutfit } from '../context/OutfitContext';

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
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedConfirmation, setSavedConfirmation] = useState(false);

  useEffect(() => {
    if (!outfit) return;
    setNameDraft(outfit.name);
    setOccasionDraft(outfit.occasion_id ?? '');
    setSelectedItemIds(outfit.item_ids ?? []);
  }, [outfit?.id, outfit?.name, outfit?.occasion_id, outfit?.item_ids]);

  const outfitItems = useMemo(() => {
    if (!outfit) return [];
    return outfit.item_ids
      .map((itemId) => items.find((item) => item.id === itemId))
      .filter((item): item is ClothingItem => Boolean(item));
  }, [items, outfit]);

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
    setSelectedItemIds(outfit.item_ids ?? []);
    setEditorVisible(true);
  };

  const toggleItem = (itemId: string) => {
    setSelectedItemIds((current) =>
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId],
    );
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
      await updateOutfit(outfit.id, {
        name: nextName,
        occasion_id: occasionDraft || null,
        item_ids: selectedItemIds,
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
              <Text style={styles.editorHint}>Tap an item to add it to or remove it from this saved outfit.</Text>

              {items.map((item) => {
                const selected = selectedItemIds.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.choiceRow, selected && styles.choiceRowSelected]}
                    onPress={() => toggleItem(item.id)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: item.image_url ?? item.image }} style={styles.choiceImage} resizeMode="contain" />
                    <View style={styles.choiceTextWrap}>
                      <Text style={styles.choiceName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.choiceMeta} numberOfLines={1}>{item.category}{item.color ? ` · ${item.color}` : ''}</Text>
                    </View>
                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={selected ? Colors.primary : Colors.mediumGray}
                    />
                  </TouchableOpacity>
                );
              })}

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
  occasionList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  occasionChip: { alignSelf: 'flex-start', borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: 8, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.white, marginBottom: Spacing.sm },
  occasionChipActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  occasionChipText: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  occasionChipTextActive: { color: Colors.white },
  itemsEditorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  itemsSelectionCount: { color: Colors.primary, fontWeight: '700', fontSize: Typography.fontSize.xs },
  editorHint: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginBottom: Spacing.md },
  choiceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.md, padding: Spacing.sm, gap: Spacing.sm, marginBottom: Spacing.sm },
  choiceRowSelected: { borderColor: Colors.primary, borderWidth: 1.5, backgroundColor: Colors.primaryLight },
  choiceImage: { width: 48, height: 56, borderRadius: BorderRadius.sm, backgroundColor: Colors.background },
  choiceTextWrap: { flex: 1 },
  choiceName: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  choiceMeta: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, marginTop: 2 },
});
