import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useMarketplace } from '../context/MarketplaceContext';
import { useOutfit } from '../context/OutfitContext';
import { MarketplaceListing, formatUsd } from '../types/marketplace';
import { BorderRadius, Colors, Spacing, Typography } from '../theme';

type SellTab = 'Active' | 'Sold' | 'Archived';

function ListingCard({ listing, onShare, onArchive }: { listing: MarketplaceListing; onShare: () => void; onArchive: () => void }) {
  const image = listing.image_urls?.[0];
  return (
    <View style={styles.listingCard}>
      <View style={styles.listingImageFrame}>
        {image ? <Image source={{ uri: image }} style={styles.listingImage} resizeMode="contain" /> : <Ionicons name="shirt-outline" size={38} color={Colors.mediumGray} />}
      </View>
      <View style={styles.listingCopy}>
        <Text style={styles.listingTitle} numberOfLines={2}>{listing.title}</Text>
        <Text style={styles.listingMeta}>{listing.category}{listing.size ? ` · ${listing.size}` : ''}</Text>
        <Text style={styles.listingPrice}>{formatUsd(listing.price_cents)}</Text>
        <Text style={styles.listingShipping}>{listing.shipping_price_cents ? `${formatUsd(listing.shipping_price_cents)} shipping` : 'Free shipping'}</Text>
      </View>
      <View style={styles.listingActions}>
        {listing.status === 'active' && (
          <TouchableOpacity style={styles.shareButton} onPress={onShare}>
            <Ionicons name="paper-plane-outline" size={16} color={Colors.primary} />
            <Text style={styles.shareText}>Story</Text>
          </TouchableOpacity>
        )}
        {listing.status === 'active' && (
          <TouchableOpacity style={styles.archiveButton} onPress={onArchive}>
            <Text style={styles.archiveText}>Unlist</Text>
          </TouchableOpacity>
        )}
        {listing.status === 'reserved' && <Text style={styles.reservedText}>Checkout in progress</Text>}
      </View>
    </View>
  );
}

export default function SellScreen() {
  const navigation = useNavigation<any>();
  const {
    myListings,
    sales,
    sellerStatus,
    loading,
    refreshAll,
    refreshSellerStatus,
    startSellerOnboarding,
    openSellerDashboard,
    archiveListing,
  } = useMarketplace();
  const { createShareStory } = useOutfit();
  const [activeTab, setActiveTab] = useState<SellTab>('Active');
  const [openingStripe, setOpeningStripe] = useState(false);

  useFocusEffect(useCallback(() => {
    refreshAll().catch((error) => console.error('Seller hub refresh failed:', error));
  }, [refreshAll]));

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('seller-onboarding')) refreshSellerStatus().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [refreshSellerStatus]);

  const sellerReady = sellerStatus.details_submitted && sellerStatus.charges_enabled && sellerStatus.payouts_enabled;
  const displayListings = useMemo(() => myListings.filter((listing) => {
    if (activeTab === 'Active') return ['active', 'reserved'].includes(listing.status);
    if (activeTab === 'Sold') return listing.status === 'sold';
    return ['archived', 'draft'].includes(listing.status);
  }), [activeTab, myListings]);

  const availableBalance = useMemo(() => sales
    .filter((order) => ['paid', 'processing', 'shipped', 'delivered'].includes(order.status))
    .reduce((total, order) => total + order.seller_net_cents, 0), [sales]);

  const openStripe = async () => {
    try {
      setOpeningStripe(true);
      const url = sellerReady ? await openSellerDashboard() : await startSellerOnboarding();
      await Linking.openURL(url);
    } catch (error: any) {
      Alert.alert('Seller setup could not open', error?.message ?? 'Please try again.');
    } finally {
      setOpeningStripe(false);
    }
  };

  const listItem = () => {
    if (!sellerReady) {
      Alert.alert('Set up seller payouts first', 'Stripe verifies sellers and sends proceeds to their bank account.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Set up payouts', onPress: openStripe },
      ]);
      return;
    }
    navigation.navigate('SellItemPicker');
  };

  const unlist = (listing: MarketplaceListing) => {
    Alert.alert('Unlist this item?', 'It will immediately disappear from the marketplace.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unlist',
        style: 'destructive',
        onPress: async () => {
          try {
            await archiveListing(listing.id);
          } catch (error: any) {
            Alert.alert('Could not unlist item', error?.message ?? 'Please try again.');
          }
        },
      },
    ]);
  };

  const shareListing = async (listing: MarketplaceListing) => {
    const image = listing.image_urls?.[0];
    if (!image) return Alert.alert('Photo required', 'This listing needs a photo before it can be shared.');
    try {
      const created = await createShareStory({
        outfit_id: null,
        caption: `${listing.title} is available in the ModTok marketplace.`,
        image_urls: [image],
        tagged_item_id: listing.closet_item_id,
        tagged_listing_id: listing.id,
        tagged_item_name: listing.title,
        tagged_item_price: listing.price_cents / 100,
      });
      if (!created) throw new Error('Please sign in again.');
      Alert.alert('Added to Your Story', 'Viewers can tap the item to open its marketplace listing.');
    } catch (error: any) {
      Alert.alert('Could not share listing', error?.message ?? 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.title}>Sell</Text>
        <TouchableOpacity style={styles.infoButton} onPress={() => Alert.alert('How selling works', 'Set up Stripe payouts, list a wardrobe item in USD, then ship it when a buyer pays.')}>
          <Ionicons name="information-circle-outline" size={23} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayListings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshAll} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <>
            <View style={[styles.sellerCard, sellerReady && styles.sellerCardReady]}>
              <View style={styles.sellerIcon}>
                <Ionicons name={sellerReady ? 'checkmark' : 'card-outline'} size={24} color={Colors.white} />
              </View>
              <View style={styles.sellerCopy}>
                <Text style={styles.sellerTitle}>{sellerReady ? 'Payouts ready' : 'Set up seller payouts'}</Text>
                <Text style={styles.sellerText}>{sellerReady ? 'Your verified Stripe account can accept USD sales.' : 'Stripe securely verifies your identity and bank details.'}</Text>
              </View>
              <TouchableOpacity style={styles.sellerButton} onPress={openStripe} disabled={openingStripe}>
                <Text style={styles.sellerButtonText}>{openingStripe ? 'Opening...' : sellerReady ? 'Dashboard' : 'Start'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.earningsCard}>
              <View><Text style={styles.earningsLabel}>SALES IN PROGRESS</Text><Text style={styles.earningsAmount}>{formatUsd(availableBalance)}</Text></View>
              <TouchableOpacity style={styles.ordersButton} onPress={() => navigation.navigate('Orders', { initialTab: 'Sales' })}><Ionicons name="cube-outline" size={18} color={Colors.white} /><Text style={styles.ordersText}>My Sales</Text></TouchableOpacity>
            </View>

            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.marketButton} onPress={() => navigation.navigate('Marketplace')}><Ionicons name="bag-handle-outline" size={19} color={Colors.textPrimary} /><Text style={styles.marketButtonText}>Browse marketplace</Text></TouchableOpacity>
              <TouchableOpacity style={styles.listButton} onPress={listItem}><Ionicons name="add" size={20} color={Colors.white} /><Text style={styles.listButtonText}>List an Item</Text></TouchableOpacity>
            </View>

            <View style={styles.tabs}>
              {(['Active', 'Sold', 'Archived'] as SellTab[]).map((tab) => (
                <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => setActiveTab(tab)}>
                  <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        renderItem={({ item }) => <ListingCard listing={item} onShare={() => shareListing(item)} onArchive={() => unlist(item)} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name={activeTab === 'Sold' ? 'checkmark-done-outline' : 'pricetag-outline'} size={46} color={Colors.mediumGray} />
            <Text style={styles.emptyTitle}>No {activeTab.toLowerCase()} listings</Text>
            <Text style={styles.emptyText}>{activeTab === 'Active' ? 'Your live marketplace listings will appear here.' : `Your ${activeTab.toLowerCase()} items will appear here.`}</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 118 }} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base },
  headerSpacer: { width: 38 },
  title: { flex: 1, textAlign: 'center', color: Colors.textPrimary, fontSize: Typography.fontSize.xl, fontWeight: '800' },
  infoButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: Spacing.base },
  sellerCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: '#2B2928' },
  sellerCardReady: { backgroundColor: '#214E3B' },
  sellerIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  sellerCopy: { flex: 1 },
  sellerTitle: { color: Colors.white, fontSize: Typography.fontSize.base, fontWeight: '800' },
  sellerText: { marginTop: 2, color: Colors.lightGray, fontSize: Typography.fontSize.xs, lineHeight: 17 },
  sellerButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: Spacing.md, borderRadius: BorderRadius.pill, backgroundColor: Colors.white },
  sellerButtonText: { color: Colors.textPrimary, fontSize: Typography.fontSize.xs, fontWeight: '800' },
  earningsCard: { marginTop: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.base, borderRadius: BorderRadius.lg, backgroundColor: Colors.white, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  earningsLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '800', letterSpacing: 0.7 },
  earningsAmount: { marginTop: 2, color: Colors.textPrimary, fontSize: Typography.fontSize.xxl, fontWeight: '800' },
  ordersButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.pill, backgroundColor: Colors.black },
  ordersText: { color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  quickActions: { marginTop: Spacing.md, flexDirection: 'row', gap: Spacing.sm },
  marketButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.white },
  marketButtonText: { color: Colors.textPrimary, fontSize: Typography.fontSize.xs, fontWeight: '800' },
  listButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.primary },
  listButtonText: { color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  tabs: { marginTop: Spacing.lg, marginBottom: Spacing.md, flexDirection: 'row', gap: Spacing.sm },
  tab: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.pill, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.cardBorder },
  activeTab: { backgroundColor: Colors.black, borderColor: Colors.black },
  tabText: { color: Colors.textPrimary, fontSize: Typography.fontSize.xs, fontWeight: '800' },
  activeTabText: { color: Colors.white },
  listingCard: { minHeight: 150, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.cardBorder },
  listingImageFrame: { width: 88, height: 124, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.background, overflow: 'hidden' },
  listingImage: { width: '100%', height: '100%' },
  listingCopy: { flex: 1, minWidth: 0 },
  listingTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '800', lineHeight: 20 },
  listingMeta: { marginTop: 3, color: Colors.textSecondary, fontSize: Typography.fontSize.xs },
  listingPrice: { marginTop: 7, color: Colors.primaryDark, fontSize: Typography.fontSize.md, fontWeight: '800' },
  listingShipping: { marginTop: 2, color: Colors.textSecondary, fontSize: 10 },
  listingActions: { alignItems: 'flex-end', gap: Spacing.sm },
  shareButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.primary },
  shareText: { color: Colors.primary, fontSize: Typography.fontSize.xs, fontWeight: '800' },
  archiveButton: { minHeight: 34, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  archiveText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  reservedText: { maxWidth: 84, color: Colors.primaryDark, fontSize: 10, fontWeight: '800', textAlign: 'right' },
  emptyState: { alignItems: 'center', paddingTop: Spacing.xxl, paddingHorizontal: Spacing.xl },
  emptyTitle: { marginTop: Spacing.md, color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800' },
  emptyText: { marginTop: Spacing.sm, color: Colors.textSecondary, fontSize: Typography.fontSize.sm, lineHeight: 20, textAlign: 'center' },
});
