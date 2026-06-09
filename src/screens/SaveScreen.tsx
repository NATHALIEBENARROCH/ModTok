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
      </View>
      {/* Delete button — sits at card level, above everything */}
      <TouchableOpacity
        style={styles.deleteOutfitBtn}
        onPress={onDelete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash" size={14} color={Colors.white} />
      </TouchableOpacity>
      <View style={styles.outfitInfo}>
        <Text style={styles.outfitName} numberOfLines={1}>
          {outfit.name}
        </Text>
        <Text style={styles.outfitMeta}>{outfit.items.length} items</Text>
      </View>
    </View>
  );
}

// ─── Tag Row (horizontal carousel) ───────────────────────────────────────────
function TagRow({
  tagName,
  outfits,
  onDeleteOutfit,
}: {
  tagName: string;
  outfits: SavedOutfit[];
  onDeleteOutfit: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);

  const safeIndex = Math.min(index, Math.max(outfits.length - 1, 0));

  if (outfits.length === 0) {
    return (
      <View style={styles.categorySection}>
        <Text style={styles.categoryTitle}>{tagName}</Text>
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
      <Text style={styles.categoryTitle}>{tagName}</Text>
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

  // Add tag modal
  const [addTagVisible, setAddTagVisible] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const handleAddTag = () => {
    const trimmed = newTagName.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    addCategory(trimmed);
    setNewTagName("");
    setAddTagVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Save</Text>
        {activeTab === "Occasions" && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setAddTagVisible(true)}
          >
            <Ionicons name="add" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {["Outfits", "Occasions"].map((tab) => (
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

      {/* Outfits Tab */}
      {activeTab === "Outfits" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.outfitsContent}
        >
          {categories.map((tag) => (
            <TagRow
              key={tag}
              tagName={tag}
              outfits={savedOutfits.filter((o) =>
                o.outfitCategory
                  .split(", ")
                  .map((t) => t.trim())
                  .includes(tag),
              )}
              onDeleteOutfit={(id) => removeOutfit(id)}
            />
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Occasions Tab */}
      {activeTab === "Occasions" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((tag) => (
            <View key={tag} style={styles.categoryItem}>
              <View style={styles.categoryItemLeft}>
                <Ionicons
                  name="pricetag-outline"
                  size={20}
                  color={Colors.textSecondary}
                />
                <Text style={styles.categoryItemText}>{tag}</Text>
                <Text style={styles.categoryItemCount}>
                  {
                    savedOutfits.filter((o) =>
                      o.outfitCategory
                        .split(", ")
                        .map((t) => t.trim())
                        .includes(tag),
                    ).length
                  }{" "}
                  outfits
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => removeCategory(tag)}
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
            onPress={() => setAddTagVisible(true)}
          >
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.addCategoryText}>Add Occasion</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Add Tag Modal */}
      <Modal
        visible={addTagVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddTagVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAddTagVisible(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New Occasion</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Evening, Vacation, Sport..."
              placeholderTextColor={Colors.textSecondary}
              value={newTagName}
              onChangeText={setNewTagName}
              autoFocus
              onSubmitEditing={handleAddTag}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.createBtn, !newTagName.trim() && { opacity: 0.4 }]}
              onPress={handleAddTag}
              disabled={!newTagName.trim()}
            >
              <Text style={styles.createBtnText}>Create Occasion</Text>
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
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    position: "relative",
  },
  outfitPreview: {
    height: 130,
    backgroundColor: Colors.background,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    overflow: "hidden",
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
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 13,
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
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
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
  },
  addCategoryText: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.lightGray,
    alignSelf: "center",
    marginBottom: Spacing.base,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  createBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  createBtnText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: "700",
  },
});
