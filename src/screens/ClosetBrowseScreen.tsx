import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  useWindowDimensions,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import CategoryPill from "../components/CategoryPill";
import { Colors, Spacing, BorderRadius, Typography } from "../theme";
import { useCloset } from "../context/ClosetContext";

const CATEGORIES = [
  'All', 'Coats', 'Jackets', 'Cardigans', 'Sweaters', 'Blouses',
  'T shirts', 'Dresses', 'Pants', 'Skirts', 'Shorts', 'Shoes', 'Bags', 'Accessories', 'Activewear',
];

export default function ClosetBrowseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialCategory = route.params?.category || "All";
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const { items, removeItem, searchItems, loading } = useCloset();
  const { width } = useWindowDimensions();

  // Delete confirmation modal state
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  // If searching, use searchItems; otherwise filter by category
  const filteredItems = searchQuery.trim()
    ? searchItems(searchQuery)
    : selectedCategory === "All"
      ? items
      : items.filter((item) => item.category === selectedCategory);

  const cardWidth = Math.min(width, 430) - Spacing.base * 2;
  const cardHeight = Math.round(cardWidth * 1.15);

  const handleDeletePress = (id: string, name: string) => {
    setItemToDelete({ id, name });
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      removeItem(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        {showSearch ? (
          <TextInput
            style={styles.searchInput}
            placeholder="Search color, category, brand..."
            placeholderTextColor={Colors.mediumGray}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
        ) : (
          <Text style={styles.title}>Start Sorting</Text>
        )}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }}
        >
          <Ionicons name={showSearch ? 'close' : 'search'} size={22} color={Colors.black} />
        </TouchableOpacity>
      </View>

      {/* Category Filter Pills */}
      <View style={styles.pillsContainer}>
        {CATEGORIES.map((cat) => (
          <CategoryPill
            key={cat}
            label={cat}
            isActive={selectedCategory === cat}
            onPress={() => setSelectedCategory(cat)}
          />
        ))}
      </View>

      {/* Loading indicator */}
      {loading && (
        <View style={{ alignItems: 'center', paddingVertical: Spacing.base }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      )}

      {/* Items List — full-width tall image cards */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        numColumns={1}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { width: cardWidth, height: cardHeight }]}
            onPress={() => navigation.navigate("ItemDetail", { item })}
            activeOpacity={0.92}
          >
            <Image
              source={{ uri: item.image }}
              style={styles.cardImage}
              resizeMode="cover"
            />
            {/* Dark gradient overlay */}
            <View style={styles.overlay} />
            {/* Name + brand */}
            <View style={styles.cardTextBlock}>
              <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.cardBrand} numberOfLines={1}>{item.brand}</Text>
              {item.forSale && (
                <View style={styles.saleTag}>
                  <Text style={styles.saleText}>FOR SALE</Text>
                </View>
              )}
            </View>
            {/* Delete button */}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeletePress(item.id, item.name)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={14} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="shirt-outline" size={48} color={Colors.mediumGray} />
            <Text style={styles.emptyText}>No items in this category</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      {/* Delete Confirmation Modal */}
      <Modal visible={!!itemToDelete} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Ionicons name="trash-outline" size={32} color="#D93025" style={{ marginBottom: Spacing.sm }} />
            <Text style={styles.modalTitle}>Delete Item</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to permanently delete{" "}
              <Text style={{ fontWeight: "700" }}>{itemToDelete?.name}</Text>?{"\n"}This cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setItemToDelete(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDeleteBtn} onPress={confirmDelete}>
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: {
    flex: 1,
    fontSize: Typography.fontSize.xl,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  list: { paddingHorizontal: Spacing.base, alignItems: "center" },
  card: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    marginBottom: Spacing.base,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "transparent",
  },
  cardTextBlock: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    paddingTop: Spacing.xl,
    backgroundColor: "transparent",
  },
  cardName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: "700",
    color: Colors.white,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    marginBottom: 2,
  },
  cardBrand: {
    fontSize: Typography.fontSize.sm,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  saleTag: {
    alignSelf: "flex-start",
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: Spacing.xs,
  },
  saleText: { color: Colors.white, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  deleteButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: Spacing.md },
  emptyText: { fontSize: Typography.fontSize.base, color: Colors.textSecondary, fontWeight: "500" },
  searchInput: {
    flex: 1,
    height: 36,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginHorizontal: Spacing.sm,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  modalBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  modalButtons: { flexDirection: "row", gap: Spacing.md, width: "100%" },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    alignItems: "center",
  },
  modalCancelText: { fontSize: Typography.fontSize.sm, fontWeight: "600", color: Colors.textPrimary },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.pill,
    backgroundColor: "#D93025",
    alignItems: "center",
  },
  modalDeleteText: { fontSize: Typography.fontSize.sm, fontWeight: "700", color: Colors.white },
});
