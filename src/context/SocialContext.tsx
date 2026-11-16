import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export type FeedPostKind = 'outfit' | 'item' | 'photo';

export interface FeedPost {
  id: string;
  user_id: string;
  kind: FeedPostKind;
  outfit_id: string | null;
  closet_item_id: string | null;
  tagged_listing_id: string | null;
  caption: string;
  image_urls: string[];
  likes_count: number;
  created_at: string;
  liked_by_me: boolean;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  listing_title: string | null;
  listing_price_cents: number | null;
  listing_status: string | null;
}

export interface PersonSummary {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  followers: number;
  following: number;
  is_following: boolean;
}

export interface ProfileDetails {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  followers: number;
  following: number;
}

export interface NewFeedPost {
  kind: FeedPostKind;
  caption: string;
  image_urls: string[];
  outfit_id?: string | null;
  closet_item_id?: string | null;
  tagged_listing_id?: string | null;
}

const PAGE_SIZE = 20;

interface SocialContextType {
  myUserId: string | null;
  myProfile: ProfileDetails | null;
  followingIds: Set<string>;
  feed: FeedPost[];
  feedLoading: boolean;
  feedRefreshing: boolean;
  feedHasMore: boolean;
  /** Set when the 1.2 database setup has not been run yet. */
  setupMissing: boolean;
  refreshFeed: () => Promise<void>;
  loadMoreFeed: () => Promise<void>;
  isFollowing: (userId: string) => boolean;
  follow: (userId: string) => Promise<void>;
  unfollow: (userId: string) => Promise<void>;
  toggleLike: (post: FeedPost) => Promise<FeedPost>;
  createPost: (post: NewFeedPost) => Promise<FeedPost | null>;
  deletePost: (postId: string) => Promise<void>;
  reportPost: (postId: string, reason: string) => Promise<void>;
  searchPeople: (term: string) => Promise<PersonSummary[]>;
  getProfile: (userId: string) => Promise<ProfileDetails | null>;
  getUserPosts: (userId: string) => Promise<FeedPost[]>;
  getFollowList: (userId: string, type: 'followers' | 'following') => Promise<PersonSummary[]>;
  updateMyProfile: (changes: Partial<Pick<ProfileDetails, 'username' | 'display_name' | 'bio' | 'website' | 'avatar_url'>>) => Promise<void>;
  reloadMyProfile: () => Promise<void>;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

function isMissingSetup(error: any) {
  const code = error?.code ?? '';
  const message = String(error?.message ?? '');
  // 42883 / PGRST202: function missing. 42P01 / PGRST205: table missing.
  return ['42883', '42P01', 'PGRST202', 'PGRST205'].includes(code) || /does not exist|Could not find the function/i.test(message);
}

function normalizePost(row: any): FeedPost {
  return {
    ...row,
    image_urls: row.image_urls ?? [],
    likes_count: row.likes_count ?? 0,
    liked_by_me: Boolean(row.liked_by_me),
    caption: row.caption ?? '',
  } as FeedPost;
}

/** Name to show for a person: their display name, else their @username. */
export function personName(person: { display_name?: string | null; username?: string | null } | null | undefined) {
  return person?.display_name?.trim() || person?.username?.replace(/^@/, '') || 'ModTok member';
}

export function personHandle(person: { username?: string | null } | null | undefined) {
  const username = person?.username?.trim();
  if (!username) return '';
  return username.startsWith('@') ? username : `@${username}`;
}

export function avatarFor(person: { avatar_url?: string | null; display_name?: string | null; username?: string | null } | null | undefined) {
  if (person?.avatar_url) return person.avatar_url;
  return `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(personName(person))}`;
}

export function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 52) return `${weeks}w`;
  return `${Math.floor(days / 365)}y`;
}

export const SocialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<ProfileDetails | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedRefreshing, setFeedRefreshing] = useState(false);
  const [feedHasMore, setFeedHasMore] = useState(false);
  const [setupMissing, setSetupMissing] = useState(false);

  const getProfile = useCallback(async (userId: string): Promise<ProfileDetails | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      username: data.username ?? null,
      display_name: data.display_name ?? null,
      avatar_url: data.avatar_url ?? null,
      bio: data.bio ?? null,
      website: data.website ?? null,
      followers: data.followers ?? 0,
      following: data.following ?? 0,
    };
  }, []);

  const reloadMyProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setMyUserId(user?.id ?? null);
    if (!user) {
      setMyProfile(null);
      return;
    }
    setMyProfile(await getProfile(user.id));
  }, [getProfile]);

  const loadFollowing = useCallback(async (userId: string | null) => {
    if (!userId) {
      setFollowingIds(new Set());
      return;
    }
    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);
    if (error) {
      if (isMissingSetup(error)) setSetupMissing(true);
      return;
    }
    setFollowingIds(new Set((data ?? []).map((row: any) => row.following_id)));
  }, []);

  const fetchFeedPage = useCallback(async (before: string | null) => {
    const { data, error } = await supabase.rpc('get_home_feed', { before, page_size: PAGE_SIZE });
    if (error) {
      if (isMissingSetup(error)) setSetupMissing(true);
      else console.warn('Could not load feed:', error.message);
      return null;
    }
    setSetupMissing(false);
    return ((data ?? []) as any[]).map(normalizePost);
  }, []);

  const refreshFeed = useCallback(async () => {
    setFeedRefreshing(true);
    const { data: { user } } = await supabase.auth.getUser();
    setMyUserId(user?.id ?? null);
    await loadFollowing(user?.id ?? null);
    const page = user ? await fetchFeedPage(null) : [];
    if (page) {
      setFeed(page);
      setFeedHasMore(page.length === PAGE_SIZE);
    }
    setFeedRefreshing(false);
    setFeedLoading(false);
  }, [fetchFeedPage, loadFollowing]);

  const loadMoreFeed = useCallback(async () => {
    if (!feedHasMore || feedRefreshing || feed.length === 0) return;
    const last = feed[feed.length - 1];
    const page = await fetchFeedPage(last.created_at);
    if (!page) return;
    setFeed((previous) => {
      const seen = new Set(previous.map((post) => post.id));
      return [...previous, ...page.filter((post) => !seen.has(post.id))];
    });
    setFeedHasMore(page.length === PAGE_SIZE);
  }, [feed, feedHasMore, feedRefreshing, fetchFeedPage]);

  useEffect(() => {
    void reloadMyProfile();
    void refreshFeed();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void reloadMyProfile();
      void refreshFeed();
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFollowing = useCallback((userId: string) => followingIds.has(userId), [followingIds]);

  const follow = useCallback(async (userId: string) => {
    if (!myUserId) throw new Error('Please sign in again.');
    setFollowingIds((previous) => new Set(previous).add(userId));
    const { error } = await supabase.from('follows').upsert(
      { follower_id: myUserId, following_id: userId },
      { onConflict: 'follower_id,following_id', ignoreDuplicates: true },
    );
    if (error) {
      setFollowingIds((previous) => {
        const next = new Set(previous);
        next.delete(userId);
        return next;
      });
      throw error;
    }
    void reloadMyProfile();
    void refreshFeed();
  }, [myUserId, refreshFeed, reloadMyProfile]);

  const unfollow = useCallback(async (userId: string) => {
    if (!myUserId) throw new Error('Please sign in again.');
    setFollowingIds((previous) => {
      const next = new Set(previous);
      next.delete(userId);
      return next;
    });
    setFeed((previous) => previous.filter((post) => post.user_id !== userId));
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', myUserId)
      .eq('following_id', userId);
    if (error) {
      setFollowingIds((previous) => new Set(previous).add(userId));
      void refreshFeed();
      throw error;
    }
    void reloadMyProfile();
  }, [myUserId, refreshFeed, reloadMyProfile]);

  const toggleLike = useCallback(async (post: FeedPost): Promise<FeedPost> => {
    if (!myUserId) throw new Error('Please sign in again.');
    const liked = !post.liked_by_me;
    const updated: FeedPost = {
      ...post,
      liked_by_me: liked,
      likes_count: Math.max(0, post.likes_count + (liked ? 1 : -1)),
    };
    setFeed((previous) => previous.map((item) => (item.id === post.id ? updated : item)));
    const { error } = liked
      ? await supabase.from('post_likes').upsert(
          { post_id: post.id, user_id: myUserId },
          { onConflict: 'post_id,user_id', ignoreDuplicates: true },
        )
      : await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', myUserId);
    if (error) {
      setFeed((previous) => previous.map((item) => (item.id === post.id ? post : item)));
      throw error;
    }
    return updated;
  }, [myUserId]);

  const createPost = useCallback(async (post: NewFeedPost): Promise<FeedPost | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('feed_posts')
      .insert({
        user_id: user.id,
        kind: post.kind,
        caption: post.caption,
        image_urls: post.image_urls,
        outfit_id: post.outfit_id ?? null,
        closet_item_id: post.closet_item_id ?? null,
        tagged_listing_id: post.tagged_listing_id ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    const profile = myProfile ?? (await getProfile(user.id));
    const created = normalizePost({
      ...data,
      liked_by_me: false,
      username: profile?.username ?? null,
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      listing_title: null,
      listing_price_cents: null,
      listing_status: null,
    });
    setFeed((previous) => [created, ...previous]);
    // Reload so the tagged listing's name and price come back from the server.
    if (created.tagged_listing_id) void refreshFeed();
    return created;
  }, [getProfile, myProfile, refreshFeed]);

  const deletePost = useCallback(async (postId: string) => {
    const { error } = await supabase.from('feed_posts').delete().eq('id', postId);
    if (error) throw error;
    setFeed((previous) => previous.filter((post) => post.id !== postId));
  }, []);

  const reportPost = useCallback(async (postId: string, reason: string) => {
    if (!myUserId) throw new Error('Please sign in again.');
    const { error } = await supabase.from('marketplace_reports').insert({
      reporter_id: myUserId,
      target_type: 'post',
      target_id: postId,
      reason,
    });
    if (error) throw error;
  }, [myUserId]);

  const searchPeople = useCallback(async (term: string): Promise<PersonSummary[]> => {
    const { data, error } = await supabase.rpc('search_people', { term, max_results: 30 });
    if (error) {
      if (isMissingSetup(error)) setSetupMissing(true);
      throw error;
    }
    return (data ?? []) as PersonSummary[];
  }, []);

  const getUserPosts = useCallback(async (userId: string): Promise<FeedPost[]> => {
    const { data, error } = await supabase.rpc('get_user_posts', { profile_id: userId, before: null, page_size: 60 });
    if (error) {
      if (isMissingSetup(error)) setSetupMissing(true);
      throw error;
    }
    return ((data ?? []) as any[]).map(normalizePost);
  }, []);

  const getFollowList = useCallback(async (userId: string, type: 'followers' | 'following'): Promise<PersonSummary[]> => {
    const { data, error } = await supabase.rpc('get_follow_list', { profile_id: userId, list_type: type });
    if (error) throw error;
    return (data ?? []) as PersonSummary[];
  }, []);

  const updateMyProfile = useCallback(async (
    changes: Partial<Pick<ProfileDetails, 'username' | 'display_name' | 'bio' | 'website' | 'avatar_url'>>,
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Please sign in again.');
    const { error } = await supabase.from('profiles').update(changes).eq('id', user.id);
    if (error) {
      if (error.code === '23505') throw new Error('That username is taken. Please try another one.');
      throw error;
    }
    await reloadMyProfile();
    // Your name shows on your own posts in the feed.
    void refreshFeed();
  }, [refreshFeed, reloadMyProfile]);

  const value = useMemo<SocialContextType>(() => ({
    myUserId,
    myProfile,
    followingIds,
    feed,
    feedLoading,
    feedRefreshing,
    feedHasMore,
    setupMissing,
    refreshFeed,
    loadMoreFeed,
    isFollowing,
    follow,
    unfollow,
    toggleLike,
    createPost,
    deletePost,
    reportPost,
    searchPeople,
    getProfile,
    getUserPosts,
    getFollowList,
    updateMyProfile,
    reloadMyProfile,
  }), [
    myUserId, myProfile, followingIds, feed, feedLoading, feedRefreshing, feedHasMore, setupMissing,
    refreshFeed, loadMoreFeed, isFollowing, follow, unfollow, toggleLike, createPost, deletePost,
    reportPost, searchPeople, getProfile, getUserPosts, getFollowList, updateMyProfile, reloadMyProfile,
  ]);

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
};

export function useSocial() {
  const context = useContext(SocialContext);
  if (!context) throw new Error('useSocial must be used within a SocialProvider');
  return context;
}
