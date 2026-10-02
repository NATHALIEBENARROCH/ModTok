import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  ListingCondition,
  MarketplaceListing,
  MarketplaceOrder,
  SellerAccountStatus,
} from '../types/marketplace';

const LISTING_SELECT = `
  *,
  seller:profiles!marketplace_listings_seller_id_fkey(id, username, display_name, avatar_url)
`;

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
  shipping_price_cents: number;
};

type OrderActionPayload = {
  action: 'mark_processing' | 'mark_shipped' | 'confirm_delivered' | 'cancel_checkout' | 'refund';
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
  archiveListing: (listingId: string) => Promise<void>;
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
    setListings((publicRows ?? []) as unknown as MarketplaceListing[]);
    setMyListings((ownRows ?? []) as unknown as MarketplaceListing[]);
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
      await Promise.all([refreshListings(), refreshOrders(), refreshSellerStatus()]);
    } catch (error) {
      console.error('Marketplace refresh error:', error);
    } finally {
      setLoading(false);
    }
  }, [refreshListings, refreshOrders, refreshSellerStatus]);

  useEffect(() => {
    refreshAll();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => refreshAll());
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
      archiveListing,
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
