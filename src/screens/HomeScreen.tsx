import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import ModTokLogo from '../components/ModTokLogo';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { MOCK_CLOSET_ITEMS, CATEGORIES, CURRENT_USER } from '../data/mockData';


const CATEGORY_CARDS = [
  { category: 'Dresses', label: 'Browse your Dresses', items: MOCK_CLOSET_ITEMS.filter(i => i.category === 'Dresses') },
  { category: 'Coats', label: 'Browse your Jackets', items: MOCK_CLOSET_ITEMS.filter(i => i.category === 'Coats') },
  { category: 'Sweaters', label: 'Browse your Sweaters', items: MOCK_CLOSET_ITEMS.filter(i => i.category === 'Sweaters') },
  { category: 'Pants', label: 'Browse your Pants', items: MOCK_CLOSET_ITEMS.filter(i => i.category === 'Pants') },
  { category: 'Shoes', label: 'Browse your Shoes', items: MOCK_CLOSET_ITEMS.filter(i => i.category === 'Shoes') },
];

const today = new Date();
const dateString = today.toLocaleDateString('en-US', {
  weekday: undefined,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export default function HomeScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <ModTokLogo size="small" />
        <TouchableOpacity style={styles.notificationBtn}>
          <Ionicons name="notifications-outline" size={22} color={Colors.black} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Sort Header */}
        <View style={styles.inspirationHeader}>
          <Text style={styles.inspirationTitle}>Sort</Text>
          <Text style={styles.inspirationDate}>Today {dateString}</Text>
        </View>

        {/* Category Browse Cards */}
        {CATEGORY_CARDS.map((card, index) => {
          const featuredItem = card.items[0];
          if (!featuredItem) return null;
          return (
            <TouchableOpacity
              key={index}
              style={styles.categoryCard}
              onPress={() => navigation.navigate('ClosetBrowse', { category: card.category })}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: featuredItem.image }}
                style={styles.categoryImage}
                resizeMode="contain"
              />
              <Text style={styles.categoryLabel}>{card.label}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{MOCK_CLOSET_ITEMS.length}</Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>Outfits</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{MOCK_CLOSET_ITEMS.filter(i => i.forSale).length}</Text>
            <Text style={styles.statLabel}>For Sale</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: Colors.primary }]}>
              {CURRENT_USER.followers}
            </Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
        </View>

        {/* AI Suggestion Banner */}
        <View style={styles.aiBanner}>
          <View style={styles.aiBannerLeft}>
            <Ionicons name="sparkles" size={20} color={Colors.primary} />
            <Text style={styles.aiBannerTitle}>AI Outfit Suggestion</Text>
          </View>
          <Text style={styles.aiBannerText}>
            Based on today's weather (12°C, cloudy), try your Patterned Knit Sweater with Wide-Leg Jeans and Green Sneakers.
          </Text>
          <TouchableOpacity style={styles.aiBannerBtn}>
            <Text style={styles.aiBannerBtnText}>View Outfit</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 100 }} />
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
  notificationBtn: {
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
  },
  inspirationHeader: {
    alignItems: 'center',
    marginBottom: Spacing.base,
    marginTop: Spacing.sm,
  },
  inspirationTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  inspirationDate: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  categoryCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.md,
    padding: Spacing.base,
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryImage: {
    width: 90,
    height: 110,
    borderRadius: BorderRadius.sm,
  },
  categoryLabel: {
    fontSize: Typography.fontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginLeft: Spacing.base,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
    marginTop: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginHorizontal: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statNumber: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  aiBanner: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  aiBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  aiBannerTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginLeft: Spacing.xs,
  },
  aiBannerText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  aiBannerBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
  },
  aiBannerBtnText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: Typography.fontSize.sm,
  },
});
