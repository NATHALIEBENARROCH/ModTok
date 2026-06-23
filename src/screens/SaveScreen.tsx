import React, { useState } from "react";
import {
  View,
  Text,
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
import { useOutfit, Outfit, Occasion } from "../context/OutfitContext";

// ─── Outfit Card ─────────────────────────────────────────────────────────────
function OutfitCard({
  outfit,
  onDelete,
}: {
  outfit: Outfit;
  onDelete: () => void;
}) {
  return (
    <View style={styles.outfitCard}>
      <View style={styles.outfitPreview}>
        <Ionicons name="image-outline" size={48} color={Colors.lightGray} />
        {/* Delete button */}
        <TouchableOpacity
          style={styles.deleteOutfitBtn}
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash" size={14} color={Colors.white} />
        </TouchableOpacity>
      </View>
      <View style={styles.outfitInfo}>
        <Text style={styles.outfitName} numberOfLines={1}>
          {outfit.name}
        </Text>
        <Text style={styles.outfitMeta}>{outfit.item_ids.length} items</Text>
      </View>
    </View>
  );
}

// ─── Occasion Row (horizontal carousel) ───────────────────────────────────────
function OccasionRow({
  occasion,
  outfits,
  onDeleteOutfit,
}: {
  occasion: Occasion;
  outfits: Outfit[];
  onDeleteOutfit: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);

  const safeIndex = Math.min(index, Math.max(outfits.length - 1, 0));

  if (outfits.length === 0) {
    return (
      <View style={styles.categorySection}>
        <Text style={styles.categoryTitle}>{occasion.name}</Text>
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
      <Text style={styles.categoryTitle}>{occasion.name}</Text>
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
  const { occasions, outfits, addOccasion, deleteOccasion } = useOutfit();
  const [activeTab, setActiveTab] = useState("Outfits");

  // Add occasion modal
  const [addOccasionVisible, setAddOccasionVisible] = useState(false);
  const [newOccasionName, setNewOccasionName] = useState("");

  const handleAddOccasion = async () => {
    const trimmed = newOccasionName.trim();
    if (!trimmed) return;
    if (occasions.some((o) => o.name.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert("Already exists", `"${trimmed}" is already an occasion.`);
      return;
    }
    try {
      await addOccasion(trimmed);
      setNewOccasionName("");
      setAddOccasionVisible(false);
    } catch (error) {
      Alert.alert("Error", "Failed to add occasion. Please try again.");
    }
  };

  const handleDeleteOccasion = (occasionId: string, occasionName: string) => {
    Alert.alert("Delete Occasion", `Delete "${occasionName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteOccasion(occasionId);
          } catch (error) {
            Alert.alert("Error", "Failed to delete occasion.");
          }
        },
      },
    ]);
  };

  // Get outfits for each occasion
  const getOutfitsForOccasion = (occasionId: string): Outfit[] => {
    return outfits.filter((o) => o.occasion_id === occasionId);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <Text style={styles.title}>Save</Text>
        {activeTab === "Occasions" ? (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setAddOccasionVisible(true)}
          >
            <Ionicons name="add" size={24} color={Colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
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

      {/* Outfits Tab — horizontal carousel per occasion */}
      {activeTab === "Outfits" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.outfitsContent}
        >
          {occasions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="folder-outline"
                size={48}
                color={Colors.lightGray}
              />
              <Text style={styles.emptyStateText}>No occasions yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Create an occasion to organize your outfits
              </Text>
            </View>
          ) : (
            occasions.map((occasion) => (
              <OccasionRow
                key={occasion.id}
                occasion={occasion}
                outfits={getOutfitsForOccasion(occasion.id)}
                onDeleteOutfit={(outfitId) => {
                  Alert.alert("Delete Outfit", "Remove this outfit?", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => {
                        console.log("Delete outfit:", outfitId);
                      },
                    },
                  ]);
                }}
              />
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Occasions Tab — manage list */}
      {activeTab === "Occasions" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {occasions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="pricetag-outline"
                size={48}
                color={Colors.lightGray}
              />
              <Text style={styles.emptyStateText}>No occasions yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap the + button to create your first occasion
              </Text>
            </View>
          ) : (
            occasions.map((occasion) => {
              const occasionOutfitCount = getOutfitsForOccasion(
                occasion.id,
              ).length;
              return (
                <View key={occasion.id} style={styles.categoryItem}>
                  <View style={styles.categoryItemLeft}>
                    <Ionicons
                      name="pricetag-outline"
                      size={20}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.categoryItemText}>{occasion.name}</Text>
                    <Text style={styles.categoryItemCount}>
                      {occasionOutfitCount} outfit
                      {occasionOutfitCount !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      handleDeleteOccasion(occasion.id, occasion.name)
                    }
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={Colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              );
            })
          )}

          <TouchableOpacity
            style={styles.addCategoryBtn}
            onPress={() => setAddOccasionVisible(true)}
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

      {/* Add Occasion Modal */}
      <Modal
        visible={addOccasionVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddOccasionVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAddOccasionVisible(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New Occasion</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Evening, Vacation, Sport..."
              placeholderTextColor={Colors.textSecondary}
              value={newOccasionName}
              onChangeText={setNewOccasionName}
              autoFocus
              onSubmitEditing={handleAddOccasion}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[
                styles.createBtn,
                !newOccasionName.trim() && { opacity: 0.4 },
              ]}
              onPress={handleAddOccasion}
              disabled={!newOccasionName.trim()}
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
    flex: 1,
    fontSize: Typography.fontSize.xl,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: "center",
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
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
  },
  emptyStateText: {
    fontSize: Typography.fontSize.base,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptyStateSubtext: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: "center",
    paddingHorizontal: Spacing.base,
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
    marginTop: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
  },
  addCategoryText: {
    color: Colors.primary,
    fontWeight: "600",
    fontSize: Typography.fontSize.sm,
  },
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
