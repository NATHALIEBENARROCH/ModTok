import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, BorderRadius, Typography } from "../theme";
import { useOutfits, SavedOutfit } from "../context/OutfitContext";

// ─── Outfit Card ─────────────────────────────────────────────────────────────
function OutfitCard({
  outfit,
  onDelete,
}: {
  outfit: SavedOutfit;
  onDelete: () => void;
}) {
  const previewItems = outfit.items.slice(0, 3);
  return (
    <View style={styles.outfitCard}>
      <View style={styles.outfitPreview}>
        {previewItems.map((item, i) => (
          <Image
            key={item.id}
            source={{ uri: item.image }}
            style={[styles.previewImage, { left: i * 22, zIndex: 3 - i }]}
            resizeMode="contain"
          />
        ))}
        {/* Delete button */}
        <TouchableOpacity
          style={styles.deleteOutfitBtn}
          onPress={onDelete}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="trash" size={13} color={Colors.white} />
        </TouchableOpacity>
      </View>
      <View style={styles.outfitInfo}>
        <Text style={styles.outfitName} numberOfLines={1}>
          {outfit.name}
        </Text>
        <Text style={styles.outfitMeta}>{outfit.items.length} items</Text>
      </View>
    </View>
  );
}

// ─── Category Row (horizontal carousel) ──────────────────────────────────────
function CategoryRow({
  categoryName,
  outfits,
  onDeleteOutfit,
}: {
  categoryName: string;
  outfits: SavedOutfit[];
  onDeleteOutfit: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);

  const safeIndex = Math.min(index, Math.max(outfits.length - 1, 0));

  if (outfits.length === 0) {
    return (
      <View style={styles.categorySection}>
        <Text style={styles.categoryTitle}>{categoryName}</Text>
        <View style={styles.emptyRow}>
          <Text style={styles.emptyRowText}>No outfits yet</Text>
        </View>
      </View>
    );
  }

  const prev = () => setIndex((i) => (i - 1 + outfits.length) % outfits.length);
  const next = () => setIndex((i) => (i + 1) % outfits.length);

  return (
    <View style={styles.categorySection}>
      <Text style={styles.categoryTitle}>{categoryName}</Text>
      <View style={styles.carouselRow}>
        <TouchableOpacity
          onPress={prev}
          style={styles.arrowBtn}
          disabled={outfits.length <= 1}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={outfits.length > 1 ? Colors.black : Colors.lightGray}
          />
        </TouchableOpacity>

        <OutfitCard
          outfit={outfits[safeIndex]}
          onDelete={() => onDeleteOutfit(outfits[safeIndex].id)}
        />

        <TouchableOpacity
          onPress={next}
          style={styles.arrowBtn}
          disabled={outfits.length <= 1}
        >
          <Ionicons
            name="chevron-forward"
            size={22}
            color={outfits.length > 1 ? Colors.black : Colors.lightGray}
          />
        </TouchableOpacity>
      </View>

      {outfits.length > 1 && (
        <View style={styles.dots}>
          {outfits.map((_, dotIndex) => (
            <View
              key={dotIndex}
              style={[styles.dot, dotIndex === safeIndex && styles.activeDot]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function SaveScreen() {
  const {
    savedOutfits,
    categories,
    addCategory,
    removeCategory,
    removeOutfit,
  } = useOutfits();
  const [activeTab, setActiveTab] = useState("Outfits");

  // Add category modal
  const [addCatVisible, setAddCatVisible] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const handleAddCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      Alert.alert("Already exists", `"${trimmed}" is already a category.`);
      return;
    }
    addCategory(trimmed);
    setNewCatName("");
    setAddCatVisible(false);
  };

  const handleDeleteCategory = (cat: string) => {
    Alert.alert(
      "Delete Category",
      `Delete "${cat}"? Outfits in this category will be removed too.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => removeCategory(cat),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Save</Text>
        {activeTab === "Categories" && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setAddCatVisible(true)}
          >
            <Ionicons name="add" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {["Outfits", "Categories"].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Outfits Tab — horizontal carousel per category */}
      {activeTab === "Outfits" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.outfitsContent}
        >
          {categories.map((cat) => (
            <CategoryRow
              key={cat}
              categoryName={cat}
              outfits={savedOutfits.filter((o) => o.outfitCategory === cat)}
              onDeleteOutfit={(id) => {
                Alert.alert("Delete Outfit", "Remove this outfit?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => removeOutfit(id),
                  },
                ]);
              }}
            />
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Categories Tab — manage list */}
      {activeTab === "Categories" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((cat) => (
            <View key={cat} style={styles.categoryItem}>
              <View style={styles.categoryItemLeft}>
                <Ionicons
                  name="folder-outline"
                  size={20}
                  color={Colors.textSecondary}
                />
                <Text style={styles.categoryItemText}>{cat}</Text>
                <Text style={styles.categoryItemCount}>
                  {savedOutfits.filter((o) => o.outfitCategory === cat).length}{" "}
                  outfits
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteCategory(cat)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addCategoryBtn}
            onPress={() => setAddCatVisible(true)}
          >
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.addCategoryText}>Add Category</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Add Category Modal */}
      <Modal
        visible={addCatVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddCatVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAddCatVisible(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New Category</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Spring Brunch, Weekend Casual..."
              placeholderTextColor={Colors.textSecondary}
              value={newCatName}
              onChangeText={setNewCatName}
              autoFocus
              onSubmitEditing={handleAddCategory}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.createBtn, !newCatName.trim() && { opacity: 0.4 }]}
              onPress={handleAddCategory}
              disabled={!newCatName.trim()}
            >
              <Text style={styles.createBtnText}>Create Category</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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
  addBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 7,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  activeTab: {
    backgroundColor: Colors.black,
    borderColor: Colors.black,
  },
  tabText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  activeTabText: {
    color: Colors.white,
  },
  // Outfits tab
  outfitsContent: {
    paddingHorizontal: Spacing.base,
  },
  categorySection: {
    marginBottom: Spacing.xl,
  },
  categoryTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    letterSpacing: -0.3,
  },
  carouselRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  arrowBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  outfitCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  outfitPreview: {
    height: 130,
    backgroundColor: Colors.background,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    position: "absolute",
    width: 65,
    height: 85,
  },
  outfitInfo: {
    padding: Spacing.sm,
  },
  outfitName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  outfitMeta: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
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
  emptyRow: {
    height: 80,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyRowText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  deleteOutfitBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 12,
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  // Categories tab
  categoriesContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  categoryItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  categoryItemText: {
    fontSize: Typography.fontSize.base,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  categoryItemCount: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  addCategoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
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
  // Modal
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
    paddingHorizontal: Spacing.base,
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
    marginBottom: Spacing.base,
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
    marginBottom: Spacing.base,
  },
  createBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  createBtnText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: Typography.fontSize.sm,
  },
});
