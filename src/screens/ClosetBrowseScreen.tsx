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
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import CategoryPill from "../components/CategoryPill";
import { Colors, Spacing, BorderRadius, Typography } from "../theme";
import { CATEGORIES } from "../data/mockData";
import { useCloset } from "../context/ClosetContext";

export default function ClosetBrowseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialCategory = route.params?.category || "All";
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const { items, removeItem } = useCloset();
  const { width } = useWindowDimensions();

  const filteredItems =
    selectedCategory === "All"
      ? items
      : items.filter((item) => item.category === selectedCategory);

  // Single column (full-width) on phone, 2 cols on tablet, 3 on wide
  const numColumns = width < 480 ? 1 : width < 768 ? 2 : 3;
  const cardWidth = Math.floor((width - Spacing.base * 2 - Spacing.sm * 2 * numColumns) / numColumns);
  const imageSize = width < 480 ? 100 : cardWidth - Spacing.sm * 2 - 4;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Start Sorting</Text>
        <TouchableOpacity style={styles.searchBtn}>
          <Ionicons name="search" size={22} color={Colors.black} />
        </TouchableOpacity>
      </View>

      {/* Category Filter Pills — wrapping layout */}
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

      {/* Items List/Grid */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={`cols-${numColumns}`}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.cardWrapper, { width: cardWidth, margin: Spacing.sm }]}>
            <TouchableOpacity
              style={[
                styles.card,
                numColumns === 1 && styles.cardRow,
              ]}
              onPress={() => navigation.navigate("ItemDetail", { item })}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: item.image }}
                style={[
                  styles.cardImage,
                  { width: imageSize, height: imageSize },
                ]}
                resizeMode="contain"
              />
              {numColumns === 1 && (
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.cardBrand} numberOfLines={1}>{item.brand}</Text>
                  {item.forSale && (
                    <View style={styles.saleTagInline}>
                      <Text style={styles.saleText}>FOR SALE</Text>
                    </View>
                  )}
                </View>
              )}
              {numColumns !== 1 && item.forSale && (
                <View style={styles.saleTag}>
                  <Text style={styles.saleText}>SELL</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => removeItem(item.id)}
            >
              <Ionicons name="trash-outline" size={13} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />
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
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: Typography.fontSize.xl,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  searchBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  grid: {
    paddingHorizontal: Spacing.base,
  },
  cardWrapper: {
    position: "relative",
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
    overflow: "hidden",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  cardImage: {
    borderRadius: BorderRadius.sm,
  },
  cardInfo: {
    flex: 1,
    marginLeft: Spacing.base,
  },
  cardName: {
    fontSize: Typography.fontSize.base,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  cardBrand: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  saleTagInline: {
    alignSelf: "flex-start",
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  saleTag: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  saleText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  deleteButton: {
    position: "absolute",
    bottom: 14,
    right: 14,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
