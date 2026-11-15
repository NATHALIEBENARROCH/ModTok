import React, { useRef, useState } from 'react';
import {
  Alert,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { FeedPost, avatarFor, personName, timeAgo, useSocial } from '../context/SocialContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { useAccount } from '../context/AccountContext';
import { formatUsd } from '../types/marketplace';

const MAX_APP_WIDTH = 430;

type Props = {
  post: FeedPost;
  /** Called after the post changes (like) or is removed, for screens that keep their own copy. */
  onChange?: (post: FeedPost | null) => void;
};

export default function FeedPostCard({ post, onChange }: Props) {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const imageWidth = Math.min(width, MAX_APP_WIDTH);
  const { myUserId, toggleLike, deletePost, reportPost, unfollow, isFollowing, refreshFeed } = useSocial();
  const { blockSeller } = useMarketplace();
  const { isGuest } = useAccount();
  const [current, setCurrent] = useState(post);
  const [page, setPage] = useState(0);
  const [heartVisible, setHeartVisible] = useState(false);
  const lastTap = useRef(0);
  const own = current.user_id === myUserId;

  React.useEffect(() => setCurrent(post), [post]);

  const openProfile = () => navigation.navigate('UserProfile', { userId: current.user_id });

  const like = async (forceOn = false) => {
    if (isGuest) {
      navigation.navigate('CreateAccount');
      return;
    }
    if (forceOn && current.liked_by_me) return;
    try {
      const updated = await toggleLike(current);
      setCurrent(updated);
      onChange?.(updated);
    } catch (error: any) {
      Alert.alert('Could not update like', error?.message ?? 'Please try again.');
    }
  };

  const onImageTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      setHeartVisible(true);
      setTimeout(() => setHeartVisible(false), 650);
      void like(true);
    }
    lastTap.current = now;
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / imageWidth);
    if (next !== page) setPage(next);
  };

  const showOptions = () => {
    if (own) {
      Alert.alert('Your post', undefined, [
        {
          text: 'Delete post',
          style: 'destructive',
          onPress: () => Alert.alert('Delete this post?', 'It will be removed from your profile and from your followers’ feeds.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deletePost(current.id);
                  onChange?.(null);
                } catch (error: any) {
                  Alert.alert('Could not delete post', error?.message ?? 'Please try again.');
                }
              },
            },
          ]),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    const report = () => {
      const submit = async (reason: string) => {
        try {
          await reportPost(current.id, reason);
          Alert.alert('Report received', 'Thank you. ModTok will review this post.');
        } catch (error: any) {
          Alert.alert('Could not report post', error?.message ?? 'Please try again.');
        }
      };
      Alert.alert('Report this post', 'Why are you reporting it?', [
        { text: 'Spam', onPress: () => submit('spam') },
        { text: 'Harassment', onPress: () => submit('harassment') },
        { text: 'Inappropriate', onPress: () => submit('inappropriate') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    };
    const options: any[] = [{ text: 'Report post', onPress: report }];
    if (isFollowing(current.user_id)) {
      options.push({
        text: `Unfollow ${personName(current)}`,
        onPress: async () => {
          try {
            await unfollow(current.user_id);
          } catch (error: any) {
            Alert.alert('Could not unfollow', error?.message ?? 'Please try again.');
          }
        },
      });
    }
    options.push({
      text: 'Block this user',
      style: 'destructive',
      onPress: () => Alert.alert('Block this user?', 'Their posts, stories and listings will no longer appear for you, and you will stop following each other.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockSeller(current.user_id);
              await refreshFeed();
              onChange?.(null);
            } catch (error: any) {
              Alert.alert('Could not block user', error?.message ?? 'Please try again.');
            }
          },
        },
      ]),
    });
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Post options', undefined, options);
  };

  const listingActive = current.tagged_listing_id && current.listing_status === 'active';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.identity} onPress={openProfile} activeOpacity={0.8}>
          <Image source={{ uri: avatarFor(current) }} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{personName(current)}</Text>
            <Text style={styles.meta}>{timeAgo(current.created_at)}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={showOptions} accessibilityLabel="Post options">
          <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <TouchableWithoutFeedback onPress={onImageTap}>
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={32}
            style={{ width: imageWidth }}
          >
            {current.image_urls.map((url, index) => (
              <Image
                key={`${current.id}-${index}`}
                source={{ uri: url }}
                style={[styles.image, { width: imageWidth, height: imageWidth * 1.15 }]}
                resizeMode="contain"
              />
            ))}
          </ScrollView>
          {heartVisible && (
            <View style={styles.heartOverlay} pointerEvents="none">
              <Ionicons name="heart" size={96} color={Colors.white} />
            </View>
          )}
          {current.image_urls.length > 1 && (
            <View style={styles.pageBadge}>
              <Text style={styles.pageBadgeText}>{page + 1}/{current.image_urls.length}</Text>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => like()} style={styles.iconButton} accessibilityLabel={current.liked_by_me ? 'Unlike' : 'Like'}>
          <Ionicons name={current.liked_by_me ? 'heart' : 'heart-outline'} size={27} color={current.liked_by_me ? Colors.primary : Colors.textPrimary} />
        </TouchableOpacity>
        {current.image_urls.length > 1 && (
          <View style={styles.dots}>
            {current.image_urls.map((_, index) => (
              <View key={index} style={[styles.dot, index === page && styles.dotActive]} />
            ))}
          </View>
        )}
        <View style={{ flex: 1 }} />
        {listingActive && (
          <TouchableOpacity
            style={styles.shopChip}
            onPress={() => navigation.navigate('ProductDetail', { listingId: current.tagged_listing_id })}
          >
            <Ionicons name="pricetag" size={14} color={Colors.primary} />
            <Text style={styles.shopChipText} numberOfLines={1}>
              {current.listing_title}{current.listing_price_cents != null ? ` · ${formatUsd(current.listing_price_cents)}` : ''}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.body}>
        {current.likes_count > 0 && (
          <Text style={styles.likes}>{current.likes_count} like{current.likes_count === 1 ? '' : 's'}</Text>
        )}
        {!!current.caption && (
          <Text style={styles.caption}>
            <Text style={styles.captionName} onPress={openProfile}>{personName(current)} </Text>
            {current.caption}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, paddingBottom: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.cardBorder },
  name: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  meta: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, marginTop: 1 },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  image: { backgroundColor: '#FFFDF9' },
  heartOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', opacity: 0.92 },
  pageBadge: { position: 'absolute', top: Spacing.md, right: Spacing.md, backgroundColor: 'rgba(26,26,26,0.7)', borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  pageBadgeText: { color: Colors.white, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xs, paddingTop: Spacing.xs, gap: Spacing.xs },
  dots: { flexDirection: 'row', gap: 4, marginLeft: Spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.lightGray },
  dotActive: { backgroundColor: Colors.primary },
  shopChip: { maxWidth: '62%', flexDirection: 'row', alignItems: 'center', gap: 5, marginRight: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.primaryLight, backgroundColor: '#FFF6F4' },
  shopChipText: { flexShrink: 1, color: Colors.textPrimary, fontSize: Typography.fontSize.xs, fontWeight: '800' },
  body: { paddingHorizontal: Spacing.md, gap: 3 },
  likes: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  caption: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, lineHeight: 19 },
  captionName: { fontWeight: '800' },
});
