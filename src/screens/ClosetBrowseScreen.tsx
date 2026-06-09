import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "react-native";
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

  const filteredItems =
    selectedCategory === "All"
      ? items
      : items.filter((item) => item.category === selectedCategory);

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

      {/* Category Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillsScroll}
        contentContainerStyle={styles.pillsContent}
      >
        {CATEGORIES.map((cat) => (
          <CategoryPill
            key={cat}
            label={cat}
            isActive={selectedCategory === cat}
            onPress={() => setSelectedCategory(cat)}
          />
        ))}
      </ScrollView>

      {/* Items Grid */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("ItemDetail", { item })}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: item.image }}
                style={styles.image}
                resizeMode="contain"
              />
              {item.forSale && (
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
  pillsScroll: {
    maxHeight: 48,
    marginBottom: Spacing.sm,
  },
  pillsContent: {
    paddingHorizontal: Spacing.base,
    alignItems: "center",
  },
  grid: {
    paddingHorizontal: Spacing.base,
  },
  cardWrapper: {
    margin: Spacing.xs,
    position: "relative",
  },
  card: {
    width: 120,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: BorderRadius.sm,
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
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
