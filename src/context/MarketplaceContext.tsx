import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  BundleDiscount,
  DEFAULT_SHIPPING_RATES,
  ListingCondition,
  MarketplaceListing,
  MarketplaceOrder,
  PackageSize,
  SellerAccountStatus,
  ShippingAddress,
  ShippingRate,
} from '../types/marketplace';

export const LISTING_SELECT = `
  *,
  seller:profiles!marketplace_listings_seller_id_fkey(id, username, display_name, avatar_url),
  pieces:marketplace_outfit_pieces!marketplace_outfit_pieces_outfit_fkey(*)
`;

function sortPieces(rows: any[] | null): MarketplaceListing[] {
  return ((rows ?? []) as MarketplaceListing[]).map((listing) => ({
    ...listing,
    pieces: (listing.pieces ?? []).slice().sort((a, b) => a.position - b.position),
  }));
}

const ORDER_SELECT = `
  *,
  buyer:profiles!orders_buyer_id_fkey(id, username, display_name, avatar_url),
  seller:profiles!orders_seller_id_fkey(id, username, display_name, avatar_url)
`;

type NewListing = {
  closet_item_id: string;
  title: string;
  description: string;
  category: string;
  brand?: string;
  size?: string;
  condition: ListingCondition;
  image_urls: string[];
  price_cents: number;
  // The server sets the shipping price from the package size.
  package_size: PackageSize;
};

export type NewOutfitListing = {
  outfit_id: string;
  title: string;
  description: string;
  condition: ListingCondition;
  package_size: PackageSize;
  price_cents: number;
  allow_separate_sale: boolean;
  pieces: { closet_item_id: string; price_cents?: number; package_size?: PackageSize; condition?: ListingCondition }[];
};

export type ShipFromAddress = Omit<ShippingAddress, 'country'> & { country: 'US' };

export type Bundle = { sellerId: string; listingIds: string[] } | null;

type OrderActionPayload = {
  action: 'mark_processing' | 'mark_shipped' | 'confirm_delivered' | 'cancel_checkout' | 'refund' | 'retry_label';
  order_id: string;
  tracking_carrier?: string;
  tracking_number?: string;
  tracking_url?: string;
};

type MarketplaceContextType = {
  listings: MarketplaceListing[];
  myListings: MarketplaceListing[];
  purchases: MarketplaceOrder[];
  sales: MarketplaceOrder[];
  sellerStatus: SellerAccountStatus;
  loading: boolean;
  refreshAll: () => Promise<void>;
  refreshListings: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshSellerStatus: () => Promise<SellerAccountStatus>;
  startSellerOnboarding: () => Promise<string>;
  openSellerDashboard: () => Promise<string>;
  createListing: (listing: NewListing) => Promise<MarketplaceListing>;
  createOutfitListing: (listing: NewOutfitListing) => Promise<MarketplaceListing>;
  archiveListing: (listingId: string) => Promise<void>;
  shippingRates: ShippingRate[];
  shippingRate: (size: PackageSize) => ShippingRate;
  shipFrom: ShipFromAddress | null;
  saveShipFrom: (address: ShipFromAddress) => Promise<void>;
  myBundleDiscount: BundleDiscount | null;
  saveBundleDiscount: (discount: Omit<BundleDiscount, 'seller_id'>) => Promise<void>;
  getBundleDiscount: (sellerId: string) => Promise<BundleDiscount | null>;
  bundle: Bundle;
  addToBundle: (listing: MarketplaceListing) => 'added' | 'already' | 'other_seller';
  startBundleWith: (listing: MarketplaceListing) => void;
  removeFromBundle: (listingId: string) => void;
  clearBundle: () => void;
  runOrderAction: (payload: OrderActionPayload) => Promise<MarketplaceOrder>;
  reportListing: (listingId: string, reason: string, details?: string) => Promise<void>;
  blockSeller: (sellerId: string) => Promise<void>;
};

const EMPTY_SELLER: SellerAccountStatus = {
  connected: false,
  details_submitted: false,
  charges_enabled: false,
  payouts_enabled: false,
};

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

// The server sends its real reason as JSON ({ error: "..." }) in the response body.
// supabase-js exposes that response as `error.context`, which must be read before it
// can be shown; otherwise users only see "Edge Function returned a non-2xx status code".
export async function functionError(error: any, fallback: string): Promise<Error> {
  let serverMessage: string | undefined;
  const response = error?.context;
  if (response && typeof response.json === 'function') {
    try {
      const body = await response.json();
      serverMessage = body?.error || body?.message;
    } catch {
      // Body was empty or not JSON; fall through to the generic message.
    }
  }
  if (!serverMessage && response?.status === 404) {
    serverMessage = 'The marketplace server is not set up yet.';
  }
  const generic = /non-2xx/i.test(error?.message ?? '') ? undefined : error?.message;
  return new Error(serverMessage || generic || fallback);
}

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [purchases, setPurchases] = useState<MarketplaceOrder[]>([]);
  const [sales, setSales] = useState<MarketplaceOrder[]>([]);
  const [sellerStatus, setSellerStatus] = useState<SellerAccountStatus>(EMPTY_SELLER);
  const [loading, setLoading] = useState(true);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>(DEFAULT_SHIPPING_RATES);
  const [shipFrom, setShipFrom] = useState<ShipFromAddress | null>(null);
  const [myBundleDiscount, setMyBundleDiscount] = useState<BundleDiscount | null>(null);
  const [bundle, setBundle] = useState<Bundle>(null);

  const shippingRate = useCallback(
    (size: PackageSize) =>
      shippingRates.find((rate) => rate.package_size === size)
      ?? DEFAULT_SHIPPING_RATES.find((rate) => rate.package_size === size)!,
    [shippingRates],
  );

  const refreshShippingRates = useCallback(async () => {
    const { data, error } = await supabase
      .from('shipping_rates')
      .select('package_size, label, examples, price_cents, sort_order')
      .order('sort_order');
    if (error) {
      console.warn('Could not load shipping rates:', error.message);
      return;
    }
    if (data?.length) setShippingRates(data as ShippingRate[]);
  }, []);

  const refreshSellerSettings = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setShipFrom(null);
      setMyBundleDiscount(null);
      return;
    }
    const [{ data: settings, error: settingsError }, { data: discount, error: discountError }] = await Promise.all([
      supabase.from('seller_settings').select('ship_from').eq('user_id', user.id).maybeSingle(),
      supabase.from('seller_bundle_discounts').select('*').eq('seller_id', user.id).maybeSingle(),
    ]);
    if (settingsError) console.warn('Could not load seller settings:', settingsError.message);
    if (discountError) console.warn('Could not load bundle discount:', discountError.message);
    setShipFrom((settings?.ship_from as ShipFromAddress | null) ?? null);
    setMyBundleDiscount((discount as BundleDiscount | null) ?? null);
  }, []);

  const refreshListings = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setListings([]);
      setMyListings([]);
      return;
    }

    const [{ data: publicRows, error: publicError }, { data: ownRows, error: ownError }] = await Promise.all([
      supabase
        .from('marketplace_listings')
        .select(LISTING_SELECT)
        .eq('status', 'active')
        .neq('seller_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('marketplace_listings')
        .select(LISTING_SELECT)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false }),
    ]);
    if (publicError) throw publicError;
    if (ownError) throw ownError;
    const visible = sortPieces(publicRows as any[]);
    setListings(visible);
    setMyListings(sortPieces(ownRows as any[]));
    // Drop bundle items that were sold or unlisted meanwhile.
    setBundle((current) => {
      if (!current) return current;
      const stillActive = current.listingIds.filter((id) => visible.some((listing) => listing.id === id));
      return stillActive.length ? { ...current, listingIds: stillActive } : null;
    });
  }, []);

  const refreshOrders = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setPurchases([]);
      setSales([]);
      return;
    }

    const [{ data: purchaseRows, error: purchaseError }, { data: salesRows, error: salesError }] = await Promise.all([
      supabase.from('orders').select(ORDER_SELECT).eq('buyer_id', user.id).order('created_at', { ascending: false }),
      supabase.from('orders').select(ORDER_SELECT).eq('seller_id', user.id).order('created_at', { ascending: false }),
    ]);
    if (purchaseError) throw purchaseError;
    if (salesError) throw salesError;
    setPurchases((purchaseRows ?? []) as unknown as MarketplaceOrder[]);
    setSales((salesRows ?? []) as unknown as MarketplaceOrder[]);
  }, []);

  const refreshSellerStatus = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSellerStatus(EMPTY_SELLER);
      return EMPTY_SELLER;
    }
    const { data, error } = await supabase.functions.invoke('marketplace-connect', {
      body: { action: 'status' },
    });
    if (error) throw await functionError(error, 'Could not check seller setup.');
    const status = { ...EMPTY_SELLER, ...data } as SellerAccountStatus;
    setSellerStatus(status);
    return status;
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        refreshListings(),
        refreshOrders(),
        refreshSellerStatus(),
        refreshShippingRates(),
        refreshSellerSettings(),
      ]);
    } catch (error) {
      console.error('Marketplace refresh error:', error);
    } finally {
      setLoading(false);
    }
  }, [refreshListings, refreshOrders, refreshSellerStatus, refreshShippingRates, refreshSellerSettings]);

  useEffect(() => {
    refreshAll();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setBundle(null);
      refreshAll();
    });
    return () => subscription.unsubscribe();
  }, [refreshAll]);

  const startSellerOnboarding = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('marketplace-connect', {
      body: { action: 'start' },
    });
    if (error || !data?.url) throw await functionError(error, 'Could not start seller setup.');
    return data.url as string;
  }, []);

  const openSellerDashboard = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('marketplace-connect', {
      body: { action: 'dashboard' },
    });
    if (error || !data?.url) throw await functionError(error, 'Could not open the seller dashboard.');
    return data.url as string;
  }, []);

  const createListing = useCallback(async (listing: NewListing) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Please sign in again.');
    if (!sellerStatus.details_submitted || !sellerStatus.charges_enabled || !sellerStatus.payouts_enabled) {
      throw new Error('Complete seller payout setup before publishing this item.');
    }

    const { data, error } = await supabase
      .from('marketplace_listings')
      .insert({
        ...listing,
        listing_kind: 'item',
        seller_id: user.id,
        currency: 'usd',
        status: 'active',
      })
      .select(LISTING_SELECT)
      .single();
    if (error) throw error;
    await refreshListings();
    return data as unknown as MarketplaceListing;
  }, [refreshListings, sellerStatus]);

  const createOutfitListing = useCallback(async (listing: NewOutfitListing) => {
    if (!sellerStatus.details_submitted || !sellerStatus.charges_enabled || !sellerStatus.payouts_enabled) {
      throw new Error('Complete seller payout setup before publishing this outfit.');
    }
    const { data, error } = await supabase.rpc('create_outfit_listing', {
      p_outfit_id: listing.outfit_id,
      p_title: listing.title,
      p_description: listing.description,
      p_condition: listing.condition,
      p_package_size: listing.package_size,
      p_price_cents: listing.price_cents,
      p_allow_separate_sale: listing.allow_separate_sale,
      p_pieces: listing.pieces,
    });
    if (error) throw error;
    await refreshListings();
    return data as unknown as MarketplaceListing;
  }, [refreshListings, sellerStatus]);

  const saveShipFrom = useCallback(async (address: ShipFromAddress) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Please sign in again.');
    const { error } = await supabase
      .from('seller_settings')
      .upsert({ user_id: user.id, ship_from: address }, { onConflict: 'user_id' });
    if (error) throw error;
    setShipFrom(address);
  }, []);

  const saveBundleDiscount = useCallback(async (discount: Omit<BundleDiscount, 'seller_id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Please sign in again.');
    const row = { ...discount, seller_id: user.id };
    const { error } = await supabase.from('seller_bundle_discounts').upsert(row, { onConflict: 'seller_id' });
    if (error) throw error;
    setMyBundleDiscount(row);
  }, []);

  const getBundleDiscount = useCallback(async (sellerId: string) => {
    const { data, error } = await supabase
      .from('seller_bundle_discounts')
      .select('*')
      .eq('seller_id', sellerId)
      .maybeSingle();
    if (error) {
      console.warn('Could not load bundle discount:', error.message);
      return null;
    }
    return (data as BundleDiscount | null) ?? null;
  }, []);

  const addToBundle = useCallback((listing: MarketplaceListing): 'added' | 'already' | 'other_seller' => {
    if (!listing.seller_id) return 'other_seller';
    if (bundle && bundle.sellerId !== listing.seller_id) return 'other_seller';
    if (bundle?.listingIds.includes(listing.id)) return 'already';
    setBundle((current) => ({
      sellerId: listing.seller_id!,
      listingIds: [...(current?.listingIds ?? []), listing.id].slice(0, 20),
    }));
    return 'added';
  }, [bundle]);

  const startBundleWith = useCallback((listing: MarketplaceListing) => {
    if (!listing.seller_id) return;
    setBundle({ sellerId: listing.seller_id, listingIds: [listing.id] });
  }, []);

  const removeFromBundle = useCallback((listingId: string) => {
    setBundle((current) => {
      if (!current) return current;
      const listingIds = current.listingIds.filter((id) => id !== listingId);
      return listingIds.length ? { ...current, listingIds } : null;
    });
  }, []);

  const clearBundle = useCallback(() => setBundle(null), []);

  const archiveListing = useCallback(async (listingId: string) => {
    const { error } = await supabase
      .from('marketplace_listings')
      .update({ status: 'archived', reserved_until: null })
      .eq('id', listingId)
      .eq('status', 'active');
    if (error) throw error;
    await refreshListings();
  }, [refreshListings]);

  const runOrderAction = useCallback(async (payload: OrderActionPayload) => {
    const { data, error } = await supabase.functions.invoke('marketplace-order-action', { body: payload });
    if (error || !data?.order) throw await functionError(error, 'Could not update the order.');
    await Promise.all([refreshOrders(), refreshListings()]);
    return data.order as MarketplaceOrder;
  }, [refreshListings, refreshOrders]);

  const reportListing = useCallback(async (listingId: string, reason: string, details?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Please sign in again.');
    const { error } = await supabase.from('marketplace_reports').insert({
      reporter_id: user.id,
      target_type: 'listing',
      target_id: listingId,
      reason,
      details: details?.trim() || null,
    });
    if (error) throw error;
  }, []);

  const blockSeller = useCallback(async (sellerId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Please sign in again.');
    const { error } = await supabase.from('user_blocks').upsert({ blocker_id: user.id, blocked_id: sellerId });
    if (error) throw error;
    await refreshListings();
  }, [refreshListings]);

  return (
    <MarketplaceContext.Provider value={{
      listings,
      myListings,
      purchases,
      sales,
      sellerStatus,
      loading,
      refreshAll,
      refreshListings,
      refreshOrders,
      refreshSellerStatus,
      startSellerOnboarding,
      openSellerDashboard,
      createListing,
      createOutfitListing,
      archiveListing,
      shippingRates,
      shippingRate,
      shipFrom,
      saveShipFrom,
      myBundleDiscount,
      saveBundleDiscount,
      getBundleDiscount,
      bundle,
      addToBundle,
      startBundleWith,
      removeFromBundle,
      clearBundle,
      runOrderAction,
      reportListing,
      blockSeller,
    }}>
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace() {
  const context = useContext(MarketplaceContext);
  if (!context) throw new Error('useMarketplace must be used inside MarketplaceProvider');
  return context;
}
