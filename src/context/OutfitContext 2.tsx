import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// Test user ID (hardcoded for now)
const TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000";

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
  addOccasion: (name: string) => Promise<void>;
  deleteOccasion: (id: string) => Promise<void>;
  saveOutfit: (outfit: Omit<Outfit, "id" | "created_at">) => Promise<void>;
  sharePost: (caption: string, outfitId: string | null) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  loadOccasions: () => Promise<void>;
  loadOutfits: () => Promise<void>;
  loadSocialPosts: () => Promise<void>;
}

const OutfitContext = createContext<OutfitContextType | undefined>(undefined);

export const OutfitProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all data on mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.all([loadOccasions(), loadOutfits(), loadSocialPosts()]);
      } catch (error) {
        console.error("Error initializing data:", error);
      } finally {
        setLoading(false);
      }
    };
    initializeData();
  }, []);

  const loadOccasions = async () => {
    try {
      const { data, error } = await supabase
        .from("occasions")
        .select("*")
        .eq("user_id", TEST_USER_ID)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setOccasions(data || []);
    } catch (error) {
      console.error("Error loading occasions:", error);
    }
  };

  const loadOutfits = async () => {
    try {
      const { data, error } = await supabase
        .from("outfits")
        .select("*")
        .eq("user_id", TEST_USER_ID)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOutfits(data || []);
    } catch (error) {
      console.error("Error loading outfits:", error);
    }
  };

  const loadSocialPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("social_posts")
        .select(
          `
          *,
          users:user_id (username, avatar_url)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const posts = (data || []).map((post: any) => ({
        ...post,
        username: post.users?.username || "Anonymous",
        avatar_url: post.users?.avatar_url,
      }));
      setSocialPosts(posts);
    } catch (error) {
      console.error("Error loading social posts:", error);
    }
  };

  const addOccasion = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from("occasions")
        .insert([
          {
            user_id: TEST_USER_ID,
            name,
          },
        ])
        .select();

      if (error) throw error;
      if (data) {
        setOccasions((prev) => [...prev, data[0]]);
      }
    } catch (error) {
      console.error("Error adding occasion:", error);
      throw error;
    }
  };

  const deleteOccasion = async (id: string) => {
    try {
      const { error } = await supabase
        .from("occasions")
        .delete()
        .eq("id", id)
        .eq("user_id", TEST_USER_ID);

      if (error) throw error;
      setOccasions((prev) => prev.filter((o) => o.id !== id));
    } catch (error) {
      console.error("Error deleting occasion:", error);
      throw error;
    }
  };

  const saveOutfit = async (outfit: Omit<Outfit, "id" | "created_at">) => {
    try {
      const { data, error } = await supabase
        .from("outfits")
        .insert([
          {
            user_id: TEST_USER_ID,
            ...outfit,
          },
        ])
        .select();

      if (error) throw error;
      if (data) {
        setOutfits((prev) => [data[0], ...prev]);
      }
    } catch (error) {
      console.error("Error saving outfit:", error);
      throw error;
    }
  };

  const sharePost = async (caption: string, outfitId: string | null) => {
    try {
      const { data, error } = await supabase
        .from("social_posts")
        .insert([
          {
            user_id: TEST_USER_ID,
            outfit_id: outfitId,
            caption,
            likes_count: 0,
            comments_count: 0,
          },
        ])
        .select();

      if (error) throw error;
      if (data) {
        // Reload social posts to get the new post with user info
        await loadSocialPosts();
      }
    } catch (error) {
      console.error("Error sharing post:", error);
      throw error;
    }
  };

  const toggleLike = async (postId: string) => {
    try {
      // Check if user already liked this post
      const { data: existingLike, error: checkError } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", TEST_USER_ID)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      if (existingLike) {
        // Unlike: delete the like
        const { error: deleteError } = await supabase
          .from("post_likes")
          .delete()
          .eq("id", existingLike.id);

        if (deleteError) throw deleteError;

        // Decrement likes count
        await supabase
          .from("social_posts")
          .update({
            likes_count: Math.max(
              0,
              (socialPosts.find((p) => p.id === postId)?.likes_count || 1) - 1,
            ),
          })
          .eq("id", postId);
      } else {
        // Like: insert a new like
        const { error: insertError } = await supabase
          .from("post_likes")
          .insert([
            {
              post_id: postId,
              user_id: TEST_USER_ID,
            },
          ]);

        if (insertError) throw insertError;

        // Increment likes count
        await supabase
          .from("social_posts")
          .update({
            likes_count:
              (socialPosts.find((p) => p.id === postId)?.likes_count || 0) + 1,
          })
          .eq("id", postId);
      }

      // Reload posts
      await loadSocialPosts();
    } catch (error) {
      console.error("Error toggling like:", error);
      throw error;
    }
  };

  const value: OutfitContextType = {
    occasions,
    outfits,
    socialPosts,
    addOccasion,
    deleteOccasion,
    saveOutfit,
    sharePost,
    toggleLike,
    loadOccasions,
    loadOutfits,
    loadSocialPosts,
  };

  return (
    <OutfitContext.Provider value={value}>{children}</OutfitContext.Provider>
  );
};

export const useOutfit = () => {
  const context = useContext(OutfitContext);
  if (!context) {
    throw new Error("useOutfit must be used within OutfitProvider");
  }
  return context;
};
