import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  Outfit,
  MOCK_OUTFITS,
  SocialPost,
  MOCK_SOCIAL_POSTS,
} from "../data/mockData";

export interface SavedOutfit extends Outfit {
  outfitCategory: string;
}

interface OutfitContextType {
  savedOutfits: SavedOutfit[];
  categories: string[];
  addOutfit: (outfit: SavedOutfit) => void;
  removeOutfit: (id: string) => void;
  addCategory: (name: string) => void;
  removeCategory: (name: string) => void;
  // Social feed
  socialPosts: SocialPost[];
  sharePost: (post: SocialPost) => void;
  toggleLike: (postId: string) => void;
}

const OutfitContext = createContext<OutfitContextType | undefined>(undefined);

const SEED_OUTFITS: SavedOutfit[] = [
  { ...MOCK_OUTFITS[0], outfitCategory: "Casual" },
  { ...MOCK_OUTFITS[1], outfitCategory: "Work" },
  { ...MOCK_OUTFITS[2], outfitCategory: "Brunch" },
];

const SEED_CATEGORIES = [
  "Casual",
  "Work",
  "Brunch",
  "Evening",
  "Travel",
  "Weekend",
  "Sport",
];

export function OutfitProvider({ children }: { children: ReactNode }) {
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>(SEED_OUTFITS);
  const [categories, setCategories] = useState<string[]>(SEED_CATEGORIES);
  const [socialPosts, setSocialPosts] =
    useState<SocialPost[]>(MOCK_SOCIAL_POSTS);

  const addOutfit = useCallback((outfit: SavedOutfit) => {
    setCategories((prev) => {
      const tags = outfit.outfitCategory
        ? outfit.outfitCategory
            .split(", ")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
      let updated = [...prev];
      tags.forEach((tag) => {
        if (!updated.includes(tag)) updated = [...updated, tag];
      });
      return updated;
    });
    setSavedOutfits((prev) => [outfit, ...prev]);
  }, []);

  const removeOutfit = useCallback((id: string) => {
    setSavedOutfits((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const addCategory = useCallback((name: string) => {
    setCategories((prev) => (prev.includes(name) ? prev : [...prev, name]));
  }, []);

  const removeCategory = useCallback((name: string) => {
    setCategories((prev) => prev.filter((c) => c !== name));
    setSavedOutfits((prev) => prev.filter((o) => o.outfitCategory !== name));
  }, []);

  const sharePost = useCallback((post: SocialPost) => {
    setSocialPosts((prev) => [post, ...prev]);
  }, []);

  const toggleLike = useCallback((postId: string) => {
    setSocialPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              isLiked: !p.isLiked,
              likes: p.isLiked ? p.likes - 1 : p.likes + 1,
            }
          : p,
      ),
    );
  }, []);

  return (
    <OutfitContext.Provider
      value={{
        savedOutfits,
        categories,
        addOutfit,
        removeOutfit,
        addCategory,
        removeCategory,
        socialPosts,
        sharePost,
        toggleLike,
      }}
    >
      {children}
    </OutfitContext.Provider>
  );
}

export function useOutfits() {
  const context = useContext(OutfitContext);
  if (!context) {
    throw new Error("useOutfits must be used within an OutfitProvider");
  }
  return context;
}
