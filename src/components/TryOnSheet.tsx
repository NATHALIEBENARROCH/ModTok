import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAccount } from '../context/AccountContext';
import { runTryOn, TryOnCategory, TryOnPerson } from '../lib/tryOn';
import { BorderRadius, Colors, Spacing, Typography } from '../theme';

// The shopper's own photo is kept in memory only while the app is open, so they can try on
// several pieces without picking it again. It is never saved to the phone or to ModTok.
let rememberedSelfPhoto: string | null = null;

type Props = {
  visible: boolean;
  onClose: () => void;
  garmentImage: string;
  category: TryOnCategory;
  title?: string;
};

/** "Try it on" sheet: put a piece of clothing on your own photo or on a model, using AI. */
export default function TryOnSheet({ visible, onClose, garmentImage, category, title }: Props) {
  const navigation = useNavigation<any>();
  const { isGuest } = useAccount();
  const [loading, setLoading] = useState<TryOnPerson | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | undefined>(undefined);

  const close = () => {
    if (loading) return;
    setResult(null);
    onClose();
  };

  const tryOn = async (person: TryOnPerson, personPhotoUri?: string) => {
    setLoading(person);
    try {
      const { image, remainingToday } = await runTryOn({ garmentImage, category, person, personPhotoUri });
      setResult(image);
      setRemaining(remainingToday);
    } catch (error: any) {
      Alert.alert('Try-on', error?.message ?? 'Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const pickPhoto = async (source: 'camera' | 'library') => {
    if (Platform.OS !== 'web') {
      const { status } = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', source === 'camera' ? 'Camera access is required.' : 'Photo library access is required.');
        return;
      }
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: 0.9 };
    const picked = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (picked.canceled || !picked.assets.length) return;
    rememberedSelfPhoto = picked.assets[0].uri;
    tryOn('self', rememberedSelfPhoto);
  };

  const onTryOnYou = () => {
    const choices: any[] = [
      { text: 'Take a photo', onPress: () => pickPhoto('camera') },
      { text: 'Choose from library', onPress: () => pickPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ];
    if (rememberedSelfPhoto) {
      choices.unshift({ text: 'Use my last photo', onPress: () => tryOn('self', rememberedSelfPhoto!) });
    }
    Alert.alert(
      'Try on you',
      'For the best result, use a well-lit, full-body photo of yourself standing and facing the camera.',
      choices,
    );
  };

  const createAccount = () => {
    close();
    navigation.navigate('CreateAccount');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={close} disabled={!!loading}>
            <Ionicons name="chevron-down" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{title ? `Try on ${title}` : 'Try it on'}</Text>
          <View style={styles.iconButton} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.imageFrame}>
            <Image source={{ uri: result ?? garmentImage }} style={styles.image} resizeMode="contain" />
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={Colors.white} />
                <Text style={styles.loadingText}>Dressing {loading === 'self' ? 'you' : 'the model'} up…</Text>
                <Text style={styles.loadingSub}>This takes about 15 seconds</Text>
              </View>
            )}
            {result && !loading && (
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={12} color={Colors.white} />
                <Text style={styles.aiBadgeText}>AI preview</Text>
              </View>
            )}
          </View>

          {isGuest ? (
            <>
              <Text style={styles.guestText}>Create a free account to see how clothes look on you.</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={createAccount}>
                <Text style={styles.primaryButtonText}>Create free account</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={[styles.primaryButton, !!loading && styles.disabled]} onPress={onTryOnYou} disabled={!!loading}>
                <Ionicons name="camera-outline" size={21} color={Colors.white} />
                <Text style={styles.primaryButtonText}>Try on you</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryButton, !!loading && styles.disabled]} onPress={() => tryOn('female')} disabled={!!loading}>
                <Text style={styles.secondaryButtonText}>Try on a female model</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryButton, !!loading && styles.disabled]} onPress={() => tryOn('male')} disabled={!!loading}>
                <Text style={styles.secondaryButtonText}>Try on a male model</Text>
              </TouchableOpacity>
              {remaining !== undefined && (
                <Text style={styles.remaining}>{remaining} try-on{remaining === 1 ? '' : 's'} left today</Text>
              )}
            </>
          )}

          <Text style={styles.disclaimer}>
            Only upload a photo of yourself. Your photo is used for this try-on only and is never saved by ModTok.
            Results are created by AI and may include mistakes, so fit and color can differ from the real piece.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: Colors.textPrimary, fontSize: Typography.fontSize.md, fontWeight: '800' },
  content: { padding: Spacing.base, paddingBottom: Spacing.xxl },
  imageFrame: { width: '100%', aspectRatio: 0.72, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.cardBorder, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(26,26,26,0.55)' },
  loadingText: { marginTop: Spacing.md, color: Colors.white, fontSize: Typography.fontSize.md, fontWeight: '800' },
  loadingSub: { marginTop: 4, color: Colors.white, fontSize: Typography.fontSize.sm },
  aiBadge: { position: 'absolute', top: Spacing.md, left: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.pill, backgroundColor: 'rgba(26,26,26,0.7)' },
  aiBadgeText: { color: Colors.white, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  primaryButton: { marginTop: Spacing.lg, minHeight: 54, flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.pill, backgroundColor: Colors.primary },
  primaryButtonText: { color: Colors.white, fontSize: Typography.fontSize.base, fontWeight: '800' },
  secondaryButton: { marginTop: Spacing.md, minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.pill, backgroundColor: Colors.lightGray },
  secondaryButtonText: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  remaining: { marginTop: Spacing.md, textAlign: 'center', color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '600' },
  guestText: { marginTop: Spacing.lg, textAlign: 'center', color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '600' },
  disclaimer: { marginTop: Spacing.lg, textAlign: 'center', color: Colors.textSecondary, fontSize: Typography.fontSize.xs, lineHeight: 18 },
});
