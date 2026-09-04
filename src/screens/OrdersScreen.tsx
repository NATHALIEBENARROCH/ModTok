import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useMarketplace } from '../context/MarketplaceContext';
import { MarketplaceOrder, OrderStatus, formatUsd } from '../types/marketplace';
import { BorderRadius, Colors, Spacing, Typography } from '../theme';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Awaiting payment',
  paid: 'Paid',
  processing: 'Preparing to ship',
  shipped: 'Shipped',
  delivered: 'Delivered',
  canceled: 'Canceled',
  refund_pending: 'Refund processing',
  partially_refunded: 'Partially refunded',
  refunded: 'Refunded',
  disputed: 'Under review',
};

type OrdersTab = 'Purchases' | 'Sales';

function OrderCard({ order, tab, onShip, onAction }: {
  order: MarketplaceOrder;
  tab: OrdersTab;
  onShip: () => void;
  onAction: (action: 'mark_processing' | 'confirm_delivered' | 'refund') => void;
}) {
  const image = order.listing_snapshot.image_urls?.[0];
  const title = order.listing_snapshot.title || 'Marketplace item';
  const otherParty = tab === 'Purchases'
    ? order.seller?.display_name || order.seller?.username || 'Seller'
    : order.buyer?.display_name || order.buyer?.username || 'Buyer';

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderTop}>
        <View style={styles.orderImageFrame}>
          {image ? <Image source={{ uri: image }} style={styles.orderImage} resizeMode="contain" /> : <Ionicons name="shirt-outline" size={31} color={Colors.mediumGray} />}
        </View>
        <View style={styles.orderCopy}>
          <Text style={styles.orderTitle} numberOfLines={2}>{title}</Text>
          <Text style={styles.orderParty}>{tab === 'Purchases' ? 'Seller' : 'Buyer'}: {otherParty}</Text>
          <Text style={styles.orderPrice}>{formatUsd(order.total_amount_cents)}</Text>
        </View>
        <View style={styles.statusPill}><Text style={styles.statusText}>{STATUS_LABELS[order.status]}</Text></View>
      </View>

      {tab === 'Sales' && ['paid', 'processing', 'shipped'].includes(order.status) && (
        <View style={styles.addressBox}>
          <Text style={styles.addressLabel}>SHIP TO</Text>
          <Text style={styles.addressText}>{order.shipping_address.name}</Text>
          <Text style={styles.addressText}>{order.shipping_address.line1}{order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ''}</Text>
          <Text style={styles.addressText}>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</Text>
        </View>
      )}

      {order.tracking_number ? (
        <TouchableOpacity style={styles.trackingRow} disabled={!order.tracking_url} onPress={() => order.tracking_url && Linking.openURL(order.tracking_url)}>
          <Ionicons name="navigate-outline" size={17} color={Colors.primary} />
          <Text style={styles.trackingText}>{order.tracking_carrier}: {order.tracking_number}</Text>
          {!!order.tracking_url && <Ionicons name="open-outline" size={15} color={Colors.primary} />}
        </TouchableOpacity>
      ) : null}

      <View style={styles.actionRow}>
        {tab === 'Sales' && order.status === 'paid' && (
          <TouchableOpacity style={styles.secondaryAction} onPress={() => onAction('mark_processing')}><Text style={styles.secondaryActionText}>Start preparing</Text></TouchableOpacity>
        )}
        {tab === 'Sales' && ['paid', 'processing'].includes(order.status) && (
          <TouchableOpacity style={styles.primaryAction} onPress={onShip}><Text style={styles.primaryActionText}>Add tracking</Text></TouchableOpacity>
        )}
        {tab === 'Purchases' && order.status === 'shipped' && (
          <TouchableOpacity style={styles.primaryAction} onPress={() => onAction('confirm_delivered')}><Text style={styles.primaryActionText}>Confirm delivery</Text></TouchableOpacity>
        )}
        {tab === 'Sales' && ['paid', 'processing', 'shipped', 'delivered'].includes(order.status) && (
          <TouchableOpacity style={styles.refundAction} onPress={() => onAction('refund')}><Text style={styles.refundActionText}>Refund buyer</Text></TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function OrdersScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { purchases, sales, loading, refreshOrders, runOrderAction } = useMarketplace();
  const [tab, setTab] = useState<OrdersTab>(route.params?.initialTab === 'Sales' ? 'Sales' : 'Purchases');
  const [shippingOrder, setShippingOrder] = useState<MarketplaceOrder | null>(null);
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    refreshOrders().catch((error) => console.error('Order refresh failed:', error));
  }, [refreshOrders]));

  const orders = tab === 'Purchases' ? purchases : sales;

  const runAction = (order: MarketplaceOrder, action: 'mark_processing' | 'confirm_delivered' | 'refund') => {
    const labels = {
      mark_processing: ['Prepare order?', 'This tells the buyer you are getting their item ready.'],
      confirm_delivered: ['Confirm delivery?', 'Confirm that you received this item.'],
      refund: ['Refund this order?', 'The full payment will be returned and the seller transfer will be reversed.'],
    } as const;
    Alert.alert(labels[action][0], labels[action][1], [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action === 'refund' ? 'Refund' : 'Confirm',
        style: action === 'refund' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            setSaving(true);
            await runOrderAction({ action, order_id: order.id });
          } catch (error: any) {
            Alert.alert('Could not update order', error?.message ?? 'Please try again.');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const openShipping = (order: MarketplaceOrder) => {
    setShippingOrder(order);
    setCarrier(order.tracking_carrier ?? '');
    setTracking(order.tracking_number ?? '');
    setTrackingUrl(order.tracking_url ?? '');
  };

  const saveShipping = async () => {
    if (!shippingOrder || !carrier.trim() || !tracking.trim()) {
      Alert.alert('Add tracking', 'Carrier and tracking number are required.');
      return;
    }
    try {
      setSaving(true);
      await runOrderAction({
        action: 'mark_shipped',
        order_id: shippingOrder.id,
        tracking_carrier: carrier,
        tracking_number: tracking,
        tracking_url: trackingUrl,
      });
      setShippingOrder(null);
      Alert.alert('Marked as shipped', 'The buyer can now see the tracking details.');
    } catch (error: any) {
      Alert.alert('Could not add tracking', error?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={25} color={Colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Orders</Text>
        <TouchableOpacity style={styles.backButton} onPress={refreshOrders}><Ionicons name="refresh" size={20} color={Colors.textPrimary} /></TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(['Purchases', 'Sales'] as OrdersTab[]).map((item) => (
          <TouchableOpacity key={item} style={[styles.tab, tab === item && styles.activeTab]} onPress={() => setTab(item)}>
            <Text style={[styles.tabText, tab === item && styles.activeTabText]}>My {item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, orders.length === 0 && styles.emptyList]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshOrders} tintColor={Colors.primary} />}
        renderItem={({ item }) => (
          <OrderCard order={item} tab={tab} onShip={() => openShipping(item)} onAction={(action) => runAction(item, action)} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name={tab === 'Purchases' ? 'bag-check-outline' : 'cube-outline'} size={48} color={Colors.mediumGray} />
            <Text style={styles.emptyTitle}>No {tab.toLowerCase()} yet</Text>
            <Text style={styles.emptyText}>{tab === 'Purchases' ? 'Items you buy will appear here with shipping updates.' : 'Paid orders from your listings will appear here.'}</Text>
          </View>
        }
      />

      {saving && <View style={styles.savingOverlay}><ActivityIndicator color={Colors.white} /></View>}

      <Modal visible={!!shippingOrder} transparent animationType="slide" onRequestClose={() => setShippingOrder(null)}>
        <View style={styles.modalOverlay} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Add shipping tracking</Text>
          <Text style={styles.inputLabel}>CARRIER</Text>
          <TextInput style={styles.input} value={carrier} onChangeText={setCarrier} placeholder="USPS, UPS, FedEx..." placeholderTextColor={Colors.mediumGray} />
          <Text style={styles.inputLabel}>TRACKING NUMBER</Text>
          <TextInput style={styles.input} value={tracking} onChangeText={setTracking} placeholder="Tracking number" placeholderTextColor={Colors.mediumGray} autoCapitalize="characters" />
          <Text style={styles.inputLabel}>TRACKING LINK (OPTIONAL)</Text>
          <TextInput style={styles.input} value={trackingUrl} onChangeText={setTrackingUrl} placeholder="https://..." placeholderTextColor={Colors.mediumGray} autoCapitalize="none" keyboardType="url" />
          <View style={styles.sheetFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShippingOrder(null)} disabled={saving}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={saveShipping} disabled={saving}><Text style={styles.saveText}>{saving ? 'Saving...' : 'Save tracking'}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800' },
  tabs: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.base },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.pill, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.cardBorder },
  activeTab: { backgroundColor: Colors.black, borderColor: Colors.black },
  tabText: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  activeTabText: { color: Colors.white },
  list: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xxl },
  emptyList: { flexGrow: 1 },
  orderCard: { marginBottom: Spacing.base, padding: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder },
  orderTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  orderImageFrame: { width: 70, height: 92, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, borderRadius: BorderRadius.md, overflow: 'hidden' },
  orderImage: { width: '100%', height: '100%' },
  orderCopy: { flex: 1, minWidth: 0 },
  orderTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '800', lineHeight: 20 },
  orderParty: { marginTop: 4, color: Colors.textSecondary, fontSize: Typography.fontSize.xs },
  orderPrice: { marginTop: 6, color: Colors.primaryDark, fontSize: Typography.fontSize.md, fontWeight: '800' },
  statusPill: { maxWidth: 100, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: BorderRadius.pill, backgroundColor: '#F9E5E1' },
  statusText: { color: Colors.primaryDark, fontSize: 10, fontWeight: '800', textAlign: 'center' },
  addressBox: { marginTop: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.background },
  addressLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 4 },
  addressText: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, lineHeight: 19 },
  trackingRow: { marginTop: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: Spacing.sm },
  trackingText: { flex: 1, color: Colors.primaryDark, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  actionRow: { marginTop: Spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  primaryAction: { minHeight: 40, justifyContent: 'center', paddingHorizontal: Spacing.base, borderRadius: BorderRadius.pill, backgroundColor: Colors.primary },
  primaryActionText: { color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  secondaryAction: { minHeight: 40, justifyContent: 'center', paddingHorizontal: Spacing.base, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.cardBorder },
  secondaryActionText: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  refundAction: { minHeight: 40, justifyContent: 'center', paddingHorizontal: Spacing.base, borderRadius: BorderRadius.pill },
  refundActionText: { color: Colors.primaryDark, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxl, paddingBottom: 80 },
  emptyTitle: { marginTop: Spacing.md, color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800' },
  emptyText: { marginTop: Spacing.sm, color: Colors.textSecondary, fontSize: Typography.fontSize.sm, lineHeight: 20, textAlign: 'center' },
  savingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { padding: Spacing.base, paddingBottom: Spacing.xl, backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl },
  sheetHandle: { width: 42, height: 4, alignSelf: 'center', marginBottom: Spacing.md, borderRadius: 2, backgroundColor: Colors.cardBorder },
  sheetTitle: { marginBottom: Spacing.lg, textAlign: 'center', color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800' },
  inputLabel: { marginTop: Spacing.sm, marginBottom: 6, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '800', letterSpacing: 0.5 },
  input: { minHeight: 50, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder, color: Colors.textPrimary, fontSize: Typography.fontSize.base },
  sheetFooter: { marginTop: Spacing.lg, flexDirection: 'row', gap: Spacing.sm },
  cancelButton: { flex: 0.85, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: Colors.cardBorder },
  cancelText: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700' },
  saveButton: { flex: 1.4, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.pill, backgroundColor: Colors.primary },
  disabled: { backgroundColor: Colors.mediumGray },
  saveText: { color: Colors.white, fontSize: Typography.fontSize.base, fontWeight: '800' },
});
