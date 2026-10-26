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

export type PackageSize = 'small' | 'medium' | 'large';
export type ListingKind = 'item' | 'outfit';
export type OrderKind = 'single' | 'outfit' | 'bundle';
export type LabelStatus = 'none' | 'pending' | 'purchased' | 'failed' | 'refunded';

export type ShippingRate = {
  package_size: PackageSize;
  label: string;
  examples: string;
  price_cents: number;
  sort_order: number;
};

// Used until the rates load from the server; the server always decides the real price.
export const DEFAULT_SHIPPING_RATES: ShippingRate[] = [
  { package_size: 'small', label: 'Small', examples: 'T-shirts, tops, jewelry, small accessories', price_cents: 599, sort_order: 1 },
  { package_size: 'medium', label: 'Medium', examples: 'Dresses, jeans, sweaters, shoes, bags', price_cents: 999, sort_order: 2 },
  { package_size: 'large', label: 'Large', examples: 'Coats, boots, outfits and bundles', price_cents: 1499, sort_order: 3 },
];

export type OutfitPiece = {
  outfit_listing_id: string;
  position: number;
  closet_item_id: string | null;
  piece_listing_id: string | null;
  title: string;
  category?: string | null;
  brand?: string | null;
  size?: string | null;
  image_url?: string | null;
};

export type BundleDiscount = {
  seller_id: string;
  enabled: boolean;
  two_items_bps: number;
  three_items_bps: number;
  five_items_bps: number;
};

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
  package_size: PackageSize;
  listing_kind: ListingKind;
  outfit_id?: string | null;
  allow_separate_sale?: boolean;
  pieces?: OutfitPiece[] | null;
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

export type OrderSnapshot = {
  id?: string;
  listing_kind?: ListingKind | 'bundle';
  title?: string;
  description?: string;
  category?: string;
  brand?: string | null;
  size?: string | null;
  condition?: ListingCondition;
  image_urls?: string[];
  price_cents?: number;
  shipping_price_cents?: number;
  package_size?: PackageSize;
  discount_bps?: number;
  currency?: 'usd';
  pieces?: { title: string; category?: string | null; size?: string | null; image_url?: string | null }[];
  items?: OrderSnapshot[];
};

export type MarketplaceOrder = {
  id: string;
  listing_id: string | null;
  order_kind?: OrderKind;
  package_size?: PackageSize | null;
  discount_amount_cents?: number;
  label_status?: LabelStatus;
  label_url?: string | null;
  label_error?: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  status: OrderStatus;
  currency: 'usd';
  item_amount_cents: number;
  shipping_amount_cents: number;
  tax_amount_cents: number;
  platform_fee_cents: number;
  buyer_protection_cents?: number;
  seller_net_cents: number;
  total_amount_cents: number;
  shipping_address: ShippingAddress;
  listing_snapshot: OrderSnapshot;
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

export const PACKAGE_SIZE_LABELS: Record<PackageSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

/** A sensible starting package size for a wardrobe category; the seller can change it. */
export function defaultPackageSize(category?: string | null): PackageSize {
  const value = (category ?? '').toLowerCase();
  if (['tops', 'jewelry', 'accessories'].includes(value)) return 'small';
  if (['jackets', 'boots', 'coats', 'outfits'].includes(value)) return 'large';
  return 'medium';
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

/** Sellers pay no fee. Buyers pay Buyer Protection: $0.70 + 5% of the items (not shipping). */
export const BUYER_PROTECTION_FIXED_CENTS = 70;
export const BUYER_PROTECTION_BPS = 500;

export const BUYER_PROTECTION_INFO =
  'If your item never arrives, or arrives significantly not as described, damaged or counterfeit, you can get a full refund, '
  + 'including shipping and this fee (see our Refund Policy). Sellers pay no fees on ModTok: this fee is how ModTok runs.';

/** Same rule as the server. The server's amount is what Stripe charges. */
export function buyerProtectionCents(itemsCents: number): number {
  if (itemsCents <= 0) return 0;
  return BUYER_PROTECTION_FIXED_CENTS + Math.round((itemsCents * BUYER_PROTECTION_BPS) / 10000);
}

/** Same rule as the server: picking 2+ listings from one seller earns their bundle discount. */
export function bundleDiscountBps(discount: BundleDiscount | null | undefined, count: number): number {
  if (!discount || !discount.enabled || count < 2) return 0;
  if (count >= 5) return discount.five_items_bps;
  if (count >= 3) return discount.three_items_bps;
  return discount.two_items_bps;
}

/** Same rule as the server: the biggest item decides the box; more pieces need a bigger one. */
export function bundlePackageSize(listings: Pick<MarketplaceListing, 'package_size' | 'listing_kind' | 'pieces'>[]): PackageSize {
  const rank = { small: 1, medium: 2, large: 3 } as const;
  let size = 1;
  let pieces = 0;
  for (const listing of listings) {
    size = Math.max(size, rank[listing.package_size ?? 'medium']);
    pieces += listing.listing_kind === 'outfit' ? Math.max(listing.pieces?.length ?? 1, 1) : 1;
  }
  if (listings.length > 1) {
    if (pieces >= 5) size = 3;
    else if (pieces >= 3) size = Math.max(size, 2);
  }
  return size === 1 ? 'small' : size === 2 ? 'medium' : 'large';
}
