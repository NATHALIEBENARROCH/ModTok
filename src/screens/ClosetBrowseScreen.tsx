import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ClothingCard from '../components/ClothingCard';
import CategoryPill from '../components/CategoryPill';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { MOCK_CLOSET_ITEMS, CATEGORIES } from '../data/mockData';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - Spacing.base * 2 - Spacing.xs * 4) / 3;

export default function ClosetBrowseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialCategory = route.params?.category || 'All';
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  const filteredItems = selectedCategory === 'All'
    ? MOCK_CLOSET_ITEMS
    : MOCK_CLOSET_ITEMS.filter(item => item.category === selectedCategory);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Start Selecting</Text>
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
          <ClothingCard
            item={item}
            size="medium"
            showAdd
            onPress={() => navigation.navigate('ItemDetail', { item })}
            onAdd={() => {}}
          />
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  searchBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillsScroll: {
    maxHeight: 48,
    marginBottom: Spacing.sm,
  },
  pillsContent: {
    paddingHorizontal: Spacing.base,
    alignItems: 'center',
  },
  grid: {
    paddingHorizontal: Spacing.base,
  },
});
