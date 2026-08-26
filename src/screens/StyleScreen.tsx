import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Modal,
  FlatList,
  PanResponder,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius, Typography } from "../theme";
import { ClothingItem, useCloset } from "../context/ClosetContext";
import { useOutfits } from "../context/OutfitContext";
import { uploadImageToSupabase } from '../lib/uploadImage';


const ALL_CATEGORIES = [
  "Coats",
  "Jackets",
  "Cardigans",
  "Sweaters",
  "Tops",
  "Blouses",
  "T shirts",
  "Dresses",
  "Pants",
  "Skirts",
  "Shorts",
  "Shoes",
  "Boots",
  "Sneakers",
  "Bags",
  "Jewelry",
  "Hats",
  "Accessories",
];

interface OutfitSlot {
  category: string;
  items: ClothingItem[];
  currentIndex: number;
}

function buildSlot(cat: string, allItems: ClothingItem[]): OutfitSlot {
  return {
    category: cat,
    items: allItems.filter((i) => i.category === cat),
    currentIndex: 0,
  };
}

export default function StyleScreen() {
  const { width } = useWindowDimensions();
  const { items: closetItems } = useCloset();

  // A calm six-piece starting canvas. Any other category can be added only when the look needs it.
  const initialCategories = ["Coats", "Tops", "Pants", "Shoes", "Bags", "Jewelry"];

  const [slots, setSlots] = useState<OutfitSlot[]>(
    initialCategories.map((cat) => buildSlot(cat, closetItems)),
  );
  const [savedOutfit, setSavedOutfit] = useState(false);
  const [savedCategoryName, setSavedCategoryName] = useState("");

  // Save popup state
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [outfitName, setOutfitName] = useState("");
  const [selectedOccasion, setSelectedOccasion] = useState("");
  const [newOccInput, setNewOccInput] = useState("");
  const [occasionManagerVisible, setOccasionManagerVisible] = useState(false);
  const [editingOccasionId, setEditingOccasionId] = useState<string | null>(null);
  const [occasionNameDraft, setOccasionNameDraft] = useState("");
  const [lookPhotoUri, setLookPhotoUri] = useState<string | null>(null);
  const [savingOutfit, setSavingOutfit] = useState(false);

  const { saveOutfit, updateOutfit, categories, occasions, addOccasion, renameOccasion, deleteOccasion, sharePost } = useOutfits();

  // Share popup state
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareCaption, setShareCaption] = useState("");
  const [sharedOutfit, setSharedOutfit] = useState(false);

  // Add new category slot
  const [addPickerVisible, setAddPickerVisible] = useState(false);

  // Modal state for tap-to-change
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Drag-to-reorder state
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragY = useRef(new Animated.Value(0)).current;
  const slotHeights = useRef<number[]>([]);
  const slotOffsets = useRef<number[]>([]);
  const dragStartY = useRef(0);
  const dragStartIndex = useRef(0);

  const deleteSlot = (slotIndex: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== slotIndex));
  };

  const addSlot = (cat: string) => {
    setSlots((prev) => [...prev, buildSlot(cat, closetItems)]);
    setAddPickerVisible(false);
  };

  const navigate = (slotIndex: number, direction: "prev" | "next") => {
    setSlots((prev) =>
      prev.map((slot, i) => {
        if (i !== slotIndex) return slot;
        const total = slot.items.length;
        if (total === 0) return slot;
        const newIndex =
          direction === "next"
            ? (slot.currentIndex + 1) % total
            : (slot.currentIndex - 1 + total) % total;
        return { ...slot, currentIndex: newIndex };
      }),
    );
  };

  const handleSave = () => {
    setOutfitName("");
    setSelectedOccasion("");
    setNewOccInput("");
    setLookPhotoUri(null);
    setSaveModalVisible(true);
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
    if (!result.canceled && result.assets.length > 0) {
      setLookPhotoUri(result.assets[0].uri);
    }
  };

  const handleAddNewOccasion = () => {
    const cat = newOccInput.trim();
    if (!cat || categories.includes(cat)) return;
    addOccasion(cat);
    setSelectedOccasion(cat);
    setNewOccInput("");
  };

  const saveManagedOccasion = async () => {
    const nextName = occasionNameDraft.trim();
    if (!editingOccasionId || !nextName) return;
    try {
      await renameOccasion(editingOccasionId, nextName);
      if (selectedOccasion === occasions.find((occasion) => occasion.id === editingOccasionId)?.name) setSelectedOccasion(nextName);
      setEditingOccasionId(null);
      setOccasionNameDraft("");
    } catch {
      // Keep the dialog open so the user can correct a duplicate name.
    }
  };

  const removeManagedOccasion = async (id: string, name: string) => {
    try {
      await deleteOccasion(id);
      if (selectedOccasion === name) setSelectedOccasion("");
    } catch {
      // The list remains unchanged when deletion is not permitted.
    }
  };

  const confirmSave = async () => {
    if (!outfitName.trim() || savingOutfit) return;
    const selectedItems = slots
      .filter((s) => s.items.length > 0)
      .map((s) => s.items[s.currentIndex]);
    try {
      setSavingOutfit(true);
      const selectedOccasionRecord = occasions.find((occasion) => occasion.name === selectedOccasion);

      // Save the wardrobe selection first. An optional photo must never stop a user
      // from saving the outfit itself.
      const createdOutfit = await saveOutfit({
        name: outfitName.trim(),
        item_ids: selectedItems.map((item) => item.id),
        occasion_id: selectedOccasionRecord?.id ?? null,
        look_image_url: null,
      });

      let photoNotice = '';
      if (lookPhotoUri) {
        const lookImageUrl = await uploadImageToSupabase(lookPhotoUri, 'worn-look');
        if (!lookImageUrl) {
          photoNotice = ' The outfit was saved, but the photo could not upload. You can add it later from Edit Outfit.';
        } else {
          try {
            await updateOutfit(createdOutfit.id, { look_image_url: lookImageUrl });
          } catch {
            photoNotice = ' The outfit was saved, but the photo needs the one-time database update before it can save.';
          }
        }
      }

      setSaveModalVisible(false);
      setSavedCategoryName(selectedOccasion || 'Saved outfits');
      setSavedOutfit(true);
      setTimeout(() => setSavedOutfit(false), 3000);
      if (photoNotice) Alert.alert('Outfit saved', photoNotice.trim());
    } catch (error) {
      console.error('Could not save outfit:', error);
      Alert.alert('Could not save outfit', 'Please check that you are signed in, then try again.');
    } finally {
      setSavingOutfit(false);
    }
  };

  const openPicker = (slotIndex: number) => {
    setEditingIndex(slotIndex);
    setPickerVisible(true);
  };

  const selectCategory = (cat: string) => {
    if (editingIndex === null) return;
    setSlots((prev) =>
      prev.map((slot, i) => (i === editingIndex ? buildSlot(cat, closetItems) : slot)),
    );
    setPickerVisible(false);
    setEditingIndex(null);
  };

  const buildPanResponder = (index: number) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderGrant: (_, gs) => {
        dragStartY.current = gs.y0;
        dragStartIndex.current = index;
        setDraggingIndex(index);
        dragY.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        dragY.setValue(gs.dy);
        const currentY = dragStartY.current + gs.dy;
        let hoverIndex = index;
        for (let i = 0; i < slotOffsets.current.length; i++) {
          const top = slotOffsets.current[i];
          const bottom = top + (slotHeights.current[i] || 80);
          if (currentY >= top && currentY <= bottom) {
            hoverIndex = i;
            break;
          }
        }
        setDragOverIndex(hoverIndex);
      },
      onPanResponderRelease: () => {
        if (
          dragOverIndex !== null &&
          dragOverIndex !== dragStartIndex.current
        ) {
          setSlots((prev) => {
            const updated = [...prev];
            const [moved] = updated.splice(dragStartIndex.current, 1);
            updated.splice(dragOverIndex, 0, moved);
            return updated;
          });
        }
        dragY.setValue(0);
        setDraggingIndex(null);
        setDragOverIndex(null);
      },
    });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <Text style={styles.title}>Style</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Ionicons
            name={savedOutfit ? "bookmark" : "bookmark-outline"}
            size={22}
            color={savedOutfit ? Colors.primary : Colors.black}
          />
        </TouchableOpacity>
      </View>

      {savedOutfit && (
        <View style={styles.savedBanner}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
          <Text style={styles.savedBannerText}>
            Saved to "{savedCategoryName}" ✓
          </Text>
        </View>
      )}

      {sharedOutfit && (
        <View style={[styles.savedBanner, { backgroundColor: "#4A90D9" }]}>
          <Ionicons name="share-social" size={16} color={Colors.white} />
          <Text style={styles.savedBannerText}>Posted to Share feed ✓</Text>
        </View>
      )}

      <Text style={styles.hint}>
        <Ionicons name="swap-vertical-outline" size={12} /> Drag handle to
        reorder · Tap label to change category
      </Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={draggingIndex === null}
      >
        {slots.map((slot, slotIndex) => {
          const currentItem = slot.items[slot.currentIndex];
          const isDragging = draggingIndex === slotIndex;
          const isDropTarget =
            dragOverIndex === slotIndex && draggingIndex !== slotIndex;
          const panResponder = buildPanResponder(slotIndex);

          return (
            <View
              key={`${slot.category}-${slotIndex}`}
              style={[styles.slotWrapper, isDropTarget && styles.dropTarget]}
              onLayout={(e) => {
                slotHeights.current[slotIndex] = e.nativeEvent.layout.height;
                slotOffsets.current[slotIndex] = e.nativeEvent.layout.y;
              }}
            >
              <Animated.View
                style={[
                  styles.slotContainer,
                  isDragging && styles.dragging,
                  isDragging && { transform: [{ translateY: dragY }] },
                ]}
              >
                <View style={styles.categoryRow}>
                  <View {...panResponder.panHandlers} style={styles.dragHandle}>
                    <Ionicons
                      name="reorder-three-outline"
                      size={22}
                      color={Colors.textSecondary}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.categoryLabelContainer}
                    onPress={() => openPicker(slotIndex)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.categoryLabel}>{slot.category}</Text>
                    <Ionicons
                      name="chevron-down"
                      size={12}
                      color={Colors.white}
                      style={{ marginLeft: 4 }}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteSlot(slotIndex)}
                    style={styles.deleteSlotBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={Colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {currentItem ? (
                  <>
                    <View style={styles.itemCard}>
                      <TouchableOpacity
                        onPress={() => navigate(slotIndex, "prev")}
                        style={styles.arrowBtn}
                        disabled={slot.items.length <= 1}
                      >
                        <Ionicons
                          name="chevron-back"
                          size={20}
                          color={
                            slot.items.length <= 1
                              ? Colors.lightGray
                              : Colors.textPrimary
                          }
                        />
                      </TouchableOpacity>
                      <Image
                        source={{ uri: currentItem.image }}
                        style={styles.itemImage}
                        resizeMode="contain"
                      />
                      <TouchableOpacity
                        onPress={() => navigate(slotIndex, "next")}
                        style={styles.arrowBtn}
                        disabled={slot.items.length <= 1}
                      >
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={
                            slot.items.length <= 1
                              ? Colors.lightGray
                              : Colors.textPrimary
                          }
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {currentItem.name}
                      </Text>
                      <Text style={styles.itemBrand}>{currentItem.brand}</Text>
                    </View>
                    {slot.items.length > 1 && (
                      <View style={styles.dots}>
                        {slot.items.map((_, dotIdx) => (
                          <View
                            key={dotIdx}
                            style={[
                              styles.dot,
                              dotIdx === slot.currentIndex && styles.activeDot,
                            ]}
                          />
                        ))}
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.emptyCard}>
                    <Ionicons
                      name="shirt-outline"
                      size={28}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.emptyText}>
                      No items in {slot.category}
                    </Text>
                  </View>
                )}
              </Animated.View>
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.addOccasionBtn}
          onPress={() => setAddPickerVisible(true)}
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={Colors.primary}
          />
          <Text style={styles.addOccasionText}>Add Category</Text>
        </TouchableOpacity>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={() => {
              setShareCaption("");
              setShareModalVisible(true);
            }}
          >
            <Ionicons
              name="share-social-outline"
              size={18}
              color={Colors.primary}
            />
            <Text style={styles.shareBtnText}>Share Outfit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveOutfitBtn} onPress={handleSave}>
            <Ionicons name="bookmark-outline" size={18} color={Colors.white} />
            <Text style={styles.saveOutfitBtnText}>Save Outfit</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Clothing Category Picker Modal */}
      <Modal
        visible={addPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAddPickerVisible(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Category</Text>
            <FlatList
              data={ALL_CATEGORIES.filter(
                (cat) => !slots.some((s) => s.category === cat),
              )}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.categoryOption}
                  onPress={() => addSlot(item)}
                >
                  <Text style={styles.categoryOptionText}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text
                  style={{
                    textAlign: "center",
                    color: Colors.textSecondary,
                    padding: Spacing.lg,
                  }}
                >
                  All categories already added
                </Text>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Save Outfit Modal */}
      <Modal
        visible={saveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSaveModalVisible(false)}
      >
        <View style={styles.saveModalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.saveModalKeyboard}
          >
            <View style={styles.saveModalSheet}>
              <View style={styles.saveModalHeader}>
                <View style={styles.modalHandle} />
                <TouchableOpacity
                  style={styles.saveModalCloseButton}
                  onPress={() => setSaveModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalTitle}>Save Outfit</Text>
              <Text style={styles.saveModalSubtitle}>Give this look a name, then choose where to save it.</Text>

              <Text style={styles.inputLabel}>Outfit name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Spring Brunch, Date Night..."
                placeholderTextColor={Colors.textSecondary}
                value={outfitName}
                onChangeText={setOutfitName}
                autoFocus
                returnKeyType="done"
              />

              <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>Occasion <Text style={styles.optionalLabel}>(optional)</Text></Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }} keyboardShouldPersistTaps="handled">
                <View style={styles.saveModalChips}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setSelectedOccasion(cat)}
                      style={[styles.catChip, selectedOccasion === cat && styles.catChipSelected]}
                    >
                      <Text style={[styles.catChipText, selectedOccasion === cat && styles.catChipTextSelected]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.newCatRow}>
                <TextInput
                  style={styles.newOccInput}
                  placeholder="Create new occasion..."
                  placeholderTextColor={Colors.textSecondary}
                  value={newOccInput}
                  onChangeText={setNewOccInput}
                  returnKeyType="done"
                  onSubmitEditing={handleAddNewOccasion}
                />
                <TouchableOpacity
                  style={[styles.addCatBtn, !newOccInput.trim() && { opacity: 0.4 }]}
                  onPress={handleAddNewOccasion}
                  disabled={!newOccInput.trim()}
                >
                  <Ionicons name="add" size={20} color={Colors.white} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.manageOccasionsLink} onPress={() => setOccasionManagerVisible(true)}>
                <Ionicons name="create-outline" size={16} color={Colors.primary} />
                <Text style={styles.manageOccasionsText}>Edit shared occasions</Text>
              </TouchableOpacity>

              <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>PHOTO WEARING THIS LOOK <Text style={styles.optionalLabel}>(optional)</Text></Text>
              <TouchableOpacity style={styles.lookPhotoCard} onPress={chooseLookPhoto} activeOpacity={0.82}>
                {lookPhotoUri ? (
                  <Image source={{ uri: lookPhotoUri }} style={styles.lookPhotoPreview} resizeMode="cover" />
                ) : (
                  <View style={styles.lookPhotoIcon}>
                    <Ionicons name="person-add-outline" size={22} color={Colors.primary} />
                  </View>
                )}
                <View style={styles.lookPhotoCopy}>
                  <Text style={styles.lookPhotoTitle}>{lookPhotoUri ? 'Photo ready to upload' : 'Add a photo wearing this look'}</Text>
                  <Text style={styles.lookPhotoText}>{lookPhotoUri ? 'Tap to choose a different image' : 'Use it as the visual in Saved, Profile, or a Story.'}</Text>
                </View>
                {lookPhotoUri ? (
                  <TouchableOpacity style={styles.removeLookPhotoBtn} onPress={() => setLookPhotoUri(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={22} color={Colors.textSecondary} />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmSaveBtn, (!outfitName.trim() || savingOutfit) && { opacity: 0.4 }]}
                onPress={confirmSave}
                disabled={!outfitName.trim() || savingOutfit}
              >
                {savingOutfit ? <ActivityIndicator size="small" color={Colors.white} /> : <Ionicons name="bookmark" size={16} color={Colors.white} />}
                <Text style={styles.confirmSaveBtnText}>{savingOutfit ? 'Saving...' : 'Save Outfit'}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Shared Occasion Manager */}
      <Modal
        visible={occasionManagerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setOccasionManagerVisible(false); setEditingOccasionId(null); }}
      >
        <View style={styles.saveModalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.saveModalKeyboard}>
            <View style={styles.saveModalSheet}>
              <View style={styles.saveModalHeader}>
                <View style={styles.modalHandle} />
                <TouchableOpacity style={styles.saveModalCloseButton} onPress={() => { setOccasionManagerVisible(false); setEditingOccasionId(null); }}>
                  <Ionicons name="close" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalTitle}>{editingOccasionId ? "Rename occasion" : "Shared occasions"}</Text>
              {editingOccasionId ? (
                <>
                  <Text style={styles.saveModalSubtitle}>This change appears in both items and outfits.</Text>
                  <TextInput
                    style={styles.textInput}
                    value={occasionNameDraft}
                    onChangeText={setOccasionNameDraft}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={saveManagedOccasion}
                  />
                  <TouchableOpacity style={styles.confirmSaveBtn} onPress={saveManagedOccasion}>
                    <Text style={styles.confirmSaveBtnText}>Save name</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <ScrollView style={styles.occasionManagerList} contentContainerStyle={styles.occasionManagerListContent}>
                  {occasions.length === 0 ? (
                    <Text style={styles.saveModalSubtitle}>No shared occasions yet. Add one from the Save Outfit sheet or any item.</Text>
                  ) : occasions.map((occasion) => (
                    <View key={occasion.id} style={styles.occasionManagerRow}>
                      <View style={styles.occasionManagerName}>
                        <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                        <Text style={styles.categoryOptionText}>{occasion.name}</Text>
                      </View>
                      <View style={styles.occasionManagerActions}>
                        <TouchableOpacity onPress={() => { setEditingOccasionId(occasion.id); setOccasionNameDraft(occasion.name); }} style={styles.occasionManagerIcon}>
                          <Ionicons name="pencil-outline" size={18} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeManagedOccasion(occasion.id, occasion.name)} style={styles.occasionManagerIcon}>
                          <Ionicons name="trash-outline" size={18} color="#D93025" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Share Outfit Modal */}
      <Modal
        visible={shareModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setShareModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShareModalVisible(false)}
        >
          <View
            style={[
              styles.modalSheet,
              { paddingHorizontal: Spacing.base, paddingBottom: 40 },
            ]}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Share Outfit</Text>
            <Text style={styles.inputLabel}>Add a caption</Text>
            <TextInput
              style={[
                styles.textInput,
                { height: 80, textAlignVertical: "top" },
              ]}
              placeholder="e.g. My go-to weekend look ✨"
              placeholderTextColor={Colors.textSecondary}
              value={shareCaption}
              onChangeText={setShareCaption}
              multiline
              autoFocus
            />
            <TouchableOpacity
              style={styles.confirmSaveBtn}
              onPress={() => {
                const selectedItems = slots
                  .filter((s) => s.items.length > 0)
                  .map((s) => s.items[s.currentIndex]);
                sharePost({
                  id: `post-${Date.now()}`,
                  userId: "me",
                  username: "@you",
                  userAvatar:
                    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&crop=face",
                  outfit: {
                    id: `outfit-${Date.now()}`,
                    name: "My Outfit",
                    items: selectedItems,
                    occasion: "",
                    season: "All Season",
                    createdDate: new Date().toISOString().split("T")[0],
                    isShared: true,
                    likes: 0,
                  },
                  caption: shareCaption.trim() || "Check out my outfit! 👗",
                  likes: 0,
                  comments: 0,
                  isLiked: false,
                  timestamp: "Just now",
                });
                setShareModalVisible(false);
                setSharedOutfit(true);
                setTimeout(() => setSharedOutfit(false), 3000);
              }}
            >
              <Ionicons
                name="share-social-outline"
                size={16}
                color={Colors.white}
              />
              <Text style={styles.confirmSaveBtnText}>Post to Share Feed</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Change Category Picker Modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choose Category</Text>
            <FlatList
              data={ALL_CATEGORIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected =
                  editingIndex !== null &&
                  slots[editingIndex]?.category === item;
                return (
                  <TouchableOpacity
                    style={[
                      styles.categoryOption,
                      isSelected && styles.categoryOptionSelected,
                    ]}
                    onPress={() => selectCategory(item)}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        isSelected && styles.categoryOptionTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={Colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: Typography.fontSize.xl,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  saveBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.green,
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  savedBannerText: {
    color: Colors.white,
    fontWeight: "600",
    marginLeft: Spacing.xs,
    fontSize: Typography.fontSize.sm,
  },
  hint: {
    textAlign: "center",
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.base },
  slotWrapper: { marginBottom: Spacing.md, borderRadius: BorderRadius.lg },
  dropTarget: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    borderRadius: BorderRadius.lg,
  },
  slotContainer: { borderRadius: BorderRadius.lg },
  dragging: {
    opacity: 0.85,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 999,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  deleteSlotBtn: { padding: 2, opacity: 0.6 },
  dragHandle: { padding: 4, opacity: 0.5 },
  categoryLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.black,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.base,
    paddingVertical: 5,
  },
  categoryLabel: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: Typography.fontSize.sm,
    letterSpacing: 0.3,
  },
  itemCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  itemImage: { flex: 1, height: 140, borderRadius: BorderRadius.sm },
  itemInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  itemName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
    color: Colors.textPrimary,
    flex: 1,
  },
  itemBrand: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.xs,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.lightGray,
    marginHorizontal: 2,
  },
  activeDot: { backgroundColor: Colors.primary, width: 14 },
  emptyCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },
  emptyText: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  addOccasionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    borderRadius: BorderRadius.lg,
  },
  addOccasionText: {
    color: Colors.primary,
    fontWeight: "600",
    fontSize: Typography.fontSize.sm,
  },
  actionRow: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.sm },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  shareBtnText: {
    color: Colors.primary,
    fontWeight: "600",
    fontSize: Typography.fontSize.sm,
  },
  saveOutfitBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  saveOutfitBtnText: {
    color: Colors.white,
    fontWeight: "600",
    fontSize: Typography.fontSize.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  saveModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  saveModalKeyboard: {
    width: "100%",
  },
  saveModalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  saveModalHeader: {
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  saveModalCloseButton: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  saveModalSubtitle: {
    color: Colors.textSecondary,
    textAlign: "center",
    fontSize: Typography.fontSize.sm,
    lineHeight: 19,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.base,
  },
  saveModalChips: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  optionalLabel: {
    fontWeight: "400",
    color: Colors.textSecondary,
  },
  manageOccasionsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    alignSelf: "flex-start",
    marginBottom: Spacing.base,
  },
  manageOccasionsText: {
    color: Colors.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
  },
  lookPhotoCard: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.white,
  },
  lookPhotoIcon: {
    width: 52,
    height: 58,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  lookPhotoPreview: { width: 52, height: 58, borderRadius: BorderRadius.sm, backgroundColor: Colors.background },
  lookPhotoCopy: { flex: 1 },
  lookPhotoTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  lookPhotoText: { marginTop: 3, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, lineHeight: 16 },
  removeLookPhotoBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  occasionManagerList: {
    maxHeight: 280,
  },
  occasionManagerListContent: {
    paddingBottom: Spacing.sm,
  },
  occasionManagerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    paddingVertical: Spacing.md,
  },
  occasionManagerName: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  occasionManagerActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  occasionManagerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: Spacing.sm,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.lightGray,
    alignSelf: "center",
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  categoryOptionSelected: { backgroundColor: Colors.background },
  categoryOptionText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  categoryOptionTextSelected: { fontWeight: "700", color: Colors.primary },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  catChip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 7,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  catChipSelected: { backgroundColor: Colors.black, borderColor: Colors.black },
  catChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  catChipTextSelected: { color: Colors.white },
  newCatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  newOccInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  addCatBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmSaveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.md,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  confirmSaveBtnText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: Typography.fontSize.sm,
  },
});
