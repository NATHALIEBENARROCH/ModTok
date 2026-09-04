import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { supabase } from '../lib/supabase';
import { useCloset } from '../context/ClosetContext';
import { ShareStory, useOutfit } from '../context/OutfitContext';
import { useMarketplace } from '../context/MarketplaceContext';

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const { items, totalItems } = useCloset();
  const { outfits, shareStories } = useOutfit();
  const { purchases, sales } = useMarketplace();
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [viewerStory, setViewerStory] = useState<ShareStory | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email ?? '');
        setUserId(data.user.id);
      }
    });
  }, []);

  const username = userEmail ? '@' + userEmail.split('@')[0] : '@user';
  const displayName = userEmail ? userEmail.split('@')[0] : 'ModTok User';
  const ownStory = useMemo(
    () => shareStories.find((story) => story.user_id === userId) ?? null,
    [shareStories, userId],
  );

  const outfitCards = useMemo(() => outfits.map((outfit) => ({
    outfit,
    lookImage: outfit.look_image_url,
    images: outfit.item_ids
      .map((id) => items.find((item) => item.id === id))
      .map((item) => item?.image_url ?? item?.image)
      .filter((image): image is string => Boolean(image))
      .slice(0, 3),
  })), [items, outfits]);

  const openStoryCreator = () => navigation.navigate('Share', { openStoryCreator: true });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ width: 36 }} />
          <Text style={styles.username}>{username}</Text>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={22} color={Colors.black} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity
              style={[styles.avatarRing, ownStory && styles.avatarRingActive]}
              onPress={() => ownStory ? setViewerStory(ownStory) : openStoryCreator()}
              activeOpacity={0.84}
            >
              <Image
                source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${displayName}` }}
                style={styles.avatar}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addStoryBtn} onPress={openStoryCreator} activeOpacity={0.82}>
              <Ionicons name="add" size={17} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{displayName}</Text>
            <Text style={styles.bio}>My ModTok wardrobe</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{totalItems}</Text>
                <Text style={styles.statLabel}>Items</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{outfits.length}</Text>
                <Text style={styles.statLabel}>Outfits</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.editProfileBtn} onPress={() => navigation.navigate('EditProfile')}>
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareProfileBtn} onPress={() => navigation.navigate('Share')}>
                <Feather name="share" size={16} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.marketActions}>
          <TouchableOpacity style={styles.marketAction} onPress={() => navigation.navigate('Marketplace')}>
            <Ionicons name="bag-handle-outline" size={20} color={Colors.primary} />
            <Text style={styles.marketActionValue}>Shop</Text>
            <Text style={styles.marketActionLabel}>Marketplace</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.marketAction} onPress={() => navigation.navigate('Orders', { initialTab: 'Purchases' })}>
            <Ionicons name="receipt-outline" size={20} color={Colors.primary} />
            <Text style={styles.marketActionValue}>{purchases.length}</Text>
            <Text style={styles.marketActionLabel}>Purchases</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.marketAction} onPress={() => navigation.navigate('Orders', { initialTab: 'Sales' })}>
            <Ionicons name="cube-outline" size={20} color={Colors.primary} />
            <Text style={styles.marketActionValue}>{sales.length}</Text>
            <Text style={styles.marketActionLabel}>Sales</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.premiumBanner}>
          <Ionicons name="sparkles" size={18} color={Colors.primary} />
          <View style={styles.premiumText}>
            <Text style={styles.premiumTitle}>Upgrade to ModTok Premium</Text>
            <Text style={styles.premiumSubtitle}>Unlimited outfits, AI styling, analytics & more</Text>
          </View>
          <TouchableOpacity style={styles.premiumBtn}>
            <Text style={styles.premiumBtnText}>Upgrade</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.looksHeader}>
          <Ionicons name="grid-outline" size={18} color={Colors.textPrimary} />
          <Text style={styles.looksTitle}>My Saved Looks</Text>
        </View>

        {outfitCards.length === 0 ? (
          <View style={styles.emptyLooks}>
            <Ionicons name="color-wand-outline" size={32} color={Colors.primary} />
            <Text style={styles.emptyLooksTitle}>Your looks will live here</Text>
            <Text style={styles.emptyLooksText}>Create and save an outfit in Style to build your profile gallery.</Text>
            <TouchableOpacity style={styles.createLookBtn} onPress={() => navigation.navigate('Style')}>
              <Text style={styles.createLookBtnText}>Create a Look</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.outfitGrid}>
            {outfitCards.map(({ outfit, lookImage, images }) => (
              <TouchableOpacity
                key={outfit.id}
                style={styles.outfitCard}
                onPress={() => navigation.navigate('OutfitDetail', { outfit })}
                activeOpacity={0.86}
              >
                <View style={styles.outfitPreview}>
                  {lookImage ? (
                    <Image source={{ uri: lookImage }} style={styles.outfitLookImage} resizeMode="contain" />
                  ) : images.length > 0 ? (
                    images.map((image, index) => (
                      <Image key={`${outfit.id}-${index}`} source={{ uri: image }} style={styles.outfitImage} resizeMode="contain" />
                    ))
                  ) : (
                    <Ionicons name="shirt-outline" size={30} color={Colors.mediumGray} />
                  )}
                </View>
                <View style={styles.outfitCardInfo}>
                  <Text style={styles.outfitName} numberOfLines={1}>{outfit.name}</Text>
                  <Text style={styles.outfitMeta}>{outfit.item_ids.length} items</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 110 }} />
      </ScrollView>

      <Modal visible={Boolean(viewerStory)} animationType="fade" onRequestClose={() => setViewerStory(null)}>
        <View style={styles.storyViewerRoot}>
          <SafeAreaView style={styles.storyViewerSafeArea}>
            <View style={styles.storyViewerIdentity}>
              <View style={styles.storyMiniRing}>
                <Image source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${displayName}` }} style={styles.storyMiniAvatar} />
              </View>
              <Text style={styles.storyViewerName}>Your Story</Text>
            </View>
            <View style={styles.storyViewerContent}>
              <View style={styles.storyGrid}>
                {viewerStory?.image_urls.slice(0, 4).map((url, index) => (
                  <Image key={`${viewerStory.id}-${index}`} source={{ uri: url }} style={styles.storyImage} resizeMode="contain" />
                ))}
              </View>
              {!!viewerStory?.caption && <Text style={styles.storyCaption}>{viewerStory.caption}</Text>}
              {!!viewerStory?.tagged_item_name && (
                <TouchableOpacity
                  style={styles.storyTag}
                  disabled={!viewerStory.tagged_listing_id}
                  onPress={() => {
                    if (!viewerStory.tagged_listing_id) return;
                    const listingId = viewerStory.tagged_listing_id;
                    setViewerStory(null);
                    navigation.navigate('ProductDetail', { listingId });
                  }}
                >
                  <Ionicons name="pricetag" size={16} color={Colors.primary} />
                  <Text style={styles.storyTagText}>{viewerStory.tagged_item_name}{viewerStory.tagged_item_price ? ` · $${viewerStory.tagged_item_price.toFixed(2)}` : ''}</Text>
                  {!!viewerStory.tagged_listing_id && <Ionicons name="chevron-forward" size={16} color={Colors.primary} />}
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.storyViewerFooter}>
              <TouchableOpacity style={styles.closeStoryButton} onPress={() => setViewerStory(null)}>
                <Ionicons name="close" size={19} color={Colors.white} />
                <Text style={styles.closeStoryText}>Close</Text>
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
  username: { fontSize: Typography.fontSize.md, fontWeight: '700', color: Colors.textPrimary },
  settingsBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  profileSection: { flexDirection: 'row', paddingHorizontal: Spacing.base, paddingBottom: Spacing.base, gap: Spacing.base },
  avatarContainer: { position: 'relative' },
  avatarRing: { width: 86, height: 86, borderRadius: 43, borderWidth: 2, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  avatarRingActive: { borderWidth: 3, borderColor: Colors.primary },
  avatar: { width: 76, height: 76, borderRadius: 38 },
  addStoryBtn: { position: 'absolute', right: -2, bottom: 1, width: 27, height: 27, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.white },
  profileInfo: { flex: 1 },
  displayName: { fontSize: Typography.fontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  bio: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, marginBottom: Spacing.sm, lineHeight: 18 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  stat: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: Typography.fontSize.base, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  statDivider: { width: 1, height: 24, backgroundColor: Colors.cardBorder },
  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  editProfileBtn: { flex: 1, borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: Colors.cardBorder, paddingVertical: 7, alignItems: 'center', backgroundColor: Colors.white },
  editProfileText: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  shareProfileBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: Colors.cardBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  marketActions: { flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.base, marginBottom: Spacing.md },
  marketAction: { flex: 1, minHeight: 78, alignItems: 'center', justifyContent: 'center', padding: Spacing.sm, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder },
  marketActionValue: { marginTop: 3, color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  marketActionLabel: { marginTop: 1, color: Colors.textSecondary, fontSize: 10, fontWeight: '600' },
  premiumBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, marginHorizontal: Spacing.base, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.primaryLight, gap: Spacing.sm },
  premiumText: { flex: 1 },
  premiumTitle: { fontSize: Typography.fontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  premiumSubtitle: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
  premiumBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  premiumBtnText: { color: Colors.white, fontWeight: '700', fontSize: Typography.fontSize.xs },
  looksHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.base, marginBottom: Spacing.sm },
  looksTitle: { fontSize: Typography.fontSize.base, fontWeight: '800', color: Colors.textPrimary },
  outfitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.base },
  outfitCard: { width: '48.5%' as any, overflow: 'hidden', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.md },
  outfitPreview: { height: 224, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, backgroundColor: '#FFFDF9' },
  outfitImage: { flex: 1, height: '100%', backgroundColor: '#FFFDF9' },
  outfitLookImage: { width: '100%', height: '100%', backgroundColor: '#FFFDF9' },
  outfitCardInfo: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.cardBorder },
  outfitName: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  outfitMeta: { marginTop: 2, color: Colors.textSecondary, fontSize: Typography.fontSize.xs },
  emptyLooks: { marginHorizontal: Spacing.base, padding: Spacing.xl, alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder },
  emptyLooksTitle: { marginTop: Spacing.sm, color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '800' },
  emptyLooksText: { marginTop: Spacing.xs, color: Colors.textSecondary, fontSize: Typography.fontSize.sm, textAlign: 'center', lineHeight: 20 },
  createLookBtn: { marginTop: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.primary },
  createLookBtnText: { color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  storyViewerRoot: { flex: 1, backgroundColor: Colors.black },
  storyViewerSafeArea: { flex: 1 },
  storyViewerIdentity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.base, paddingTop: Spacing.sm },
  storyMiniRing: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.primary, overflow: 'hidden' },
  storyMiniAvatar: { width: '100%', height: '100%' },
  storyViewerName: { color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  storyViewerContent: { flex: 1, justifyContent: 'center', padding: Spacing.base },
  storyGrid: { minHeight: 310, flexDirection: 'row', flexWrap: 'wrap', borderRadius: BorderRadius.lg, overflow: 'hidden', backgroundColor: '#1D1D1D' },
  storyImage: { width: '50%', height: 170, backgroundColor: '#F5F0EB' },
  storyCaption: { marginTop: Spacing.base, color: Colors.white, fontSize: Typography.fontSize.base, lineHeight: 22, fontWeight: '600' },
  storyTag: { alignSelf: 'flex-start', marginTop: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.white, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill },
  storyTagText: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  storyViewerFooter: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: Spacing.base },
  closeStoryButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill },
  closeStoryText: { color: Colors.white, fontSize: Typography.fontSize.base, fontWeight: '800' },
});
