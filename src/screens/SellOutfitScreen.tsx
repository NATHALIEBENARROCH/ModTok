import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ClothingItem, useCloset } from '../context/ClosetContext';
import { Outfit, useOutfit } from '../context/OutfitContext';
import { useMarketplace } from '../context/MarketplaceContext';
import PackageSizePicker from '../components/PackageSizePicker';
import {
  CONDITION_LABELS,
  ListingCondition,
  MarketplaceListing,
  PackageSize,
  defaultPackageSize,
  formatUsd,
} from '../types/marketplace';
import { BorderRadius, Colors, Spacing, Typography } from '../theme';

function itemImage(item: ClothingItem) {
  return item.image_url ?? item.image;
}

function toCents(text: string): number {
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) ? Math.round(value * 100) : NaN;
}

type PieceState = {
  item: ClothingItem;
  existing: MarketplaceListing | null; // already listed on its own
  blockedReason: string | null;
  price: string;
  packageSize: PackageSize;
};

export default function SellOutfitScreen() {
  const navigation = useNavigation<any>();
  const { items } = useCloset();
  const { outfits } = useOutfit();
  const { myListings, sellerStatus, shipFrom, createOutfitListing } = useMarketplace();
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [pieces, setPieces] = useState<PieceState[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<ListingCondition>('good');
  const [packageSize, setPackageSize] = useState<PackageSize>('large');
  const [allowSeparate, setAllowSeparate] = useState(false);
  const [saving, setSaving] = useState(false);

  const sellerReady = sellerStatus.details_submitted && sellerStatus.charges_enabled && sellerStatus.payouts_enabled;
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const openOutfitListings = useMemo(
    () => myListings.filter((listing) => listing.listing_kind === 'outfit' && ['draft', 'active', 'reserved'].includes(listing.status)),
    [myListings],
  );
  const listedOutfitIds = useMemo(() => new Set(openOutfitListings.map((listing) => listing.outfit_id)), [openOutfitListings]);

  const sellableOutfits = useMemo(
    () => outfits.filter((candidate) => candidate.item_ids.filter((id) => itemsById.has(id)).length >= 2),
    [itemsById, outfits],
  );

  const chooseOutfit = (chosen: Outfit) => {
    if (listedOutfitIds.has(chosen.id)) {
      Alert.alert('Already for sale', 'This outfit is already listed. You can find it on the Sell page.');
      return;
    }
    const piecesInOtherOutfits = new Set(
      openOutfitListings.flatMap((listing) => (listing.pieces ?? []).map((piece) => piece.closet_item_id)),
    );
    const next: PieceState[] = chosen.item_ids
      .map((id) => itemsById.get(id))
      .filter((item): item is ClothingItem => Boolean(item))
      .map((item) => {
        const existing = myListings.find(
          (listing) => listing.closet_item_id === item.id && ['draft', 'active', 'reserved'].includes(listing.status),
        ) ?? null;
        let blockedReason: string | null = null;
        if (!itemImage(item) || !item.image_url) blockedReason = 'Needs a saved photo';
        else if (piecesInOtherOutfits.has(item.id)) blockedReason = 'In another outfit listing';
        else if (existing?.status === 'reserved') blockedReason = 'In a checkout right now';
        return {
          item,
          existing,
          blockedReason,
          price: existing ? (existing.price_cents / 100).toFixed(2) : item.salePrice ? String(item.salePrice) : '',
          packageSize: existing?.package_size ?? defaultPackageSize(item.category),
        };
      });
    setOutfit(chosen);
    setPieces(next);
    setTitle(chosen.name);
    setDescription('');
    setAllowSeparate(next.some((piece) => piece.existing));
    const separateTotal = next.reduce((sum, piece) => sum + (piece.existing?.price_cents ?? 0), 0);
    setPrice(separateTotal > 0 ? (Math.round(separateTotal * 0.85) / 100).toFixed(2) : '');
  };

  const updatePiece = (itemId: string, changes: Partial<PieceState>) => {
    setPieces((current) => current.map((piece) => (piece.item.id === itemId ? { ...piece, ...changes } : piece)));
  };

  const separateTotalCents = pieces.reduce((sum, piece) => {
    const cents = piece.existing ? piece.existing.price_cents : toCents(piece.price);
    return sum + (Number.isFinite(cents) ? cents : 0);
  }, 0);

  const publish = async () => {
    if (!outfit) return;
    if (!sellerReady) {
      Alert.alert('Complete seller setup', 'Connect your Stripe payout account on the Sell page first.');
      return;
    }
    if (!shipFrom) {
      Alert.alert('Add your ship-from address', 'ModTok prints it on the prepaid shipping label.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Add address', onPress: () => navigation.navigate('SellerShipping') },
      ]);
      return;
    }
    const blocked = pieces.find((piece) => piece.blockedReason);
    if (blocked) {
      Alert.alert('One piece cannot be sold yet', `${blocked.item.name}: ${blocked.blockedReason}.`);
      return;
    }
    if (pieces.length < 2) {
      Alert.alert('Add more pieces', 'An outfit needs at least 2 pieces from your wardrobe.');
      return;
    }
    const outfitCents = toCents(price);
    if (!Number.isFinite(outfitCents) || outfitCents < 100) {
      Alert.alert('Add a price', 'Enter an outfit price of at least $1.00 USD.');
      return;
    }
    if (!allowSeparate) {
      const listedAlone = pieces.find((piece) => piece.existing);
      if (listedAlone) {
        Alert.alert(
          'A piece is already listed on its own',
          `${listedAlone.item.name} is for sale by itself. Turn on "Pieces can also sell separately", or unlist it first.`,
        );
        return;
      }
    } else {
      const missing = pieces.find((piece) => !piece.existing && !(toCents(piece.price) >= 100));
      if (missing) {
        Alert.alert('Add a price for each piece', `Enter a price of at least $1.00 for ${missing.item.name}.`);
        return;
      }
    }

    setSaving(true);
    try {
      await createOutfitListing({
        outfit_id: outfit.id,
        title: title.trim() || outfit.name,
        description: description.trim(),
        condition,
        package_size: packageSize,
        price_cents: outfitCents,
        allow_separate_sale: allowSeparate,
        pieces: pieces.map((piece) => ({
          closet_item_id: piece.item.id,
          ...(allowSeparate && !piece.existing
            ? { price_cents: toCents(piece.price), package_size: piece.packageSize, condition }
            : {}),
        })),
      });
      Alert.alert(
        'Outfit is live',
        allowSeparate
          ? 'Buyers can get the whole look, or pick single pieces. When one sells, the other comes off the marketplace automatically.'
          : 'Buyers can get the whole look in one order.',
        [{ text: 'Done', onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      Alert.alert('Could not publish outfit', error?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (outfit) {
      setOutfit(null);
      return;
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack} disabled={saving}>
          <Ionicons name="chevron-back" size={25} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{outfit ? 'Sell this outfit' : 'Choose an outfit'}</Text>
        <View style={styles.backButton} />
      </View>

      {!outfit && (
        <FlatList
          data={sellableOutfits}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.intro}>
              <Text style={styles.introTitle}>Sell a whole look</Text>
              <Text style={styles.introText}>Pick one of your saved outfits. You decide whether the pieces can also be bought on their own.</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="albums-outline" size={46} color={Colors.mediumGray} />
              <Text style={styles.emptyTitle}>No outfits to sell yet</Text>
              <Text style={styles.emptyText}>Save an outfit with at least 2 wardrobe pieces in the Style tab, then come back.</Text>
            </View>
          }
          renderItem={({ item: candidate }) => {
            const outfitItems = candidate.item_ids.map((id) => itemsById.get(id)).filter(Boolean) as ClothingItem[];
            const listed = listedOutfitIds.has(candidate.id);
            return (
              <TouchableOpacity style={[styles.outfitRow, listed && styles.outfitRowListed]} onPress={() => chooseOutfit(candidate)} activeOpacity={0.82}>
                <View style={styles.thumbStrip}>
                  {(candidate.look_image_url ? [candidate.look_image_url] : outfitItems.slice(0, 3).map(itemImage))
                    .filter(Boolean)
                    .map((uri, index) => (
                      <Image key={`${uri}-${index}`} source={{ uri: uri! }} style={styles.thumb} resizeMode="contain" />
                    ))}
                </View>
                <View style={styles.outfitCopy}>
                  <Text style={styles.outfitName} numberOfLines={1}>{candidate.name}</Text>
                  <Text style={styles.outfitMeta}>{listed ? 'Already for sale' : `${outfitItems.length} pieces`}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          ListFooterComponent={<View style={{ height: 110 }} />}
        />
      )}

      {outfit && (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>TITLE</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Outfit name" placeholderTextColor={Colors.mediumGray} maxLength={120} />

            <Text style={styles.fieldLabel}>PIECES ({pieces.length})</Text>
            <View style={styles.pieceCard}>
              {pieces.map((piece, index) => (
                <View key={piece.item.id} style={[styles.pieceRow, index > 0 && styles.pieceDivider]}>
                  <Image source={{ uri: itemImage(piece.item) }} style={styles.pieceImage} resizeMode="contain" />
                  <View style={styles.pieceCopy}>
                    <Text style={styles.pieceName} numberOfLines={1}>{piece.item.name}</Text>
                    <Text style={styles.pieceMeta} numberOfLines={1}>
                      {piece.item.category}{piece.item.size ? ` · ${piece.item.size}` : ''}
                    </Text>
                    {piece.blockedReason ? (
                      <Text style={styles.pieceBlocked}>{piece.blockedReason}</Text>
                    ) : piece.existing ? (
                      <Text style={styles.pieceListed}>Listed on its own · {formatUsd(piece.existing.price_cents)}</Text>
                    ) : null}
                  </View>
                  {allowSeparate && !piece.existing && !piece.blockedReason && (
                    <View style={styles.piecePrice}>
                      <Text style={styles.piecePriceSymbol}>$</Text>
                      <TextInput
                        style={styles.piecePriceInput}
                        value={piece.price}
                        onChangeText={(value) => updatePiece(piece.item.id, { price: value })}
                        placeholder="0.00"
                        placeholderTextColor={Colors.mediumGray}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.toggleCard}>
              <View style={styles.flex}>
                <Text style={styles.toggleTitle}>Pieces can also sell separately</Text>
                <Text style={styles.toggleText}>
                  {allowSeparate
                    ? 'Each piece gets its own listing too. Whichever sells first, the other comes off the marketplace.'
                    : 'Buyers can only buy the complete outfit.'}
                </Text>
              </View>
              <Switch value={allowSeparate} onValueChange={setAllowSeparate} trackColor={{ true: Colors.primary, false: Colors.lightGray }} />
            </View>

            <Text style={styles.fieldLabel}>OUTFIT PRICE (USD)</Text>
            <View style={styles.priceField}>
              <Text style={styles.priceSymbol}>$</Text>
              <TextInput style={styles.priceInput} value={price} onChangeText={setPrice} placeholder="0.00" placeholderTextColor={Colors.mediumGray} keyboardType="decimal-pad" />
            </View>
            {allowSeparate && separateTotalCents > 0 && (
              <Text style={styles.hint}>Pieces bought one by one add up to {formatUsd(separateTotalCents)}. A lower outfit price makes the whole look tempting.</Text>
            )}

            <Text style={styles.fieldLabel}>CONDITION</Text>
            <View style={styles.conditionGrid}>
              {(Object.keys(CONDITION_LABELS) as ListingCondition[]).map((value) => (
                <TouchableOpacity key={value} style={[styles.conditionButton, condition === value && styles.conditionButtonActive]} onPress={() => setCondition(value)}>
                  <Text style={[styles.conditionText, condition === value && styles.conditionTextActive]}>{CONDITION_LABELS[value]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>DESCRIPTION</Text>
            <TextInput
              style={[styles.input, styles.description]}
              multiline
              value={description}
              onChangeText={setDescription}
              placeholder="How you styled it, fit, occasions, anything the buyer should know."
              placeholderTextColor={Colors.mediumGray}
              textAlignVertical="top"
              maxLength={2000}
            />

            <Text style={styles.fieldLabel}>PACKAGE SIZE FOR THE WHOLE OUTFIT</Text>
            <PackageSizePicker value={packageSize} onChange={setPackageSize} />
            {allowSeparate && (
              <Text style={styles.hint}>Single pieces get a size from their category. You can change those later from each listing.</Text>
            )}
            <Text style={styles.hint}>The buyer pays shipping and you get a prepaid label when it sells. No seller fees: you keep 100% of your price.</Text>
            <View style={{ height: 24 }} />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={goBack} disabled={saving}>
              <Text style={styles.cancelText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={publish} disabled={saving}>
              <Ionicons name="checkmark" size={19} color={Colors.white} />
              <Text style={styles.saveText}>{saving ? 'Publishing...' : 'List outfit'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800' },
  list: { paddingHorizontal: Spacing.base },
  intro: { paddingTop: Spacing.lg, paddingBottom: Spacing.base },
  introTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.xl, fontWeight: '800', textAlign: 'center' },
  introText: { marginTop: Spacing.xs, color: Colors.textSecondary, fontSize: Typography.fontSize.sm, lineHeight: 20, textAlign: 'center' },
  empty: { alignItems: 'center', paddingTop: Spacing.xxl, paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  emptyTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800' },
  emptyText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, lineHeight: 20, textAlign: 'center' },
  outfitRow: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.sm, backgroundColor: Colors.white, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder },
  outfitRowListed: { opacity: 0.55 },
  thumbStrip: { flexDirection: 'row', gap: 2 },
  thumb: { width: 44, height: 70, borderRadius: BorderRadius.sm, backgroundColor: '#FFFDF9' },
  outfitCopy: { flex: 1, minWidth: 0 },
  outfitName: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '800' },
  outfitMeta: { marginTop: 3, color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  content: { padding: Spacing.base },
  fieldLabel: { marginTop: Spacing.lg, marginBottom: Spacing.sm, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '800', letterSpacing: 0.6 },
  input: { minHeight: 52, paddingHorizontal: Spacing.md, color: Colors.textPrimary, fontSize: Typography.fontSize.base, backgroundColor: Colors.white, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder },
  description: { minHeight: 100, paddingTop: Spacing.md, paddingBottom: Spacing.md },
  pieceCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder, paddingHorizontal: Spacing.md },
  pieceRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  pieceDivider: { borderTopWidth: 1, borderTopColor: Colors.cardBorder },
  pieceImage: { width: 48, height: 60, borderRadius: BorderRadius.sm, backgroundColor: '#FFFDF9' },
  pieceCopy: { flex: 1, minWidth: 0 },
  pieceName: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  pieceMeta: { marginTop: 2, color: Colors.textSecondary, fontSize: Typography.fontSize.xs },
  pieceListed: { marginTop: 3, color: Colors.green, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  pieceBlocked: { marginTop: 3, color: Colors.primaryDark, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  piecePrice: { width: 92, minHeight: 42, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder },
  piecePriceSymbol: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '800', marginRight: 2 },
  piecePriceInput: { flex: 1, color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '700', paddingVertical: 6 },
  toggleCard: { marginTop: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: '#F9E5E1' },
  toggleTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  toggleText: { marginTop: 3, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, lineHeight: 17 },
  priceField: { flexDirection: 'row', alignItems: 'center', minHeight: 55, paddingHorizontal: Spacing.base, backgroundColor: Colors.white, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder },
  priceSymbol: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800', marginRight: Spacing.xs },
  priceInput: { flex: 1, color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700', paddingVertical: Spacing.sm },
  hint: { marginTop: Spacing.sm, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, lineHeight: 18 },
  conditionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  conditionButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: Spacing.md, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.white },
  conditionButtonActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  conditionText: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  conditionTextActive: { color: Colors.white },
  footer: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: Spacing.base, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.cardBorder },
  cancelButton: { flex: 0.85, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: Colors.cardBorder },
  cancelText: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700' },
  saveButton: { flex: 1.5, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, borderRadius: BorderRadius.pill, backgroundColor: Colors.primary },
  disabled: { backgroundColor: Colors.mediumGray },
  saveText: { color: Colors.white, fontSize: Typography.fontSize.base, fontWeight: '800' },
});
