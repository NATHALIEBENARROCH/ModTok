import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ClothingItem {
  id: string;
  name: string;
  category: string;
  brand?: string;
  color?: string;
  size?: string;
  season?: string;
  price?: number;
  image?: string;       // local URI (before upload) or remote URL
  image_url?: string;   // persisted Supabase Storage URL
  tags: string[];
  isFavorite: boolean;
  forSale?: boolean;
  salePrice?: number;
  notes?: string;
  addedDate: string;
}

export interface Outfit {
  id: string;
  name: string;
  items: ClothingItem[];
  item_ids?: string[];
  occasion?: string;
  season?: string;
  createdDate: string;
  isShared: boolean;
  likes: number;
}

interface ClosetContextType {
  items: ClothingItem[];
  outfits: Outfit[];
  loading: boolean;
  addItem: (item: Omit<ClothingItem, 'id' | 'addedDate'>) => Promise<ClothingItem | null>;
  removeItem: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  addOutfit: (outfit: Omit<Outfit, 'id' | 'createdDate' | 'likes'>) => Promise<void>;
  removeOutfit: (id: string) => Promise<void>;
  getItemsByCategory: (category: string) => ClothingItem[];
  getFavoriteItems: () => ClothingItem[];
  getItemsForSale: () => ClothingItem[];
  searchItems: (query: string) => ClothingItem[];
  totalItems: number;
  totalOutfits: number;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ClosetContext = createContext<ClosetContextType | undefined>(undefined);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rowToItem(row: any): ClothingItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category ?? 'Other',
    brand: row.brand,
    color: row.color,
    size: row.size,
    season: row.season,
    price: row.price,
    image: row.image_url,
    image_url: row.image_url,
    tags: row.tags ?? [],
    isFavorite: row.is_favorite ?? false,
    forSale: row.for_sale ?? false,
    salePrice: row.sale_price,
    notes: row.notes,
    addedDate: row.added_date ?? row.created_at?.split('T')[0] ?? '',
  };
}

function rowToOutfit(row: any, allItems: ClothingItem[]): Outfit {
  const itemIds: string[] = row.item_ids ?? [];
  const items = itemIds
    .map((id) => allItems.find((i) => i.id === id))
    .filter(Boolean) as ClothingItem[];
  return {
    id: row.id,
    name: row.name,
    items,
    item_ids: itemIds,
    occasion: row.occasion,
    season: row.season,
    createdDate: row.created_date ?? row.created_at?.split('T')[0] ?? '',
    isShared: row.is_shared ?? false,
    likes: row.likes ?? 0,
  };
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ClosetProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setItems([]);
          setOutfits([]);
          setLoading(false);
          return;
        }

        const [{ data: itemRows }, { data: outfitRows }] = await Promise.all([
          supabase
            .from('closet_items')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('outfits')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        ]);

        if (!active) return;

        const mappedItems = (itemRows ?? []).map(rowToItem);
        const mappedOutfits = (outfitRows ?? []).map((r) => rowToOutfit(r, mappedItems));

        setItems(mappedItems);
        setOutfits(mappedOutfits);
      } catch (err) {
        console.error('ClosetContext loadData error:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadData();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Items ────────────────────────────────────────────────────────────────────

  const addItem = useCallback(
    async (item: Omit<ClothingItem, 'id' | 'addedDate'>): Promise<ClothingItem | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('closet_items')
        .insert({
          user_id: user.id,
          name: item.name,
          category: item.category,
          brand: item.brand,
          color: item.color,
          size: item.size,
          season: item.season,
          price: item.price,
          image_url: item.image_url ?? item.image,
          tags: item.tags,
          is_favorite: item.isFavorite ?? false,
          for_sale: item.forSale ?? false,
          sale_price: item.salePrice,
          notes: item.notes,
        })
        .select()
        .single();

      if (error) {
        console.error('addItem error:', error);
        return null;
      }

      const newItem = rowToItem(data);
      setItems((prev) => [newItem, ...prev]);
      return newItem;
    },
    []
  );

  const removeItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('closet_items').delete().eq('id', id);
    if (!error) setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const toggleFavorite = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const newVal = !item.isFavorite;
      const { error } = await supabase
        .from('closet_items')
        .update({ is_favorite: newVal })
        .eq('id', id);
      if (!error) {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, isFavorite: newVal } : i))
        );
      }
    },
    [items]
  );

  // ── Outfits ──────────────────────────────────────────────────────────────────

  const addOutfit = useCallback(
    async (outfit: Omit<Outfit, 'id' | 'createdDate' | 'likes'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const itemIds = outfit.items.map((i) => i.id);
      const { data, error } = await supabase
        .from('outfits')
        .insert({
          user_id: user.id,
          name: outfit.name,
          item_ids: itemIds,
          occasion: outfit.occasion,
          season: outfit.season,
          is_shared: outfit.isShared ?? false,
        })
        .select()
        .single();

      if (error) {
        console.error('addOutfit error:', error);
        return;
      }

      const newOutfit = rowToOutfit(data, items);
      setOutfits((prev) => [newOutfit, ...prev]);
    },
    [items]
  );

  const removeOutfit = useCallback(async (id: string) => {
    const { error } = await supabase.from('outfits').delete().eq('id', id);
    if (!error) setOutfits((prev) => prev.filter((o) => o.id !== id));
  }, []);

  // ── Selectors ────────────────────────────────────────────────────────────────

  const getItemsByCategory = useCallback(
    (category: string) =>
      category === 'All' ? items : items.filter((i) => i.category === category),
    [items]
  );

  const getFavoriteItems = useCallback(() => items.filter((i) => i.isFavorite), [items]);

  const getItemsForSale = useCallback(() => items.filter((i) => i.forSale), [items]);

  const searchItems = useCallback(
    (query: string) => {
      if (!query.trim()) return items;
      const q = query.toLowerCase();
      return items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.color ?? '').toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          (i.brand ?? '').toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    },
    [items]
  );

  return (
    <ClosetContext.Provider
      value={{
        items,
        outfits,
        loading,
        addItem,
        removeItem,
        toggleFavorite,
        addOutfit,
        removeOutfit,
        getItemsByCategory,
        getFavoriteItems,
        getItemsForSale,
        searchItems,
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
