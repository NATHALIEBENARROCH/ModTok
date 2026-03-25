import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Modal,
  FlatList,
  PanResponder,
  Animated,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, BorderRadius, Typography } from "../theme";
import { MOCK_CLOSET_ITEMS, ClothingItem } from "../data/mockData";
import { useOutfits } from "../context/OutfitContext";

const { width } = Dimensions.get("window");

const ALL_CATEGORIES = [
  "Coats",
  "Jackets",
  "Cardigans",
  "Sweaters",
  "Blouses",
  "T Shirts",
  "Dresses",
  "Pants",
  "Skirts",
  "Shorts",
  "Shoes",
  "Bags",
  "Hats",
  "Accessories",
];

interface OutfitSlot {
  category: string;
  items: ClothingItem[];
  currentIndex: number;
}

function buildSlot(cat: string): OutfitSlot {
  return {
    category: cat,
    items: MOCK_CLOSET_ITEMS.filter((i) => i.category === cat),
    currentIndex: 0,
  };
}

export default function StyleScreen() {
  const initialCategories = [
    "Coats",
    "Jackets",
    "Cardigans",
    "Sweaters",
    "Blouses",
    "T Shirts",
    "Dresses",
    "Pants",
    "Skirts",
    "Shorts",
    "Shoes",
    "Bags",
    "Hats",
    "Accessories",
  ];

  const [slots, setSlots] = useState<OutfitSlot[]>(
    initialCategories.map(buildSlot),
  );
  const [savedOutfit, setSavedOutfit] = useState(false);
  const [savedCategoryName, setSavedCategoryName] = useState("");

  // Save popup state
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [outfitName, setOutfitName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const { addOutfit, categories } = useOutfits();

  // Delete a slot
  const deleteSlot = (slotIndex: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== slotIndex));
  };

  // Add a new category slot
  const [addPickerVisible, setAddPickerVisible] = useState(false);

  const addSlot = (cat: string) => {
    setSlots((prev) => [...prev, buildSlot(cat)]);
    setAddPickerVisible(false);
  };

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
    setSelectedCategory(categories[0] || "");
    setSaveModalVisible(true);
  };

  const confirmSave = () => {
    if (!outfitName.trim() || !selectedCategory) return;
    const selectedItems = slots
      .filter((s) => s.items.length > 0)
      .map((s) => s.items[s.currentIndex]);
    addOutfit({
      id: `outfit-${Date.now()}`,
      name: outfitName.trim(),
      items: selectedItems,
      occasion: selectedCategory,
      season: "All Season",
      createdDate: new Date().toISOString().split("T")[0],
      isShared: false,
      likes: 0,
      outfitCategory: selectedCategory,
    });
    setSaveModalVisible(false);
    setSavedCategoryName(selectedCategory);
    setSavedOutfit(true);
    setTimeout(() => setSavedOutfit(false), 3000);
  };

  // Tap label → open picker
  const openPicker = (slotIndex: number) => {
    setEditingIndex(slotIndex);
    setPickerVisible(true);
  };

  // Pick a new category for the slot
  const selectCategory = (cat: string) => {
    if (editingIndex === null) return;
    setSlots((prev) =>
      prev.map((slot, i) => (i === editingIndex ? buildSlot(cat) : slot)),
    );
    setPickerVisible(false);
    setEditingIndex(null);
  };

  // Build PanResponder for a given slot index
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
        // Determine which slot we're hovering over
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
                {/* Row: drag handle + category label + delete */}
                <View style={styles.categoryRow}>
                  {/* Drag handle */}
                  <View {...panResponder.panHandlers} style={styles.dragHandle}>
                    <Ionicons
                      name="reorder-three-outline"
                      size={22}
                      color={Colors.textSecondary}
                    />
                  </View>

                  {/* Tappable category label */}
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

                  {/* Delete slot button */}
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

                {/* Item Card */}
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
                            slot.items.length > 1
                              ? Colors.black
                              : Colors.lightGray
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
                            slot.items.length > 1
                              ? Colors.black
                              : Colors.lightGray
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
                        {slot.items.map((_, dotIndex) => (
                          <View
                            key={dotIndex}
                            style={[
                              styles.dot,
                              dotIndex === slot.currentIndex &&
                                styles.activeDot,
                            ]}
                          />
                        ))}
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.emptyCard}>
                    <Ionicons
                      name="add-circle-outline"
                      size={32}
                      color={Colors.lightGray}
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

        {/* Add Category Button */}
        <TouchableOpacity
          style={styles.addCategoryBtn}
          onPress={() => setAddPickerVisible(true)}
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={Colors.primary}
          />
          <Text style={styles.addCategoryText}>Add Category</Text>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.shareBtn}>
            <Ionicons
              name="share-social-outline"
              size={18}
              color={Colors.primary}
            />
            <Text style={styles.shareBtnText}>Share Outfit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.aiBtn}>
            <Ionicons name="sparkles-outline" size={18} color={Colors.white} />
            <Text style={styles.aiBtnText}>AI Suggest</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Category Picker Modal */}
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
                (cat) => !slots.find((s) => s.category === cat),
              )}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.categoryOption}
                  onPress={() => addSlot(item)}
                >
                  <Text style={styles.categoryOptionText}>{item}</Text>
                  <Ionicons name="add" size={18} color={Colors.primary} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text
                  style={{
                    textAlign: "center",
                    color: Colors.textSecondary,
                    padding: 24,
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
        animationType="slide"
        onRequestClose={() => setSaveModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSaveModalVisible(false)}
        >
          <View
            style={[
              styles.modalSheet,
              { paddingHorizontal: Spacing.base, paddingBottom: 40 },
            ]}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Save Outfit</Text>

            {/* Outfit name input */}
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

            {/* Category picker */}
            <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>
              Save to category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: Spacing.base }}
            >
              <View
                style={{
                  flexDirection: "row",
                  gap: Spacing.sm,
                  paddingVertical: 4,
                }}
              >
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    style={[
                      styles.catChip,
                      selectedCategory === cat && styles.catChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        selectedCategory === cat && styles.catChipTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.confirmSaveBtn,
                (!outfitName.trim() || !selectedCategory) && { opacity: 0.4 },
              ]}
              onPress={confirmSave}
              disabled={!outfitName.trim() || !selectedCategory}
            >
              <Ionicons name="bookmark" size={16} color={Colors.white} />
              <Text style={styles.confirmSaveBtnText}>Save Outfit</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Category Picker Modal */}
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
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
  },
  slotWrapper: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  dropTarget: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    borderRadius: BorderRadius.lg,
  },
  slotContainer: {
    borderRadius: BorderRadius.lg,
  },
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
  deleteSlotBtn: {
    padding: 2,
    opacity: 0.6,
  },
  addCategoryBtn: {
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
  addCategoryText: {
    color: Colors.primary,
    fontWeight: "600",
    fontSize: Typography.fontSize.sm,
  },
  dragHandle: {
    padding: 4,
    opacity: 0.5,
  },
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
  itemImage: {
    flex: 1,
    height: 140,
    borderRadius: BorderRadius.sm,
  },
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
  activeDot: {
    backgroundColor: Colors.primary,
    width: 14,
  },
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
  emptyText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
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
  aiBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  aiBtnText: {
    color: Colors.white,
    fontWeight: "600",
    fontSize: Typography.fontSize.sm,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: Spacing.sm,
    paddingBottom: 40,
    maxHeight: "70%",
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
  categoryOptionSelected: {
    backgroundColor: Colors.background,
  },
  categoryOptionText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  categoryOptionTextSelected: {
    fontWeight: "700",
    color: Colors.primary,
  },
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
  catChipSelected: {
    backgroundColor: Colors.black,
    borderColor: Colors.black,
  },
  catChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  catChipTextSelected: {
    color: Colors.white,
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
