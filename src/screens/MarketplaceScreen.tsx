import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useMarketplace } from '../context/MarketplaceContext';
import { MarketplaceListing, formatUsd } from '../types/marketplace';
import { BorderRadius, Colors, Spacing, Typography } from '../theme';

function ListingCard({ listing, onPress }: { listing: MarketplaceListing; onPress: () => void }) {
  const image = listing.image_urls?.[0];
  const sellerName = listing.seller?.display_name || listing.seller?.username || 'ModTok seller';
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.84}>
      <View style={styles.imageFrame}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="contain" />
        ) : (
          <Ionicons name="shirt-outline" size={42} color={Colors.mediumGray} />
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>{listing.title}</Text>
      <Text style={styles.cardMeta} numberOfLines={1}>{listing.brand || listing.category} · {sellerName}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatUsd(listing.price_cents)}</Text>
        <Text style={styles.shipping}>{listing.shipping_price_cents ? `+ ${formatUsd(listing.shipping_price_cents)} ship` : 'Free shipping'}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function MarketplaceScreen() {
  const navigation = useNavigation<any>();
  const { listings, loading, refreshListings } = useMarketplace();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  useFocusEffect(useCallback(() => {
    refreshListings().catch((error) => console.error('Marketplace refresh failed:', error));
  }, [refreshListings]));

  const categories = useMemo(() => {
    const values = Array.from(new Set(listings.map((item) => item.category))).sort();
    return ['All', ...values];
  }, [listings]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return listings.filter((listing) => {
      const inCategory = category === 'All' || listing.category === category;
      const searchable = `${listing.title} ${listing.brand ?? ''} ${listing.category} ${listing.description}`.toLowerCase();
      return inCategory && (!normalized || searchable.includes(normalized));
    });
  }, [category, listings, query]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main'))}
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={25} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.eyebrow}>SHOP REAL CLOSETS</Text>
            <Text style={styles.title}>Marketplace</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.ordersButton} onPress={() => navigation.navigate('Orders')}>
          <Ionicons name="receipt-outline" size={20} color={Colors.textPrimary} />
          <Text style={styles.ordersText}>Orders</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={19} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search dresses, brands, bags..."
          placeholderTextColor={Colors.mediumGray}
          returnKeyType="search"
        />
      </View>

      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
        style={styles.categoryScroller}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.categoryPill, category === item && styles.categoryPillActive]}
            onPress={() => setCategory(item)}
          >
            <Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[styles.grid, filtered.length === 0 && styles.emptyGrid]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshListings} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ListingCard listing={item} onPress={() => navigation.navigate('ProductDetail', { listingId: item.id })} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bag-handle-outline" size={34} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>{query || category !== 'All' ? 'No matching pieces' : 'The marketplace is opening'}</Text>
            <Text style={styles.emptyText}>{query || category !== 'All' ? 'Try another search or category.' : 'Listings from other ModTok closets will appear here as sellers publish them.'}</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 120 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  backButton: { width: 40, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  eyebrow: { color: Colors.primary, fontSize: Typography.fontSize.xs, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: Colors.textPrimary, fontSize: Typography.fontSize.xxl, fontWeight: '800', letterSpacing: -0.7 },
  ordersButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.pill, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.cardBorder },
  ordersText: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  searchBox: { minHeight: 50, marginHorizontal: Spacing.base, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: Typography.fontSize.base, paddingVertical: Spacing.sm },
  categoryScroller: { flexGrow: 0, marginTop: Spacing.md, marginBottom: Spacing.md },
  categoryList: { paddingHorizontal: Spacing.base, gap: Spacing.sm },
  categoryPill: { minHeight: 36, justifyContent: 'center', paddingHorizontal: Spacing.base, borderRadius: BorderRadius.pill, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.cardBorder },
  categoryPillActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  categoryText: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  categoryTextActive: { color: Colors.white },
  grid: { paddingHorizontal: Spacing.base },
  emptyGrid: { flexGrow: 1 },
  gridRow: { gap: Spacing.sm },
  card: { flex: 1, minWidth: 0, marginBottom: Spacing.lg },
  imageFrame: { width: '100%', aspectRatio: 0.72, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  cardTitle: { marginTop: Spacing.sm, color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  cardMeta: { marginTop: 2, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, lineHeight: 16 },
  priceRow: { marginTop: 5 },
  price: { color: Colors.primaryDark, fontSize: Typography.fontSize.base, fontWeight: '800' },
  shipping: { marginTop: 1, color: Colors.textSecondary, fontSize: 10, fontWeight: '600' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxl, paddingBottom: 80 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9E5E1' },
  emptyTitle: { marginTop: Spacing.base, color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800', textAlign: 'center' },
  emptyText: { marginTop: Spacing.sm, color: Colors.textSecondary, fontSize: Typography.fontSize.sm, lineHeight: 20, textAlign: 'center' },
});
