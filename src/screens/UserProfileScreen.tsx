import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { FeedPost, ProfileDetails, avatarFor, personHandle, personName, useSocial } from '../context/SocialContext';
import FollowButton from '../components/FollowButton';

const MAX_APP_WIDTH = 430;

export default function UserProfileScreen({ navigation, route }: { navigation: any; route: any }) {
  const userId: string = route?.params?.userId;
  const { myUserId, getProfile, getUserPosts, followingIds } = useSocial();
  const { width } = useWindowDimensions();
  const cell = (Math.min(width, MAX_APP_WIDTH) - 4) / 3;
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMe = userId === myUserId;

  const load = useCallback(async () => {
    try {
      const [nextProfile, nextPosts] = await Promise.all([getProfile(userId), getUserPosts(userId)]);
      setProfile(nextProfile);
      setPosts(nextPosts);
      setError(nextProfile ? null : 'This profile is not available.');
    } catch (err: any) {
      setError(err?.message ?? 'Could not load this profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getProfile, getUserPosts, userId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Follower count changes when you follow / unfollow from this screen.
  useEffect(() => {
    if (!loading) void getProfile(userId).then((next) => next && setProfile(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followingIds]);

  const header = (
    <View>
      <View style={styles.profileRow}>
        <Image source={{ uri: avatarFor(profile) }} style={styles.avatar} />
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{posts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <TouchableOpacity style={styles.stat} onPress={() => navigation.push('FollowList', { userId, type: 'followers', name: personName(profile) })}>
            <Text style={styles.statNumber}>{profile?.followers ?? 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stat} onPress={() => navigation.push('FollowList', { userId, type: 'following', name: personName(profile) })}>
            <Text style={styles.statNumber}>{profile?.following ?? 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.bioBlock}>
        <Text style={styles.name}>{personName(profile)}</Text>
        {!!profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        {!!profile?.website && <Text style={styles.website} numberOfLines={1}>{profile.website}</Text>}
      </View>
      <View style={styles.actionRow}>
        {isMe ? (
          <>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('EditProfile')}>
              <Text style={styles.secondaryBtnText}>Edit profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('NewPost')}>
              <Text style={styles.secondaryBtnText}>New post</Text>
            </TouchableOpacity>
          </>
        ) : (
          <FollowButton userId={userId} style={{ flex: 1 }} />
        )}
      </View>
      <View style={styles.gridHeader}>
        <Ionicons name="grid-outline" size={20} color={Colors.textPrimary} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{personHandle(profile) || personName(profile)}</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.emptyText}>{error}</Text></View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(post) => post.id}
          numColumns={3}
          ListHeaderComponent={header}
          columnWrapperStyle={{ gap: 2 }}
          contentContainerStyle={{ gap: 2, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={Colors.primary} />}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => navigation.push('PostDetail', { post: item })} activeOpacity={0.85}>
              <Image source={{ uri: item.image_urls[0] }} style={{ width: cell, height: cell * 1.25, backgroundColor: '#FFFDF9' }} resizeMode="cover" />
              {item.image_urls.length > 1 && (
                <Ionicons name="copy" size={16} color={Colors.white} style={styles.multiIcon} />
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyPosts}>
              <Ionicons name="camera-outline" size={34} color={Colors.mediumGray} />
              <Text style={styles.emptyTitle}>{isMe ? 'Share your first post' : 'No posts yet'}</Text>
              {isMe && <Text style={styles.emptyText}>Post an outfit, a closet piece or a photo. Your followers will see it in their feed.</Text>}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: Colors.textPrimary, fontSize: Typography.fontSize.md, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  profileRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, gap: Spacing.lg },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: Colors.cardBorder },
  stats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', minWidth: 64 },
  statNumber: { color: Colors.textPrimary, fontSize: Typography.fontSize.md, fontWeight: '800' },
  statLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, marginTop: 1 },
  bioBlock: { paddingHorizontal: Spacing.base, paddingTop: Spacing.md, gap: 2 },
  name: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '800' },
  bio: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, lineHeight: 19 },
  website: { color: Colors.primaryDark, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.base, paddingTop: Spacing.md },
  secondaryBtn: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: Colors.cardBorder, backgroundColor: Colors.white },
  secondaryBtnText: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  gridHeader: { alignItems: 'center', paddingVertical: Spacing.sm, marginTop: Spacing.base, borderTopWidth: 1, borderTopColor: Colors.cardBorder },
  multiIcon: { position: 'absolute', top: 6, right: 6 },
  emptyPosts: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.xs },
  emptyTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '800' },
  emptyText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, textAlign: 'center', lineHeight: 20 },
});
