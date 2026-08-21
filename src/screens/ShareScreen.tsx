import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { ShareStory, useOutfit } from '../context/OutfitContext';
import { useCloset } from '../context/ClosetContext';
import { supabase } from '../lib/supabase';

function storyCover(story: ShareStory) {
  return story.image_urls?.[0] ?? '';
}

function displayName(story: ShareStory, own: boolean) {
  if (own) return 'Your Story';
  return 'Style story';
}

export default function ShareScreen() {
  const { outfits, shareStories, createShareStory } = useOutfit();
  const { items } = useCloset();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [creatorVisible, setCreatorVisible] = useState(false);
  const [viewerStory, setViewerStory] = useState<ShareStory | null>(null);
  const [selectedOutfitId, setSelectedOutfitId] = useState<string | null>(null);
  const [taggedItemId, setTaggedItemId] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setCurrentUserId(data.user?.id ?? null);
    });
    return () => { active = false; };
  }, []);

  const latestStoriesByUser = useMemo(() => {
    const seen = new Set<string>();
    return shareStories.filter((story) => {
      if (seen.has(story.user_id)) return false;
      seen.add(story.user_id);
      return true;
    });
  }, [shareStories]);

  const ownStory = latestStoriesByUser.find((story) => story.user_id === currentUserId) ?? null;
  const communityStories = latestStoriesByUser.filter((story) => story.user_id !== currentUserId);
  const listedItems = items.filter((item) => item.forSale);
  const selectedOutfit = outfits.find((outfit) => outfit.id === selectedOutfitId) ?? null;
  const selectedOutfitItems = selectedOutfit
    ? selectedOutfit.item_ids.map((id) => items.find((item) => item.id === id)).filter(Boolean)
    : [];

  const resetCreator = () => {
    setCreatorVisible(false);
    setSelectedOutfitId(null);
    setTaggedItemId(null);
    setCaption('');
  };

  const openCreator = () => {
    setSelectedOutfitId(outfits[0]?.id ?? null);
    setTaggedItemId(null);
    setCaption('');
    setCreatorVisible(true);
  };

  const shareStory = async () => {
    if (!selectedOutfit) {
      Alert.alert('Choose a saved outfit', 'Save an outfit in Style first, then come back to share it as a story.');
      return;
    }
    const imageUrls = selectedOutfitItems
      .map((item) => item?.image_url ?? item?.image)
      .filter((url): url is string => Boolean(url));
    if (imageUrls.length === 0) {
      Alert.alert('No outfit photos', 'This outfit needs at least one wardrobe photo before it can become a story.');
      return;
    }
    const taggedItem = listedItems.find((item) => item.id === taggedItemId);
    setSharing(true);
    try {
      const created = await createShareStory({
        outfit_id: selectedOutfit.id,
        caption: caption.trim(),
        image_urls: imageUrls,
        tagged_item_id: taggedItem?.id ?? null,
        tagged_item_name: taggedItem?.name ?? null,
        tagged_item_price: taggedItem?.salePrice ?? null,
      });
      if (!created) {
        Alert.alert('Could not share story', 'Please sign in and try again.');
        return;
      }
      resetCreator();
      setViewerStory(created);
    } catch (error) {
      Alert.alert('Could not share story', 'Run the Share Stories setup in Supabase, then try again.');
      console.error('share story error:', error);
    } finally {
      setSharing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.title}>Share</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => Alert.alert('Share', 'Stories disappear after 24 hours. Add a saved outfit to your story and optionally tag a listed item.') }>
            <Ionicons name="information-circle-outline" size={22} color={Colors.black} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={openCreator}>
            <Ionicons name="add-circle-outline" size={25} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.storySection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRow}>
          <View style={styles.ownStoryWrap}>
            <TouchableOpacity
              style={styles.storyItem}
              onPress={() => ownStory ? setViewerStory(ownStory) : openCreator()}
              activeOpacity={0.82}
            >
              <View style={[styles.storyRing, !ownStory && styles.storyRingEmpty]}>
                {ownStory ? (
                  <Image source={{ uri: storyCover(ownStory) }} style={styles.storyAvatar} />
                ) : (
                  <Ionicons name="person-outline" size={25} color={Colors.primary} />
                )}
              </View>
              <Text style={styles.storyLabel}>Your Story</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addStoryBadge} onPress={openCreator} activeOpacity={0.8}>
              <Ionicons name="add" size={16} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {communityStories.map((story) => (
            <TouchableOpacity key={story.id} style={styles.storyItem} onPress={() => setViewerStory(story)} activeOpacity={0.82}>
              <View style={styles.storyRing}>
                {storyCover(story) ? (
                  <Image source={{ uri: storyCover(story) }} style={styles.storyAvatar} />
                ) : (
                  <Ionicons name="shirt-outline" size={25} color={Colors.primary} />
                )}
              </View>
              <Text style={styles.storyLabel} numberOfLines={1}>{displayName(story, false)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {latestStoriesByUser.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="sparkles-outline" size={38} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Share your first look</Text>
          <Text style={styles.emptyText}>Create a 24-hour style story from one of your saved outfits. You can tag a listed piece if you want it to be shoppable.</Text>
          <TouchableOpacity style={styles.createStoryButton} onPress={openCreator}>
            <Ionicons name="add" size={19} color={Colors.white} />
            <Text style={styles.createStoryText}>Add Story</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={latestStoriesByUser}
          keyExtractor={(story) => story.id}
          contentContainerStyle={styles.storyFeed}
          ListHeaderComponent={<Text style={styles.feedTitle}>Today’s style stories</Text>}
          renderItem={({ item: story }) => (
            <TouchableOpacity style={styles.feedCard} onPress={() => setViewerStory(story)} activeOpacity={0.86}>
              <View style={styles.feedImageRow}>
                {story.image_urls.slice(0, 3).map((url, index) => <Image key={`${story.id}-${index}`} source={{ uri: url }} style={styles.feedImage} resizeMode="cover" />)}
              </View>
              <View style={styles.feedCardFooter}>
                <Text style={styles.feedCardTitle}>{story.user_id === currentUserId ? 'Your Story' : 'Style story'}</Text>
                <Text style={styles.feedCardSubtitle} numberOfLines={1}>{story.caption || 'Tap to watch this look'}</Text>
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          ListFooterComponent={<View style={{ height: 114 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={creatorVisible} animationType="slide" onRequestClose={resetCreator}>
        <SafeAreaView style={styles.modalSafeArea}>
          <KeyboardAvoidingView style={styles.creatorKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.creatorHeader}>
              <Text style={styles.creatorTitle}>Add Story</Text>
            </View>
            <ScrollView contentContainerStyle={styles.creatorContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>CHOOSE A SAVED OUTFIT</Text>
              {outfits.length === 0 ? (
                <View style={styles.noOutfitsCard}>
                  <Ionicons name="bookmark-outline" size={32} color={Colors.mediumGray} />
                  <Text style={styles.noOutfitsText}>Save an outfit in Style before creating a story.</Text>
                </View>
              ) : (
                outfits.map((outfit) => {
                  const active = selectedOutfitId === outfit.id;
                  const outfitItems = outfit.item_ids.map((id) => items.find((item) => item.id === id)).filter(Boolean);
                  const cover = outfitItems[0]?.image_url ?? outfitItems[0]?.image;
                  return (
                    <TouchableOpacity key={outfit.id} style={[styles.outfitChoice, active && styles.outfitChoiceActive]} onPress={() => setSelectedOutfitId(outfit.id)}>
                      {cover ? <Image source={{ uri: cover }} style={styles.outfitChoiceImage} resizeMode="contain" /> : <View style={styles.outfitChoiceFallback}><Ionicons name="shirt-outline" size={24} color={Colors.primary} /></View>}
                      <View style={styles.outfitChoiceCopy}>
                        <Text style={styles.outfitChoiceName}>{outfit.name}</Text>
                        <Text style={styles.outfitChoiceMeta}>{outfitItems.length} item{outfitItems.length === 1 ? '' : 's'}</Text>
                      </View>
                      <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={active ? Colors.primary : Colors.mediumGray} />
                    </TouchableOpacity>
                  );
                })
              )}

              <Text style={styles.fieldLabel}>CAPTION <Text style={styles.optionalLabel}>(OPTIONAL)</Text></Text>
              <TextInput
                style={styles.captionInput}
                placeholder="Say something about this look"
                placeholderTextColor={Colors.mediumGray}
                value={caption}
                onChangeText={setCaption}
                multiline
              />

              <Text style={styles.fieldLabel}>TAG A LISTED ITEM <Text style={styles.optionalLabel}>(OPTIONAL)</Text></Text>
              <TouchableOpacity style={[styles.tagChoice, taggedItemId === null && styles.tagChoiceActive]} onPress={() => setTaggedItemId(null)}>
                <Text style={[styles.tagChoiceText, taggedItemId === null && styles.tagChoiceTextActive]}>No item tag</Text>
              </TouchableOpacity>
              {listedItems.map((item) => {
                const active = taggedItemId === item.id;
                return (
                  <TouchableOpacity key={item.id} style={[styles.tagChoice, active && styles.tagChoiceActive]} onPress={() => setTaggedItemId(item.id)}>
                    <Text style={[styles.tagChoiceText, active && styles.tagChoiceTextActive]}>{item.name}{item.salePrice ? ` · $${item.salePrice}` : ''}</Text>
                    {active && <Ionicons name="checkmark" size={16} color={Colors.white} />}
                  </TouchableOpacity>
                );
              })}
              {listedItems.length === 0 && <Text style={styles.helperText}>You have no listed items yet. Stories can still be shared without a shop tag.</Text>}
              <View style={{ height: Spacing.md }} />
            </ScrollView>
            <View style={styles.creatorFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={resetCreator} disabled={sharing}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.shareButton, sharing && styles.shareButtonDisabled]} onPress={shareStory} disabled={sharing || outfits.length === 0}>
                <Ionicons name="paper-plane-outline" size={18} color={Colors.white} />
                <Text style={styles.shareButtonText}>{sharing ? 'Sharing...' : 'Share Story'}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <Modal visible={Boolean(viewerStory)} animationType="fade" onRequestClose={() => setViewerStory(null)}>
        <View style={styles.viewerRoot}>
          <SafeAreaView style={styles.viewerSafeArea}>
            <View style={styles.viewerTopBar}>
              <View style={styles.viewerIdentity}>
                <View style={styles.viewerMiniRing}>
                  {viewerStory && storyCover(viewerStory) ? <Image source={{ uri: storyCover(viewerStory) }} style={styles.viewerMiniAvatar} /> : <Ionicons name="shirt-outline" size={16} color={Colors.white} />}
                </View>
                <Text style={styles.viewerName}>{viewerStory?.user_id === currentUserId ? 'Your Story' : 'Style Story'}</Text>
              </View>
            </View>
            <View style={styles.viewerContent}>
              <View style={styles.viewerGrid}>
                {viewerStory?.image_urls.slice(0, 4).map((url, index) => <Image key={`${viewerStory.id}-${index}`} source={{ uri: url }} style={styles.viewerImage} resizeMode="contain" />)}
              </View>
              {!!viewerStory?.caption && <Text style={styles.viewerCaption}>{viewerStory.caption}</Text>}
              {!!viewerStory?.tagged_item_name && (
                <View style={styles.storyTag}>
                  <Ionicons name="pricetag" size={16} color={Colors.primary} />
                  <Text style={styles.storyTagText}>{viewerStory.tagged_item_name}{viewerStory.tagged_item_price ? ` · $${viewerStory.tagged_item_price}` : ''}</Text>
                </View>
              )}
            </View>
            <View style={styles.viewerFooter}>
              <TouchableOpacity style={styles.viewerCloseButton} onPress={() => setViewerStory(null)}>
                <Ionicons name="close" size={19} color={Colors.white} />
                <Text style={styles.viewerCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  headerSpacer: { width: 36 },
  title: { flex: 1, fontSize: Typography.fontSize.xl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, textAlign: 'center' },
  headerRight: { flexDirection: 'row', gap: Spacing.xs },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  storySection: { borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  storyRow: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.md, gap: Spacing.md },
  ownStoryWrap: { width: 66, alignItems: 'center' },
  storyItem: { alignItems: 'center', width: 66 },
  storyRing: { width: 60, height: 60, borderRadius: 30, borderWidth: 2.5, borderColor: Colors.primary, padding: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  storyRingEmpty: { borderStyle: 'dashed', backgroundColor: Colors.white },
  storyAvatar: { width: 49, height: 49, borderRadius: 25, backgroundColor: Colors.cardBorder },
  storyLabel: { marginTop: 5, width: 66, textAlign: 'center', color: Colors.textSecondary, fontSize: 10, fontWeight: '600' },
  addStoryBadge: { position: 'absolute', right: 0, top: 40, width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderColor: Colors.white, borderWidth: 2 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxxl, paddingBottom: 85 },
  emptyIconCircle: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#F9E5E1', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: Spacing.base, color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800' },
  emptyText: { marginTop: Spacing.sm, color: Colors.textSecondary, fontSize: Typography.fontSize.sm, lineHeight: 20, textAlign: 'center' },
  createStoryButton: { marginTop: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: BorderRadius.pill },
  createStoryText: { color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  storyFeed: { padding: Spacing.base },
  feedTitle: { marginBottom: Spacing.sm, color: Colors.textPrimary, fontSize: Typography.fontSize.md, fontWeight: '800' },
  feedCard: { overflow: 'hidden', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder },
  feedImageRow: { height: 172, flexDirection: 'row', backgroundColor: '#FFFDF9' },
  feedImage: { flex: 1, height: '100%', backgroundColor: '#FFFDF9' },
  feedCardFooter: { padding: Spacing.md },
  feedCardTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '800' },
  feedCardSubtitle: { marginTop: 3, color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  modalSafeArea: { flex: 1, backgroundColor: Colors.background },
  creatorKeyboard: { flex: 1 },
  creatorHeader: { alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  creatorTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.md, fontWeight: '800' },
  creatorContent: { padding: Spacing.base },
  fieldLabel: { marginTop: Spacing.sm, marginBottom: Spacing.sm, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '800', letterSpacing: 0.6 },
  optionalLabel: { fontWeight: '500', letterSpacing: 0 },
  noOutfitsCard: { padding: Spacing.lg, backgroundColor: Colors.white, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder, alignItems: 'center', gap: Spacing.sm },
  noOutfitsText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, textAlign: 'center' },
  outfitChoice: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.sm },
  outfitChoiceActive: { borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: '#FFF6F4' },
  outfitChoiceImage: { width: 52, height: 58, borderRadius: BorderRadius.sm, backgroundColor: '#FFFDF9' },
  outfitChoiceFallback: { width: 52, height: 58, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9E5E1' },
  outfitChoiceCopy: { flex: 1 },
  outfitChoiceName: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '800' },
  outfitChoiceMeta: { marginTop: 3, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '600' },
  captionInput: { minHeight: 86, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.white, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder, color: Colors.textPrimary, fontSize: Typography.fontSize.sm, textAlignVertical: 'top' },
  tagChoice: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: Spacing.sm },
  tagChoiceActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  tagChoiceText: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  tagChoiceTextActive: { color: Colors.white },
  helperText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, lineHeight: 18 },
  creatorFooter: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: Spacing.base, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.cardBorder },
  cancelButton: { flex: 0.85, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: Colors.cardBorder },
  cancelButtonText: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700' },
  shareButton: { flex: 1.5, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, borderRadius: BorderRadius.pill, backgroundColor: Colors.primary },
  shareButtonDisabled: { backgroundColor: Colors.mediumGray },
  shareButtonText: { color: Colors.white, fontSize: Typography.fontSize.base, fontWeight: '800' },
  viewerRoot: { flex: 1, backgroundColor: Colors.black },
  viewerSafeArea: { flex: 1 },
  viewerTopBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: Spacing.sm },
  viewerIdentity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  viewerMiniRing: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  viewerMiniAvatar: { width: '100%', height: '100%' },
  viewerName: { color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  viewerFooter: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: Spacing.base },
  viewerCloseButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill },
  viewerCloseButtonText: { color: Colors.white, fontSize: Typography.fontSize.base, fontWeight: '800' },
  viewerContent: { flex: 1, justifyContent: 'center', padding: Spacing.base },
  viewerGrid: { minHeight: 310, flexDirection: 'row', flexWrap: 'wrap', borderRadius: BorderRadius.lg, overflow: 'hidden', backgroundColor: '#1D1D1D' },
  viewerImage: { width: '50%', height: 170, backgroundColor: '#F5F0EB' },
  viewerCaption: { marginTop: Spacing.base, color: Colors.white, fontSize: Typography.fontSize.base, lineHeight: 22, fontWeight: '600' },
  storyTag: { alignSelf: 'flex-start', marginTop: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.white, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill },
  storyTagText: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '800' },
});
