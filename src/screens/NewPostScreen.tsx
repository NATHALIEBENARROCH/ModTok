import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { useOutfit } from '../context/OutfitContext';
import { useCloset } from '../context/ClosetContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { FeedPostKind, useSocial } from '../context/SocialContext';
import { formatUsd } from '../types/marketplace';
import { uploadImageToSupabase } from '../lib/uploadImage';

const MAX_PHOTOS = 10;
const MAX_CAPTION = 2200;

// Followers can only see photos that were uploaded (not ones still on this phone).
const isShareable = (url?: string | null): url is string => Boolean(url && /^https?:\/\//.test(url));

const SOURCES: { kind: FeedPostKind; label: string; icon: any }[] = [
  { kind: 'outfit', label: 'Saved outfit', icon: 'color-wand-outline' },
  { kind: 'item', label: 'Closet piece', icon: 'shirt-outline' },
  { kind: 'photo', label: 'Photos', icon: 'images-outline' },
];

export default function NewPostScreen({ navigation, route }: { navigation: any; route?: any }) {
  const { outfits } = useOutfit();
  const { items } = useCloset();
  const { myListings } = useMarketplace();
  const { createPost } = useSocial();
  const [kind, setKind] = useState<FeedPostKind>(route?.params?.kind ?? (outfits.length > 0 ? 'outfit' : 'item'));
  const [outfitId, setOutfitId] = useState<string | null>(route?.params?.outfitId ?? outfits[0]?.id ?? null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [taggedListingId, setTaggedListingId] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const activeListings = myListings.filter((listing) => listing.status === 'active');
  const itemsWithPhotos = items.filter((item) => isShareable(item.image_url ?? item.image));

  const selectedOutfit = outfits.find((outfit) => outfit.id === outfitId) ?? null;
  const selectedItem = items.find((item) => item.id === itemId) ?? null;

  const previewImages = useMemo(() => {
    if (kind === 'outfit' && selectedOutfit) {
      if (isShareable(selectedOutfit.look_image_url)) return [selectedOutfit.look_image_url];
      return selectedOutfit.item_ids
        .map((id) => items.find((item) => item.id === id))
        .map((item) => item?.image_url ?? item?.image)
        .filter(isShareable)
        .slice(0, MAX_PHOTOS);
    }
    if (kind === 'item' && selectedItem) {
      const url = selectedItem.image_url ?? selectedItem.image;
      return isShareable(url) ? [url] : [];
    }
    if (kind === 'photo') return photoUris;
    return [];
  }, [items, kind, photoUris, selectedItem, selectedOutfit]);

  const pickPhotos = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required to post your photos.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photoUris.length,
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUris((previous) => [...previous, ...result.assets.map((asset) => asset.uri)].slice(0, MAX_PHOTOS));
    }
  };

  const takePhoto = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to take a photo.');
        return;
      }
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 5], quality: 0.85 });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUris((previous) => [...previous, result.assets[0].uri].slice(0, MAX_PHOTOS));
    }
  };

  const submit = async () => {
    if (previewImages.length === 0) {
      Alert.alert(
        'Add a photo',
        kind === 'photo' ? 'Choose at least one photo to post.' : 'Pick something with a photo to post.',
      );
      return;
    }
    setPosting(true);
    try {
      let imageUrls = previewImages;
      if (kind === 'photo') {
        const uploaded = await Promise.all(photoUris.map((uri) => uploadImageToSupabase(uri, 'feed-post')));
        if (uploaded.some((url) => !url)) {
          Alert.alert('Upload failed', 'One of your photos could not be uploaded. Please try again.');
          return;
        }
        imageUrls = uploaded as string[];
      }
      const created = await createPost({
        kind,
        caption: caption.trim(),
        image_urls: imageUrls,
        outfit_id: kind === 'outfit' ? selectedOutfit?.id ?? null : null,
        closet_item_id: kind === 'item' ? selectedItem?.id ?? null : null,
        tagged_listing_id: taggedListingId,
      });
      if (!created) {
        Alert.alert('Could not post', 'Please sign in and try again.');
        return;
      }
      navigation.goBack();
    } catch (error: any) {
      console.error('create post error:', error);
      Alert.alert('Could not post', error?.message ?? 'Please try again.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} disabled={posting} accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New post</Text>
          <TouchableOpacity style={[styles.postBtn, posting && styles.postBtnDisabled]} onPress={submit} disabled={posting}>
            {posting ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.postBtnText}>Share</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.sourceRow}>
            {SOURCES.map((source) => {
              const active = kind === source.kind;
              return (
                <TouchableOpacity key={source.kind} style={[styles.sourcePill, active && styles.sourcePillActive]} onPress={() => setKind(source.kind)}>
                  <Ionicons name={source.icon} size={16} color={active ? Colors.white : Colors.textPrimary} />
                  <Text style={[styles.sourcePillText, active && styles.sourcePillTextActive]}>{source.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
            {previewImages.length === 0 ? (
              <View style={[styles.previewImage, styles.previewEmpty]}>
                <Ionicons name="image-outline" size={34} color={Colors.mediumGray} />
                <Text style={styles.previewEmptyText}>Your post preview</Text>
              </View>
            ) : (
              previewImages.map((url, index) => (
                <View key={`${url}-${index}`}>
                  <Image source={{ uri: url }} style={styles.previewImage} resizeMode="contain" />
                  {kind === 'photo' && (
                    <TouchableOpacity
                      style={styles.removePhoto}
                      onPress={() => setPhotoUris((previous) => previous.filter((_, i) => i !== index))}
                      accessibilityLabel="Remove photo"
                    >
                      <Ionicons name="close" size={14} color={Colors.white} />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </ScrollView>

          {kind === 'outfit' && (
            <>
              <Text style={styles.fieldLabel}>CHOOSE A SAVED OUTFIT</Text>
              {outfits.length === 0 ? (
                <Text style={styles.helperText}>Save an outfit in Style first, then come back to post it.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
                  {outfits.map((outfit) => {
                    const active = outfit.id === outfitId;
                    const first = items.find((item) => outfit.item_ids.includes(item.id));
                    const cover = outfit.look_image_url ?? first?.image_url ?? first?.image;
                    return (
                      <TouchableOpacity key={outfit.id} style={[styles.thumb, active && styles.thumbActive]} onPress={() => setOutfitId(outfit.id)}>
                        {cover ? <Image source={{ uri: cover }} style={styles.thumbImage} resizeMode="contain" /> : <Ionicons name="shirt-outline" size={24} color={Colors.primary} />}
                        <Text style={styles.thumbLabel} numberOfLines={1}>{outfit.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </>
          )}

          {kind === 'item' && (
            <>
              <Text style={styles.fieldLabel}>CHOOSE A PIECE FROM YOUR CLOSET</Text>
              {itemsWithPhotos.length === 0 ? (
                <Text style={styles.helperText}>Add clothes with photos to your closet first.</Text>
              ) : (
                <View style={styles.grid}>
                  {itemsWithPhotos.map((item) => {
                    const active = item.id === itemId;
                    return (
                      <TouchableOpacity key={item.id} style={[styles.gridCell, active && styles.thumbActive]} onPress={() => setItemId(item.id)}>
                        <Image source={{ uri: item.image_url ?? item.image }} style={styles.gridImage} resizeMode="contain" />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {kind === 'photo' && (
            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoButton} onPress={pickPhotos} disabled={photoUris.length >= MAX_PHOTOS}>
                <Ionicons name="images-outline" size={20} color={Colors.primary} />
                <Text style={styles.photoButtonText}>Choose photos</Text>
              </TouchableOpacity>
              {Platform.OS !== 'web' && (
                <TouchableOpacity style={styles.photoButton} onPress={takePhoto} disabled={photoUris.length >= MAX_PHOTOS}>
                  <Ionicons name="camera-outline" size={20} color={Colors.primary} />
                  <Text style={styles.photoButtonText}>Take a photo</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={styles.fieldLabel}>CAPTION <Text style={styles.optionalLabel}>(OPTIONAL)</Text></Text>
          <TextInput
            style={styles.captionInput}
            placeholder="Write a caption..."
            placeholderTextColor={Colors.mediumGray}
            value={caption}
            onChangeText={(text) => setCaption(text.slice(0, MAX_CAPTION))}
            multiline
          />

          {activeListings.length > 0 && (
            <>
              <Text style={styles.fieldLabel}>TAG A PIECE YOU'RE SELLING <Text style={styles.optionalLabel}>(OPTIONAL)</Text></Text>
              <TouchableOpacity style={[styles.tagChoice, taggedListingId === null && styles.tagChoiceActive]} onPress={() => setTaggedListingId(null)}>
                <Text style={[styles.tagChoiceText, taggedListingId === null && styles.tagChoiceTextActive]}>No tag</Text>
              </TouchableOpacity>
              {activeListings.map((listing) => {
                const active = taggedListingId === listing.id;
                return (
                  <TouchableOpacity key={listing.id} style={[styles.tagChoice, active && styles.tagChoiceActive]} onPress={() => setTaggedListingId(listing.id)}>
                    <Text style={[styles.tagChoiceText, active && styles.tagChoiceTextActive]} numberOfLines={1}>{listing.title} · {formatUsd(listing.price_cents)}</Text>
                    {active && <Ionicons name="checkmark" size={16} color={Colors.white} />}
                  </TouchableOpacity>
                );
              })}
            </>
          )}
          <Text style={styles.helperText}>Posts stay on your profile and show in your followers' feeds. Only post photos you have the right to share.</Text>
          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, backgroundColor: Colors.white },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: Typography.fontSize.md, fontWeight: '800', color: Colors.textPrimary },
  postBtn: { minWidth: 72, minHeight: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.base },
  postBtnDisabled: { backgroundColor: Colors.mediumGray },
  postBtnText: { color: Colors.white, fontWeight: '800', fontSize: Typography.fontSize.sm },
  content: { padding: Spacing.base },
  sourceRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.base },
  sourcePill: { flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.white },
  sourcePillActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  sourcePillText: { color: Colors.textPrimary, fontSize: Typography.fontSize.xs, fontWeight: '800' },
  sourcePillTextActive: { color: Colors.white },
  previewRow: { gap: Spacing.sm, paddingBottom: Spacing.sm },
  previewImage: { width: 220, height: 260, borderRadius: BorderRadius.md, backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: Colors.cardBorder },
  previewEmpty: { alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
  previewEmptyText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '600' },
  removePhoto: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(26,26,26,0.75)' },
  fieldLabel: { marginTop: Spacing.base, marginBottom: Spacing.sm, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '800', letterSpacing: 0.6 },
  optionalLabel: { fontWeight: '500', letterSpacing: 0 },
  helperText: { marginTop: Spacing.sm, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, lineHeight: 18 },
  thumbRow: { gap: Spacing.sm },
  thumb: { width: 96, padding: 6, alignItems: 'center', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.white },
  thumbActive: { borderWidth: 2, borderColor: Colors.primary },
  thumbImage: { width: 80, height: 92, backgroundColor: '#FFFDF9' },
  thumbLabel: { marginTop: 4, color: Colors.textPrimary, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  gridCell: { width: '31%' as any, aspectRatio: 0.85, padding: 4, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.white },
  gridImage: { width: '100%', height: '100%' },
  photoButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  photoButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: Colors.primaryLight, backgroundColor: Colors.white },
  photoButtonText: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  captionInput: { minHeight: 90, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.white, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder, color: Colors.textPrimary, fontSize: Typography.fontSize.sm, textAlignVertical: 'top' },
  tagChoice: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: Spacing.sm },
  tagChoiceActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  tagChoiceText: { flexShrink: 1, color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  tagChoiceTextActive: { color: Colors.white },
});
