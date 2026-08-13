import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ImageStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import ModTokLogo from '../components/ModTokLogo';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { useCloset } from '../context/ClosetContext';

type SortCategory = {
  category: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const SORT_CATEGORIES: SortCategory[] = [
  { category: 'All', label: 'Browse everything', icon: 'apps-outline' },
  { category: 'Dresses', label: 'Browse your Dresses', icon: 'woman-outline' },
  { category: 'Jackets', label: 'Browse your Jackets', icon: 'shirt-outline' },
  { category: 'Sweaters', label: 'Browse your Sweaters', icon: 'layers-outline' },
  { category: 'Tops', label: 'Browse your Tops', icon: 'shirt-outline' },
  { category: 'Pants', label: 'Browse your Pants', icon: 'color-palette-outline' },
  { category: 'Skirts', label: 'Browse your Skirts', icon: 'sparkles-outline' },
  { category: 'Shoes', label: 'Browse your Shoes', icon: 'footsteps-outline' },
  { category: 'Bags', label: 'Browse your Bags', icon: 'bag-handle-outline' },
  { category: 'Accessories', label: 'Browse your Accessories', icon: 'watch-outline' },
];

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { items } = useCloset();

  function getCategoryItems(category: string) {
    if (category === 'All') return items;
    return items.filter((item) => item.category.toLowerCase() === category.toLowerCase());
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <ModTokLogo size="small" />
        <TouchableOpacity style={styles.notificationButton} activeOpacity={0.8}>
          <Ionicons name="notifications-outline" size={22} color={Colors.black} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Sort your wardrobe</Text>
          <Text style={styles.subtitle}>Choose a category to browse, edit, or delete pieces.</Text>
        </View>

        {SORT_CATEGORIES.map((sortCategory) => {
          const categoryItems = getCategoryItems(sortCategory.category);
          const featuredItem = categoryItems[0];
          const itemCount = categoryItems.length;

          return (
            <TouchableOpacity
              key={sortCategory.category}
              style={styles.categoryCard}
              onPress={() => navigation.navigate('ClosetBrowse', { category: sortCategory.category })}
              activeOpacity={0.86}
            >
              <View style={styles.cardArtwork}>
                {featuredItem?.image ? (
                  <Image source={{ uri: featuredItem.image }} style={styles.categoryImage} resizeMode="contain" />
                ) : (
                  <View style={styles.emptyArtwork}>
                    <Ionicons name={sortCategory.icon} size={54} color={Colors.primary} />
                  </View>
                )}
              </View>

              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.categoryLabel}>{sortCategory.label}</Text>
                  <Text style={styles.itemCount}>
                    {itemCount === 0 ? 'No pieces yet' : `${itemCount} ${itemCount === 1 ? 'piece' : 'pieces'}`}
                  </Text>
                </View>
                <View style={styles.arrowCircle}>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textPrimary} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 108 }} />
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.base,
  },
  titleBlock: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    maxWidth: 290,
    textAlign: 'center',
    marginTop: Spacing.xs,
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    lineHeight: 19,
  },
  categoryCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.textPrimary,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardArtwork: {
    height: 174,
    backgroundColor: '#FFFDF9',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  categoryImage: {
    width: '92%',
    height: '92%',
  } as ImageStyle,
  emptyArtwork: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F9E5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooter: {
    minHeight: 76,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLabel: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  itemCount: {
    marginTop: 3,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  arrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F6E2DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
