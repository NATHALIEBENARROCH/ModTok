import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Outfit {
  id: string;
  name: string;
  occasion_id: string | null;
  item_ids: string[];
  created_at: string;
}

export interface Occasion {
  id: string;
  name: string;
  created_at: string;
}

export interface SocialPost {
  id: string;
  user_id: string;
  outfit_id: string | null;
  caption: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  username?: string;
  avatar_url?: string;
}

interface OutfitContextType {
  occasions: Occasion[];
  outfits: Outfit[];
  socialPosts: SocialPost[];
  categories: string[];
  loading: boolean;
  addOccasion: (name: string) => Promise<void>;
  deleteOccasion: (id: string) => Promise<void>;
  saveOutfit: (outfit: Omit<Outfit, 'id' | 'created_at'>) => Promise<void>;
  addOutfit: (outfit: any) => Promise<void>;
  sharePost: (captionOrPost: any, outfitId?: string | null) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  loadOccasions: () => Promise<void>;
  loadOutfits: () => Promise<void>;
  loadSocialPosts: () => Promise<void>;
}

const OutfitContext = createContext<OutfitContextType | undefined>(undefined);

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export const OutfitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOccasions = useCallback(async () => {
    const userId = await getCurrentUserId();
    if (!userId) {
      setOccasions([]);
      return;
    }
    const { data, error } = await supabase
      .from('occasions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('Could not load occasions:', error.message);
      setOccasions([]);
      return;
    }
    setOccasions((data ?? []) as Occasion[]);
  }, []);

  const loadOutfits = useCallback(async () => {
    const userId = await getCurrentUserId();
    if (!userId) {
      setOutfits([]);
      return;
    }
    const { data, error } = await supabase
      .from('outfits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('Could not load outfits:', error.message);
      setOutfits([]);
      return;
    }
    setOutfits(
      (data ?? []).map((row: any) => ({
        id: row.id,
        name: row.name,
        occasion_id: row.occasion_id ?? null,
        item_ids: row.item_ids ?? [],
        created_at: row.created_at,
      }))
    );
  }, []);

  const loadSocialPosts = useCallback(async () => {
    const userId = await getCurrentUserId();
    if (!userId) {
      setSocialPosts([]);
      return;
    }
    const { data, error } = await supabase
      .from('social_posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('Could not load social posts:', error.message);
      setSocialPosts([]);
      return;
    }
    setSocialPosts((data ?? []) as SocialPost[]);
  }, []);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadOccasions(), loadOutfits(), loadSocialPosts()]);
    setLoading(false);
  }, [loadOccasions, loadOutfits, loadSocialPosts]);

  useEffect(() => {
    void reloadAll();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void reloadAll();
    });
    return () => subscription.unsubscribe();
  }, [reloadAll]);

  const addOccasion = useCallback(async (name: string) => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const { data, error } = await supabase
      .from('occasions')
      .insert({ user_id: userId, name })
      .select()
      .single();
    if (error) throw error;
    if (data) setOccasions((previous) => [...previous, data as Occasion]);
  }, []);

  const deleteOccasion = useCallback(async (id: string) => {
    const { error } = await supabase.from('occasions').delete().eq('id', id);
    if (error) throw error;
    setOccasions((previous) => previous.filter((occasion) => occasion.id !== id));
  }, []);

  const saveOutfit = useCallback(async (outfit: Omit<Outfit, 'id' | 'created_at'>) => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const { data, error } = await supabase
      .from('outfits')
      .insert({
        user_id: userId,
        name: outfit.name,
        item_ids: outfit.item_ids,
        occasion_id: outfit.occasion_id,
      })
      .select()
      .single();
    if (error) throw error;
    if (data) {
      setOutfits((previous) => [
        {
          id: data.id,
          name: data.name,
          occasion_id: data.occasion_id ?? null,
          item_ids: data.item_ids ?? [],
          created_at: data.created_at,
        },
        ...previous,
      ]);
    }
  }, []);

  const addOutfit = useCallback(async (outfit: any) => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const { data, error } = await supabase
      .from('outfits')
      .insert({
        user_id: userId,
        name: outfit.name || 'Untitled Outfit',
        item_ids: (outfit.items ?? []).map((item: any) => item.id),
        occasion: outfit.occasion ?? outfit.outfitCategory ?? null,
        season: outfit.season ?? null,
        is_shared: outfit.isShared ?? false,
      })
      .select()
      .single();
    if (error) throw error;
    if (data) {
      setOutfits((previous) => [
        {
          id: data.id,
          name: data.name,
          occasion_id: data.occasion_id ?? null,
          item_ids: data.item_ids ?? [],
          created_at: data.created_at,
        },
        ...previous,
      ]);
    }
  }, []);

  const sharePost = useCallback(async (captionOrPost: any, outfitId?: string | null) => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const isObject = typeof captionOrPost === 'object' && captionOrPost !== null;
    const { data, error } = await supabase
      .from('social_posts')
      .insert({
        user_id: userId,
        outfit_id: isObject ? captionOrPost.outfit?.id ?? null : outfitId ?? null,
        caption: isObject ? captionOrPost.caption ?? '' : captionOrPost,
        likes_count: 0,
        comments_count: 0,
      })
      .select()
      .single();
    if (error) throw error;
    if (data) setSocialPosts((previous) => [data as SocialPost, ...previous]);
  }, []);

  const toggleLike = useCallback(async (postId: string) => {
    setSocialPosts((previous) =>
      previous.map((post) =>
        post.id === postId
          ? { ...post, likes_count: (post.likes_count ?? 0) + 1 }
          : post
      )
    );
  }, []);

  const value = useMemo<OutfitContextType>(() => ({
    occasions,
    outfits,
    socialPosts,
    categories: occasions.map((occasion) => occasion.name),
    loading,
    addOccasion,
    deleteOccasion,
    saveOutfit,
    addOutfit,
    sharePost,
    toggleLike,
    loadOccasions,
    loadOutfits,
    loadSocialPosts,
  }), [
    occasions,
    outfits,
    socialPosts,
    loading,
    addOccasion,
    deleteOccasion,
    saveOutfit,
    addOutfit,
    sharePost,
    toggleLike,
    loadOccasions,
    loadOutfits,
    loadSocialPosts,
  ]);

  return <OutfitContext.Provider value={value}>{children}</OutfitContext.Provider>;
};

export const useOutfit = () => {
  const context = useContext(OutfitContext);
  if (!context) throw new Error('useOutfit must be used within OutfitProvider');
  return context;
};

// Kept as an alias for StyleScreen and ShareScreen.
export const useOutfits = useOutfit;
