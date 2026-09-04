export type ListingCondition = 'new_with_tags' | 'like_new' | 'good' | 'fair';
export type ListingStatus = 'draft' | 'active' | 'reserved' | 'sold' | 'archived';
export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'canceled'
  | 'refund_pending'
  | 'partially_refunded'
  | 'refunded'
  | 'disputed';

export type PublicProfile = {
  id?: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

export type MarketplaceListing = {
  id: string;
  closet_item_id: string | null;
  seller_id: string | null;
  title: string;
  description: string;
  category: string;
  brand?: string | null;
  size?: string | null;
  condition: ListingCondition;
  image_urls: string[];
  currency: 'usd';
  price_cents: number;
  shipping_price_cents: number;
  status: ListingStatus;
  reserved_until?: string | null;
  sold_at?: string | null;
  created_at: string;
  updated_at: string;
  seller?: PublicProfile | null;
};

export type SellerAccountStatus = {
  connected: boolean;
  stripe_account_id?: string;
  country?: string;
  default_currency?: string;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements?: Record<string, unknown>;
};

export type ShippingAddress = {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: 'US';
  phone?: string;
};

export type MarketplaceOrder = {
  id: string;
  listing_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  status: OrderStatus;
  currency: 'usd';
  item_amount_cents: number;
  shipping_amount_cents: number;
  tax_amount_cents: number;
  platform_fee_cents: number;
  seller_net_cents: number;
  total_amount_cents: number;
  shipping_address: ShippingAddress;
  listing_snapshot: {
    id?: string;
    title?: string;
    description?: string;
    category?: string;
    brand?: string | null;
    size?: string | null;
    condition?: ListingCondition;
    image_urls?: string[];
    price_cents?: number;
    shipping_price_cents?: number;
    currency?: 'usd';
  };
  stripe_payment_intent_id?: string | null;
  tracking_carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  paid_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  refunded_at?: string | null;
  created_at: string;
  buyer?: PublicProfile | null;
  seller?: PublicProfile | null;
};

export const CONDITION_LABELS: Record<ListingCondition, string> = {
  new_with_tags: 'New with tags',
  like_new: 'Like new',
  good: 'Good',
  fair: 'Fair',
};

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}
