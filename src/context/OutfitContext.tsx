import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { Outfit, MOCK_OUTFITS } from "../data/mockData";

export interface SavedOutfit extends Outfit {
  outfitCategory: string; // the user-defined category e.g. "Spring Brunch"
}

interface OutfitContextType {
  savedOutfits: SavedOutfit[];
  categories: string[];
  addOutfit: (outfit: SavedOutfit) => void;
  removeOutfit: (id: string) => void;
  addCategory: (name: string) => void;
  removeCategory: (name: string) => void;
}

const OutfitContext = createContext<OutfitContextType | undefined>(undefined);

// Seed with mock data so the Save screen looks populated from the start
const SEED_OUTFITS: SavedOutfit[] = [
  { ...MOCK_OUTFITS[0], outfitCategory: "Casual" },
  { ...MOCK_OUTFITS[1], outfitCategory: "Work" },
  { ...MOCK_OUTFITS[2], outfitCategory: "Brunch" },
];

const SEED_CATEGORIES = ["Casual", "Work", "Brunch", "Evening", "Travel"];

export function OutfitProvider({ children }: { children: ReactNode }) {
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>(SEED_OUTFITS);
  const [categories, setCategories] = useState<string[]>(SEED_CATEGORIES);

  const addOutfit = useCallback((outfit: SavedOutfit) => {
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

  return (
    <OutfitContext.Provider
      value={{
        savedOutfits,
        categories,
        addOutfit,
        removeOutfit,
        addCategory,
        removeCategory,
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
