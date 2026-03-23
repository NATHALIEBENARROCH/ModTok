import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ClothingItem, Outfit, MOCK_CLOSET_ITEMS, MOCK_OUTFITS } from '../data/mockData';

interface ClosetContextType {
  items: ClothingItem[];
  outfits: Outfit[];
  addItem: (item: ClothingItem) => void;
  removeItem: (id: string) => void;
  toggleFavorite: (id: string) => void;
  addOutfit: (outfit: Outfit) => void;
  removeOutfit: (id: string) => void;
  getItemsByCategory: (category: string) => ClothingItem[];
  getFavoriteItems: () => ClothingItem[];
  getItemsForSale: () => ClothingItem[];
  totalItems: number;
  totalOutfits: number;
}

const ClosetContext = createContext<ClosetContextType | undefined>(undefined);

export function ClosetProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ClothingItem[]>(MOCK_CLOSET_ITEMS);
  const [outfits, setOutfits] = useState<Outfit[]>(MOCK_OUTFITS);

  const addItem = useCallback((item: ClothingItem) => {
    setItems((prev) => [item, ...prev]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      )
    );
  }, []);

  const addOutfit = useCallback((outfit: Outfit) => {
    setOutfits((prev) => [outfit, ...prev]);
  }, []);

  const removeOutfit = useCallback((id: string) => {
    setOutfits((prev) => prev.filter((outfit) => outfit.id !== id));
  }, []);

  const getItemsByCategory = useCallback(
    (category: string) =>
      category === 'All' ? items : items.filter((item) => item.category === category),
    [items]
  );

  const getFavoriteItems = useCallback(
    () => items.filter((item) => item.isFavorite),
    [items]
  );

  const getItemsForSale = useCallback(
    () => items.filter((item) => item.forSale),
    [items]
  );

  return (
    <ClosetContext.Provider
      value={{
        items,
        outfits,
        addItem,
        removeItem,
        toggleFavorite,
        addOutfit,
        removeOutfit,
        getItemsByCategory,
        getFavoriteItems,
        getItemsForSale,
        totalItems: items.length,
        totalOutfits: outfits.length,
      }}
    >
      {children}
    </ClosetContext.Provider>
  );
}

export function useCloset() {
  const context = useContext(ClosetContext);
  if (!context) {
    throw new Error('useCloset must be used within a ClosetProvider');
  }
  return context;
}
