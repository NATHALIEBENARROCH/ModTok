import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LISTING_SELECT, useMarketplace } from '../context/MarketplaceContext';
import { supabase } from '../lib/supabase';
import { CONDITION_LABELS, MarketplaceListing, PACKAGE_SIZE_LABELS, formatUsd } from '../types/marketplace';
import { BorderRadius, Colors, Spacing, Typography } from '../theme';

export default function ProductDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const listingId = route.params?.listingId as string;
  const {
    listings,
    myListings,
    reportListing,
    blockSeller,
    bundle,
    addToBundle,
    startBundleWith,
  } = useMarketplace();
  const [listing, setListing] = useState<MarketplaceListing | null>(
    [...listings, ...myListings].find((item) => item.id === listingId) ?? null,
  );
  const [loading, setLoading] = useState(!listing);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [parentOutfit, setParentOutfit] = useState<MarketplaceListing | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setViewerId(data.user?.id ?? null));
    if (listing) return;
    supabase
      .from('marketplace_listings')
      .select(LISTING_SELECT)
      .eq('id', listingId)
      .single()
      .then(({ data, error }) => {
        if (error) console.error('Product detail load failed:', error);
        const row = (data as unknown as MarketplaceListing) ?? null;
        if (row?.pieces) row.pieces = row.pieces.slice().sort((a, b) => a.position - b.position);
        setListing(row);
        setLoading(false);
      });
  }, [listing, listingId]);

  // If this piece is also part of an outfit for sale, offer the whole look.
  useEffect(() => {
    if (!listing || listing.listing_kind === 'outfit') return;
    supabase
      .from('marketplace_outfit_pieces')
      .select('outfit_listing_id')
      .eq('piece_listing_id', listing.id)
      .then(({ data }) => {
        const outfitIds = new Set((data ?? []).map((row: any) => row.outfit_listing_id));
        setParentOutfit(listings.find((item) => outfitIds.has(item.id) && item.status === 'active') ?? null);
      });
  }, [listing, listings]);

  const total = useMemo(
    () => listing ? listing.price_cents + listing.shipping_price_cents : 0,
    [listing],
  );

  const report = () => {
    if (!listing) return;
    Alert.alert('Report this listing', 'Why are you reporting it?', [
      { text: 'Counterfeit', onPress: () => submitReport('counterfeit') },
      { text: 'Fraud or scam', onPress: () => submitReport('fraud') },
      { text: 'Inappropriate', onPress: () => submitReport('inappropriate') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submitReport = async (reason: string) => {
    try {
      await reportListing(listingId, reason);
      Alert.alert('Report received', 'Thank you. ModTok will review this listing.');
    } catch (error: any) {
      Alert.alert('Could not report', error?.message ?? 'Please try again.');
    }
  };

  const block = () => {
    if (!listing?.seller_id) return;
    Alert.alert('Block this seller?', 'Their listings will no longer appear for you.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          try {
            await blockSeller(listing.seller_id!);
            navigation.goBack();
          } catch (error: any) {
            Alert.alert('Could not block seller', error?.message ?? 'Please try again.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={Colors.primary} /></SafeAreaView>;
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="bag-remove-outline" size={46} color={Colors.mediumGray} />
        <Text style={styles.unavailableTitle}>Listing unavailable</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}><Text style={styles.secondaryButtonText}>Go back</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isOwner = viewerId === listing.seller_id;
  const isOutfit = listing.listing_kind === 'outfit';
  const inBundle = Boolean(bundle?.listingIds.includes(listing.id));

  const onAddToBundle = () => {
    const result = addToBundle(listing);
    if (result === 'other_seller') {
      Alert.alert(
        'Start a new bundle?',
        'A bundle holds items from one seller, so they ship together in one package. Your current bundle will be cleared.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start new bundle', onPress: () => startBundleWith(listing) },
        ],
      );
      return;
    }
    Alert.alert(
      result === 'already' ? 'Already in your bundle' : 'Added to your bundle',
      'Add more from this seller and pay one shipping for everything.',
      [
        { text: 'Keep shopping', onPress: () => navigation.navigate('Marketplace', { sellerId: listing.seller_id }) },
        { text: 'Review bundle', onPress: () => navigation.navigate('Checkout', { listingIds: (bundle?.listingIds.includes(listing.id) ? bundle.listingIds : [...(bundle?.listingIds ?? []), listing.id]) }) },
      ],
    );
  };
  const sellerName = listing.seller?.display_name || listing.seller?.username || 'ModTok seller';
  const available = listing.status === 'active';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={25} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Item details</Text>
        {!isOwner ? (
          <TouchableOpacity style={styles.iconButton} onPress={() => Alert.alert('Listing options', undefined, [
            { text: 'Report listing', onPress: report },
            { text: 'Block seller', style: 'destructive', onPress: block },
            { text: 'Cancel', style: 'cancel' },
          ])}>
            <Ionicons name="ellipsis-horizontal" size={23} color={Colors.textPrimary} />
          </TouchableOpacity>
        ) : <View style={styles.iconButton} />}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.imageFrame}>
          {listing.image_urls?.[0] ? (
            <Image source={{ uri: listing.image_urls[0] }} style={styles.image} resizeMode="contain" />
          ) : (
            <Ionicons name="shirt-outline" size={58} color={Colors.mediumGray} />
          )}
        </View>

        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.title}>{listing.title}</Text>
            <Text style={styles.subtitle}>{listing.brand || listing.category}{listing.size ? ` · Size ${listing.size}` : ''}</Text>
          </View>
          <Text style={styles.price}>{formatUsd(listing.price_cents)}</Text>
        </View>

        <View style={styles.pillRow}>
          <View style={styles.pill}><Text style={styles.pillText}>{CONDITION_LABELS[listing.condition]}</Text></View>
          <View style={styles.pill}><Text style={styles.pillText}>{listing.category}</Text></View>
        </View>

        {!!listing.description && <Text style={styles.description}>{listing.description}</Text>}

        {isOutfit && (listing.pieces?.length ?? 0) > 0 && (
          <View style={styles.piecesCard}>
            <Text style={styles.piecesTitle}>In this outfit · {listing.pieces!.length} pieces</Text>
            <Text style={styles.piecesNote}>
              {listing.allow_separate_sale ? 'Get the whole look here, or tap a piece to buy it on its own.' : 'Sold together as one complete look.'}
            </Text>
            {listing.pieces!.map((piece) => {
              const pieceListing = piece.piece_listing_id ? listings.find((item) => item.id === piece.piece_listing_id) : null;
              return (
                <TouchableOpacity
                  key={`${piece.outfit_listing_id}-${piece.position}`}
                  style={styles.pieceRow}
                  disabled={!pieceListing}
                  onPress={() => pieceListing && navigation.push('ProductDetail', { listingId: pieceListing.id })}
                >
                  <View style={styles.pieceImageFrame}>
                    {piece.image_url ? <Image source={{ uri: piece.image_url }} style={styles.image} resizeMode="contain" /> : <Ionicons name="shirt-outline" size={22} color={Colors.mediumGray} />}
                  </View>
                  <View style={styles.pieceCopy}>
                    <Text style={styles.pieceName} numberOfLines={1}>{piece.title}</Text>
                    <Text style={styles.pieceMeta} numberOfLines={1}>{[piece.brand, piece.category, piece.size ? `Size ${piece.size}` : null].filter(Boolean).join(' · ')}</Text>
                  </View>
                  {pieceListing && (
                    <>
                      <Text style={styles.piecePrice}>{formatUsd(pieceListing.price_cents)}</Text>
                      <Ionicons name="chevron-forward" size={17} color={Colors.textSecondary} />
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {parentOutfit && (
          <TouchableOpacity style={styles.parentOutfit} onPress={() => navigation.push('ProductDetail', { listingId: parentOutfit.id })}>
            <Ionicons name="albums-outline" size={22} color={Colors.primary} />
            <View style={styles.pieceCopy}>
              <Text style={styles.pieceName}>Part of the outfit "{parentOutfit.title}"</Text>
              <Text style={styles.pieceMeta}>Get the whole look for {formatUsd(parentOutfit.price_cents)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}

        <View style={styles.sellerCard}>
          <View style={styles.avatar}>
            {listing.seller?.avatar_url ? <Image source={{ uri: listing.seller.avatar_url }} style={styles.avatarImage} /> : <Ionicons name="person" size={21} color={Colors.white} />}
          </View>
          <View style={styles.sellerCopy}>
            <Text style={styles.sellerLabel}>SOLD BY</Text>
            <Text style={styles.sellerName}>{sellerName}</Text>
          </View>
          <Ionicons name="shield-checkmark-outline" size={24} color={Colors.green} />
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Item</Text><Text style={styles.summaryValue}>{formatUsd(listing.price_cents)}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Shipping · {PACKAGE_SIZE_LABELS[listing.package_size ?? 'medium']} package</Text><Text style={styles.summaryValue}>{formatUsd(listing.shipping_price_cents)}</Text></View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}><Text style={styles.totalLabel}>Total before tax</Text><Text style={styles.totalValue}>{formatUsd(total)}</Text></View>
        </View>

        <View style={styles.protectionCard}>
          <Ionicons name="lock-closed-outline" size={23} color={Colors.primary} />
          <View style={styles.protectionCopy}>
            <Text style={styles.protectionTitle}>Secure ModTok checkout</Text>
            <Text style={styles.protectionText}>Pay securely in USD. The seller gets a prepaid, tracked label after payment, and you can follow the package in My Purchases.</Text>
          </View>
        </View>
        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={styles.footer}>
        {!isOwner && available ? (
          <TouchableOpacity style={styles.cancelButton} onPress={onAddToBundle}>
            <Text style={styles.cancelButtonText}>{inBundle ? 'In bundle ✓' : 'Add to bundle'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.buyButton, (!available || isOwner) && styles.disabledButton]}
          disabled={!available || isOwner}
          onPress={() => navigation.navigate('Checkout', { listingIds: [listing.id] })}
        >
          <Text style={styles.buyButtonText}>{isOwner ? 'Your listing' : available ? `Buy · ${formatUsd(total)}` : 'Unavailable'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, padding: Spacing.xl },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800' },
  content: { padding: Spacing.base },
  imageFrame: { width: '100%', aspectRatio: 0.78, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.cardBorder, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  titleRow: { marginTop: Spacing.lg, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  titleCopy: { flex: 1 },
  title: { color: Colors.textPrimary, fontSize: Typography.fontSize.xl, fontWeight: '800', lineHeight: 30 },
  subtitle: { marginTop: 4, color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  price: { color: Colors.primaryDark, fontSize: Typography.fontSize.xl, fontWeight: '800' },
  pillRow: { marginTop: Spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  pill: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: BorderRadius.pill, backgroundColor: Colors.black },
  pillText: { color: Colors.white, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  description: { marginTop: Spacing.lg, color: Colors.textPrimary, fontSize: Typography.fontSize.base, lineHeight: 23 },
  sellerCard: { marginTop: Spacing.lg, flexDirection: 'row', alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.black, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  sellerCopy: { flex: 1, marginLeft: Spacing.md },
  sellerLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  sellerName: { marginTop: 2, color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '800' },
  piecesCard: { marginTop: Spacing.lg, padding: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder },
  piecesTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '800' },
  piecesNote: { marginTop: 3, marginBottom: Spacing.sm, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, lineHeight: 17 },
  pieceRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xs, borderTopWidth: 1, borderTopColor: Colors.cardBorder },
  pieceImageFrame: { width: 46, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.sm, backgroundColor: Colors.background, overflow: 'hidden' },
  pieceCopy: { flex: 1, minWidth: 0 },
  pieceName: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  pieceMeta: { marginTop: 2, color: Colors.textSecondary, fontSize: Typography.fontSize.xs },
  piecePrice: { color: Colors.primaryDark, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  parentOutfit: { marginTop: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: '#F9E5E1' },
  summaryCard: { marginTop: Spacing.md, padding: Spacing.base, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder, gap: Spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  summaryValue: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  divider: { height: 1, backgroundColor: Colors.cardBorder },
  totalLabel: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '800' },
  totalValue: { color: Colors.textPrimary, fontSize: Typography.fontSize.md, fontWeight: '800' },
  protectionCard: { marginTop: Spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, padding: Spacing.base, borderRadius: BorderRadius.lg, backgroundColor: '#F9E5E1' },
  protectionCopy: { flex: 1 },
  protectionTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  protectionText: { marginTop: 3, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, lineHeight: 18 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: Spacing.base, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.cardBorder },
  cancelButton: { flex: 0.8, minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: Colors.cardBorder },
  cancelButtonText: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700' },
  buyButton: { flex: 1.5, minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.pill, backgroundColor: Colors.primary },
  disabledButton: { backgroundColor: Colors.mediumGray },
  buyButtonText: { color: Colors.white, fontSize: Typography.fontSize.base, fontWeight: '800' },
  unavailableTitle: { marginTop: Spacing.md, color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800' },
  secondaryButton: { marginTop: Spacing.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.primary },
  secondaryButtonText: { color: Colors.primary, fontWeight: '800' },
});
