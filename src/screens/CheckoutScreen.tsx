import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { initPaymentSheet, initStripe, presentPaymentSheet } from '../lib/stripeNative';
import { functionError, useMarketplace } from '../context/MarketplaceContext';
import { supabase } from '../lib/supabase';
import {
  BundleDiscount,
  PACKAGE_SIZE_LABELS,
  ShippingAddress,
  BUYER_PROTECTION_INFO,
  bundleDiscountBps,
  bundlePackageSize,
  buyerProtectionCents,
  formatUsd,
} from '../types/marketplace';
import { BorderRadius, Colors, Spacing, Typography } from '../theme';

function CheckoutField({ label, value, onChangeText, placeholder, half = false, keyboardType }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  half?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad';
}) {
  return (
    <View style={[styles.fieldWrap, half && styles.halfField]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.mediumGray}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={label === 'Email' ? 'none' : 'words'}
        returnKeyType="next"
      />
    </View>
  );
}

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const requestedIds: string[] = route.params?.listingIds ?? (route.params?.listingId ? [route.params.listingId] : []);
  const {
    listings,
    runOrderAction,
    refreshOrders,
    refreshListings,
    shippingRate,
    getBundleDiscount,
    bundle,
    removeFromBundle,
    clearBundle,
  } = useMarketplace();
  // A bundle checkout follows the live bundle, so removing an item here updates it.
  const [isBundleCheckout] = useState(() => Boolean(
    bundle
    && requestedIds.length === bundle.listingIds.length
    && requestedIds.every((id) => bundle.listingIds.includes(id)),
  ));
  const listingIds = isBundleCheckout ? bundle?.listingIds ?? [] : requestedIds;
  const liveItems = useMemo(
    () => listingIds.map((id) => listings.find((item) => item.id === id)).filter(Boolean) as typeof listings,
    [listingIds, listings],
  );
  // Once paid, keep showing what was bought while the lists refresh behind the alert.
  const [paidItems, setPaidItems] = useState<typeof listings | null>(null);
  const items = paidItems ?? liveItems;
  const listing = items[0];
  const [discount, setDiscount] = useState<BundleDiscount | null>(null);
  const [processing, setProcessing] = useState(false);
  const [name, setName] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (items.length > 1 && listing?.seller_id) {
      getBundleDiscount(listing.seller_id).then(setDiscount);
    } else {
      setDiscount(null);
    }
  }, [getBundleDiscount, items.length, listing?.seller_id]);

  // Same math as the server; the server's numbers are what Stripe charges.
  const quote = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.price_cents, 0);
    const discountBps = bundleDiscountBps(discount, items.length);
    const discountCents = Math.round((subtotal * discountBps) / 10000);
    const size = items.length > 1 ? bundlePackageSize(items) : listing?.package_size ?? 'medium';
    const shipping = items.length > 1 ? shippingRate(size).price_cents : listing?.shipping_price_cents ?? 0;
    const protection = buyerProtectionCents(subtotal - discountCents);
    return { subtotal, discountBps, discountCents, size, shipping, protection, total: subtotal - discountCents + shipping + protection };
  }, [discount, items, listing, shippingRate]);
  const total = quote.total;
  const sellerName = listing?.seller?.display_name || listing?.seller?.username || 'this seller';

  const validate = (): ShippingAddress | null => {
    if (![name, line1, city, state, postalCode].every((value) => value.trim())) {
      Alert.alert('Complete shipping address', 'Name, address, city, state, and ZIP code are required.');
      return null;
    }
    return {
      name: name.trim(),
      line1: line1.trim(),
      line2: line2.trim() || undefined,
      city: city.trim(),
      state: state.trim().toUpperCase(),
      postal_code: postalCode.trim(),
      country: 'US',
      phone: phone.trim() || undefined,
    };
  };

  const pay = async () => {
    if (!listing) return;
    if (Platform.OS === 'web') {
      Alert.alert('Use ModTok on your phone', 'Secure card checkout opens in the iOS or Android app.');
      return;
    }
    const shippingAddress = validate();
    if (!shippingAddress) return;

    setProcessing(true);
    let orderId: string | null = null;
    try {
      const { data, error } = await supabase.functions.invoke('marketplace-checkout', {
        body: { listing_ids: items.map((item) => item.id), shipping_address: shippingAddress },
      });
      if (error) throw await functionError(error, 'Could not start checkout.');
      if (!data?.payment_intent_client_secret || !data?.publishable_key || !data?.order_id) {
        throw new Error('Checkout is not fully configured yet.');
      }
      orderId = data.order_id;

      await initStripe({
        publishableKey: data.publishable_key,
        merchantIdentifier: 'merchant.com.modtok.app', // Apple Pay
        urlScheme: 'modtok',
      });

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'ModTok',
        paymentIntentClientSecret: data.payment_intent_client_secret,
        returnURL: 'modtok://stripe-redirect',
        allowsDelayedPaymentMethods: false,
        // Apple Pay shows at the top of the payment sheet on iPhones that have it set up.
        applePay: { merchantCountryCode: 'US' },
        defaultBillingDetails: { name: shippingAddress.name, phone: shippingAddress.phone },
        style: 'automatic',
      });
      if (initError) throw new Error(initError.message);

      const { error: paymentError } = await presentPaymentSheet();
      if (paymentError) {
        if (paymentError.code === 'Canceled') {
          if (orderId) await runOrderAction({ action: 'cancel_checkout', order_id: orderId });
          return;
        }
        throw new Error(paymentError.message);
      }

      // Refresh listings too, so the item no longer shows as for sale when going back.
      setPaidItems(items);
      if (isBundleCheckout) clearBundle();
      await Promise.all([refreshOrders(), refreshListings()]);
      Alert.alert('Payment received', 'Your purchase is confirmed. You can follow shipping in My Purchases.', [
        { text: 'View purchases', onPress: () => navigation.replace('Orders', { initialTab: 'Purchases' }) },
      ]);
    } catch (error: any) {
      if (orderId) {
        try {
          await runOrderAction({ action: 'cancel_checkout', order_id: orderId });
        } catch {
          // A successful payment cannot be canceled here; the webhook will confirm it.
        }
      }
      Alert.alert('Checkout could not continue', error?.message ?? 'Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (!listing || (!paidItems && items.length !== listingIds.length)) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>{listing ? 'Something in this order is no longer available.' : 'This item is no longer available.'}</Text>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}><Text style={styles.cancelText}>Go back</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={processing}>
          <Ionicons name="chevron-back" size={25} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secure checkout</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.totalCard}>
            <Text style={styles.totalEyebrow}>PAYMENT TOTAL</Text>
            <Text style={styles.total}>{formatUsd(total)}</Text>
            <Text style={styles.totalNote}>USD · {items.length > 1 ? `${items.length} items from ${sellerName}` : listing.title}</Text>
          </View>

          <View style={styles.itemsCard}>
            {items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemImageFrame}>
                  {item.image_urls?.[0] ? <Image source={{ uri: item.image_urls[0] }} style={styles.itemImage} resizeMode="contain" /> : <Ionicons name="shirt-outline" size={20} color={Colors.mediumGray} />}
                </View>
                <View style={styles.itemCopy}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.itemMeta} numberOfLines={1}>
                    {item.listing_kind === 'outfit' ? `Outfit · ${item.pieces?.length ?? 0} pieces` : [item.brand, item.size ? `Size ${item.size}` : null].filter(Boolean).join(' · ') || item.category}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>{formatUsd(item.price_cents)}</Text>
                {isBundleCheckout && (
                  <TouchableOpacity style={styles.removeButton} onPress={() => removeFromBundle(item.id)} disabled={processing} accessibilityLabel={`Remove ${item.title}`}>
                    <Ionicons name="close" size={16} color={Colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Items</Text><Text style={styles.summaryValue}>{formatUsd(quote.subtotal)}</Text></View>
            {quote.discountCents > 0 && (
              <View style={styles.summaryRow}><Text style={styles.discountLabel}>Bundle discount ({Math.round(quote.discountBps / 100)}%)</Text><Text style={styles.discountLabel}>−{formatUsd(quote.discountCents)}</Text></View>
            )}
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Shipping · {PACKAGE_SIZE_LABELS[quote.size]} package, tracked</Text><Text style={styles.summaryValue}>{formatUsd(quote.shipping)}</Text></View>
            <TouchableOpacity style={styles.summaryRow} onPress={() => Alert.alert('Buyer Protection', BUYER_PROTECTION_INFO)} accessibilityRole="button" accessibilityLabel="About Buyer Protection">
              <View style={styles.protectionLabel}>
                <Ionicons name="shield-checkmark-outline" size={15} color={Colors.green} />
                <Text style={styles.summaryLabel}>Buyer Protection</Text>
                <Ionicons name="information-circle-outline" size={15} color={Colors.textSecondary} />
              </View>
              <Text style={styles.summaryValue}>{formatUsd(quote.protection)}</Text>
            </TouchableOpacity>
          </View>

          {isBundleCheckout && (
            <TouchableOpacity style={styles.addMore} onPress={() => navigation.navigate('Marketplace', { sellerId: listing.seller_id })} disabled={processing}>
              <Ionicons name="add-circle-outline" size={18} color={Colors.primaryDark} />
              <Text style={styles.addMoreText}>Add more from {sellerName} · one shipping</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.sectionTitle}>Shipping address</Text>
          <Text style={styles.sectionNote}>Available for United States delivery in this release.</Text>

          <CheckoutField label="Full name" value={name} onChangeText={setName} placeholder="Name on the delivery" />
          <CheckoutField label="Street address" value={line1} onChangeText={setLine1} placeholder="123 Main Street" />
          <CheckoutField label="Apartment, suite (optional)" value={line2} onChangeText={setLine2} placeholder="Apt 4B" />
          <CheckoutField label="City" value={city} onChangeText={setCity} placeholder="City" />
          <View style={styles.fieldRow}>
            <CheckoutField label="State" value={state} onChangeText={setState} placeholder="NY" half />
            <CheckoutField label="ZIP code" value={postalCode} onChangeText={setPostalCode} placeholder="10001" half keyboardType="number-pad" />
          </View>
          <CheckoutField label="Phone (optional)" value={phone} onChangeText={setPhone} placeholder="For delivery updates" keyboardType="phone-pad" />

          <View style={styles.paymentCard}>
            <Ionicons name="card-outline" size={24} color={Colors.primary} />
            <View style={styles.paymentCopy}>
              <Text style={styles.paymentTitle}>Apple Pay or card comes next</Text>
              <Text style={styles.paymentText}>Pay with Apple Pay or a card on Stripe’s secure payment sheet. ModTok never stores your card number.</Text>
            </View>
          </View>
          <View style={{ height: 118 }} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()} disabled={processing}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.payButton, processing && styles.disabled]} onPress={pay} disabled={processing}>
            {processing ? <ActivityIndicator color={Colors.white} /> : <Ionicons name="lock-closed" size={17} color={Colors.white} />}
            <Text style={styles.payText}>{processing ? 'Opening payment...' : `Pay ${formatUsd(total)}`}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, backgroundColor: Colors.background },
  keyboard: { flex: 1 },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800' },
  content: { padding: Spacing.base },
  totalCard: { alignItems: 'center', padding: Spacing.xl, backgroundColor: Colors.black, borderRadius: BorderRadius.xl },
  totalEyebrow: { color: Colors.primaryLight, fontSize: Typography.fontSize.xs, fontWeight: '800', letterSpacing: 1 },
  total: { marginTop: 4, color: Colors.white, fontSize: 38, fontWeight: '800' },
  totalNote: { marginTop: 4, color: Colors.lightGray, fontSize: Typography.fontSize.sm, textAlign: 'center' },
  itemsCard: { marginTop: Spacing.md, padding: Spacing.md, gap: Spacing.sm, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  itemImageFrame: { width: 44, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.sm, backgroundColor: Colors.background, overflow: 'hidden' },
  itemImage: { width: '100%', height: '100%' },
  itemCopy: { flex: 1, minWidth: 0 },
  itemTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  itemMeta: { marginTop: 2, color: Colors.textSecondary, fontSize: Typography.fontSize.xs },
  itemPrice: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  removeButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: Colors.cardBorder },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  summaryLabel: { flexShrink: 1, color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  protectionLabel: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  summaryValue: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  discountLabel: { color: Colors.green, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  addMore: { marginTop: Spacing.sm, alignSelf: 'center', minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md },
  addMoreText: { color: Colors.primaryDark, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  sectionTitle: { marginTop: Spacing.xl, color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800' },
  sectionNote: { marginTop: 4, marginBottom: Spacing.base, color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  fieldWrap: { marginBottom: Spacing.md },
  halfField: { flex: 1 },
  fieldRow: { flexDirection: 'row', gap: Spacing.sm },
  fieldLabel: { marginBottom: 6, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '800', letterSpacing: 0.4 },
  input: { minHeight: 50, paddingHorizontal: Spacing.md, color: Colors.textPrimary, fontSize: Typography.fontSize.base, backgroundColor: Colors.white, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder },
  paymentCard: { marginTop: Spacing.sm, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, padding: Spacing.base, backgroundColor: '#F9E5E1', borderRadius: BorderRadius.lg },
  paymentCopy: { flex: 1 },
  paymentTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  paymentText: { marginTop: 3, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, lineHeight: 18 },
  footer: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: Spacing.base, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.cardBorder },
  cancelButton: { flex: 0.8, minHeight: 54, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: Colors.cardBorder },
  cancelText: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700' },
  payButton: { flex: 1.55, minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.primary },
  disabled: { backgroundColor: Colors.mediumGray },
  payText: { color: Colors.white, fontSize: Typography.fontSize.base, fontWeight: '800' },
  title: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800', textAlign: 'center' },
});
