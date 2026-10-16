import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useMarketplace } from '../context/MarketplaceContext';
import { BorderRadius, Colors, Spacing, Typography } from '../theme';

const DISCOUNT_CHOICES = [0, 5, 10, 15, 20, 25, 30];

function Field({ label, value, onChangeText, placeholder, half = false, keyboardType, autoCapitalize = 'words' }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  half?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'words' | 'characters';
}) {
  return (
    <View style={[styles.fieldWrap, half && styles.half]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.mediumGray}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

function DiscountRow({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.discountRow}>
      <Text style={styles.discountLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.discountChoices}>
        {DISCOUNT_CHOICES.map((percent) => (
          <TouchableOpacity
            key={percent}
            style={[styles.discountChip, value === percent && styles.discountChipActive]}
            onPress={() => onChange(percent)}
          >
            <Text style={[styles.discountChipText, value === percent && styles.discountChipTextActive]}>
              {percent === 0 ? 'None' : `${percent}%`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

/** Seller's ship-from address (printed on prepaid labels) and bundle discounts. */
export default function SellerShippingScreen() {
  const navigation = useNavigation<any>();
  const { shipFrom, saveShipFrom, myBundleDiscount, saveBundleDiscount } = useMarketplace();
  const [name, setName] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [bundlesOn, setBundlesOn] = useState(true);
  const [two, setTwo] = useState(10);
  const [three, setThree] = useState(15);
  const [five, setFive] = useState(20);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (shipFrom) {
      setName(shipFrom.name ?? '');
      setLine1(shipFrom.line1 ?? '');
      setLine2(shipFrom.line2 ?? '');
      setCity(shipFrom.city ?? '');
      setState(shipFrom.state ?? '');
      setPostalCode(shipFrom.postal_code ?? '');
      setPhone(shipFrom.phone ?? '');
    }
  }, [shipFrom]);

  useEffect(() => {
    if (myBundleDiscount) {
      setBundlesOn(myBundleDiscount.enabled);
      setTwo(Math.round(myBundleDiscount.two_items_bps / 100));
      setThree(Math.round(myBundleDiscount.three_items_bps / 100));
      setFive(Math.round(myBundleDiscount.five_items_bps / 100));
    }
  }, [myBundleDiscount]);

  const save = async () => {
    if (![name, line1, city, state, postalCode].every((value) => value.trim())) {
      Alert.alert('Complete your address', 'Name, street, city, state, and ZIP code are needed for the shipping label.');
      return;
    }
    if (!/^\d{5}(-\d{4})?$/.test(postalCode.trim())) {
      Alert.alert('Check ZIP code', 'Enter a 5-digit US ZIP code.');
      return;
    }
    if (!/^[A-Za-z]{2}$/.test(state.trim())) {
      Alert.alert('Check state', 'Use the 2-letter state code, for example NY.');
      return;
    }
    try {
      setSaving(true);
      await saveShipFrom({
        name: name.trim(),
        line1: line1.trim(),
        line2: line2.trim() || undefined,
        city: city.trim(),
        state: state.trim().toUpperCase(),
        postal_code: postalCode.trim(),
        country: 'US',
        phone: phone.trim() || undefined,
      });
      await saveBundleDiscount({
        enabled: bundlesOn,
        two_items_bps: two * 100,
        three_items_bps: three * 100,
        five_items_bps: five * 100,
      });
      Alert.alert('Saved', 'Your shipping and bundle settings are up to date.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Could not save', error?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={saving}>
          <Ionicons name="chevron-back" size={25} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shipping & bundles</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <Ionicons name="print-outline" size={24} color={Colors.primary} />
            <View style={styles.infoCopy}>
              <Text style={styles.infoTitle}>Prepaid labels, like Vinted</Text>
              <Text style={styles.infoText}>
                When something sells, a prepaid label appears in My Sales. Print it (or show it at the post office), pack the item, and drop it off. The buyer already paid for shipping.
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Ship-from address</Text>
          <Text style={styles.sectionNote}>Printed on your shipping labels as the return address.</Text>
          <Field label="Full name" value={name} onChangeText={setName} placeholder="Name for the label" />
          <Field label="Street address" value={line1} onChangeText={setLine1} placeholder="123 Main Street" />
          <Field label="Apartment, suite (optional)" value={line2} onChangeText={setLine2} placeholder="Apt 4B" />
          <Field label="City" value={city} onChangeText={setCity} placeholder="City" />
          <View style={styles.row}>
            <Field label="State" value={state} onChangeText={setState} placeholder="NY" half autoCapitalize="characters" />
            <Field label="ZIP code" value={postalCode} onChangeText={setPostalCode} placeholder="10001" half keyboardType="number-pad" />
          </View>
          <Field label="Phone (for the carrier)" value={phone} onChangeText={setPhone} placeholder="Optional" keyboardType="phone-pad" />

          <View style={styles.bundleHeader}>
            <View style={styles.flex}>
              <Text style={styles.sectionTitle}>Bundle discounts</Text>
              <Text style={styles.sectionNote}>Buyers can pick several of your items and pay one shipping. Reward them for buying more.</Text>
            </View>
            <Switch value={bundlesOn} onValueChange={setBundlesOn} trackColor={{ true: Colors.primary, false: Colors.lightGray }} />
          </View>
          {bundlesOn && (
            <View style={styles.discountCard}>
              <DiscountRow label="2 items" value={two} onChange={setTwo} />
              <DiscountRow label="3–4 items" value={three} onChange={setThree} />
              <DiscountRow label="5+ items" value={five} onChange={setFive} />
            </View>
          )}
          <View style={{ height: 110 }} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color={Colors.white} /> : <Ionicons name="checkmark" size={19} color={Colors.white} />}
            <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800' },
  content: { padding: Spacing.base },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, padding: Spacing.base, borderRadius: BorderRadius.lg, backgroundColor: '#F9E5E1' },
  infoCopy: { flex: 1 },
  infoTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  infoText: { marginTop: 3, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, lineHeight: 18 },
  sectionTitle: { marginTop: Spacing.xl, color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800' },
  sectionNote: { marginTop: 4, marginBottom: Spacing.base, color: Colors.textSecondary, fontSize: Typography.fontSize.sm, lineHeight: 19 },
  fieldWrap: { marginBottom: Spacing.md },
  half: { flex: 1 },
  row: { flexDirection: 'row', gap: Spacing.sm },
  fieldLabel: { marginBottom: 6, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '800', letterSpacing: 0.4 },
  input: { minHeight: 50, paddingHorizontal: Spacing.md, color: Colors.textPrimary, fontSize: Typography.fontSize.base, backgroundColor: Colors.white, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder },
  bundleHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  discountCard: { padding: Spacing.md, gap: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder },
  discountRow: { gap: Spacing.sm },
  discountLabel: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  discountChoices: { gap: Spacing.xs },
  discountChip: { minHeight: 34, justifyContent: 'center', paddingHorizontal: Spacing.md, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.white },
  discountChipActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  discountChipText: { color: Colors.textPrimary, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  discountChipTextActive: { color: Colors.white },
  footer: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: Spacing.base, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.cardBorder },
  saveButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.primary },
  disabled: { backgroundColor: Colors.mediumGray },
  saveText: { color: Colors.white, fontSize: Typography.fontSize.base, fontWeight: '800' },
});
