export interface ClothingItem {
  id: string;
  name: string;
  category: string;
  brand: string;
  color: string;
  size: string;
  season: string;
  price?: number;
  image: string;
  tags: string[];
  addedDate: string;
  isFavorite: boolean;
  forSale?: boolean;
  salePrice?: number;
}

export interface Outfit {
  id: string;
  name: string;
  items: ClothingItem[];
  occasion: string;
  season: string;
  createdDate: string;
  isShared: boolean;
  likes: number;
  image?: string;
}

export interface SocialPost {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  outfit: Outfit;
  caption: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  timestamp: string;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  followers: number;
  following: number;
  itemCount: number;
  outfitCount: number;
  bio: string;
}

// Clothing item images using placeholder colors
const ITEM_IMAGES = {
  dress_cream: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=400&fit=crop',
  jacket_pink: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&h=400&fit=crop',
  sweater_knit: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=300&h=400&fit=crop',
  jeans_blue: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=300&h=400&fit=crop',
  sneakers_green: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=400&fit=crop',
  coat_green: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=300&h=400&fit=crop',
  cardigan_brown: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=300&h=400&fit=crop',
  pants_taupe: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4357?w=300&h=400&fit=crop',
  blouse_white: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=300&h=400&fit=crop',
  skirt_midi: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=300&h=400&fit=crop',
  boots_ankle: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=300&h=400&fit=crop',
  bag_tote: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&h=400&fit=crop',
  tshirt_stripe: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=400&fit=crop',
  shorts_linen: 'https://images.unsplash.com/photo-1591195853828-11db59a44f43?w=300&h=400&fit=crop',
  heels_black: 'https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=300&h=400&fit=crop',
};

export const MOCK_CLOSET_ITEMS: ClothingItem[] = [
  {
    id: '1',
    name: 'Cream Mini Dress',
    category: 'Dresses',
    brand: 'Zara',
    color: 'Cream',
    size: 'S',
    season: 'Spring/Summer',
    price: 89,
    image: ITEM_IMAGES.dress_cream,
    tags: ['casual', 'day', 'summer'],
    addedDate: '2025-03-15',
    isFavorite: true,
  },
  {
    id: '2',
    name: 'Pink Wool Coat',
    category: 'Coats',
    brand: 'Mango',
    color: 'Pink',
    size: 'M',
    season: 'Fall/Winter',
    price: 245,
    image: ITEM_IMAGES.jacket_pink,
    tags: ['formal', 'winter', 'statement'],
    addedDate: '2024-11-02',
    isFavorite: true,
    forSale: false,
  },
  {
    id: '3',
    name: 'Patterned Knit Sweater',
    category: 'Sweaters',
    brand: 'H&M',
    color: 'Beige/Black',
    size: 'M',
    season: 'Fall/Winter',
    price: 65,
    image: ITEM_IMAGES.sweater_knit,
    tags: ['casual', 'cozy', 'winter'],
    addedDate: '2024-10-20',
    isFavorite: false,
  },
  {
    id: '4',
    name: 'Wide-Leg Blue Jeans',
    category: 'Pants',
    brand: "Levi's",
    color: 'Dark Blue',
    size: '28',
    season: 'All Season',
    price: 120,
    image: ITEM_IMAGES.jeans_blue,
    tags: ['casual', 'versatile', 'denim'],
    addedDate: '2025-01-10',
    isFavorite: true,
  },
  {
    id: '5',
    name: 'Green Suede Sneakers',
    category: 'Shoes',
    brand: 'New Balance',
    color: 'Green/Beige',
    size: '38',
    season: 'All Season',
    price: 185,
    image: ITEM_IMAGES.sneakers_green,
    tags: ['casual', 'sporty', 'comfortable'],
    addedDate: '2025-02-05',
    isFavorite: true,
  },
  {
    id: '6',
    name: 'Sage Green Coat',
    category: 'Coats',
    brand: 'COS',
    color: 'Sage Green',
    size: 'S',
    season: 'Fall/Winter',
    price: 320,
    image: ITEM_IMAGES.coat_green,
    tags: ['formal', 'elegant', 'winter'],
    addedDate: '2024-09-15',
    isFavorite: false,
  },
  {
    id: '7',
    name: 'Brown Cardigan',
    category: 'Cardigans',
    brand: 'Uniqlo',
    color: 'Brown',
    size: 'M',
    season: 'Fall/Winter',
    price: 55,
    image: ITEM_IMAGES.cardigan_brown,
    tags: ['casual', 'layering', 'cozy'],
    addedDate: '2024-10-01',
    isFavorite: false,
  },
  {
    id: '8',
    name: 'Taupe Straight Pants',
    category: 'Pants',
    brand: 'Arket',
    color: 'Taupe',
    size: '36',
    season: 'All Season',
    price: 95,
    image: ITEM_IMAGES.pants_taupe,
    tags: ['office', 'smart-casual', 'versatile'],
    addedDate: '2025-01-20',
    isFavorite: false,
  },
  {
    id: '9',
    name: 'White Silk Blouse',
    category: 'Blouses',
    brand: 'Massimo Dutti',
    color: 'White',
    size: 'S',
    season: 'All Season',
    price: 110,
    image: ITEM_IMAGES.blouse_white,
    tags: ['office', 'elegant', 'versatile'],
    addedDate: '2024-12-05',
    isFavorite: true,
  },
  {
    id: '10',
    name: 'Midi Pleated Skirt',
    category: 'Skirts',
    brand: 'Reformation',
    color: 'Camel',
    size: 'S',
    season: 'Spring/Summer',
    price: 148,
    image: ITEM_IMAGES.skirt_midi,
    tags: ['feminine', 'casual', 'summer'],
    addedDate: '2025-03-01',
    isFavorite: false,
  },
  {
    id: '11',
    name: 'Black Ankle Boots',
    category: 'Shoes',
    brand: 'Sam Edelman',
    color: 'Black',
    size: '38',
    season: 'Fall/Winter',
    price: 165,
    image: ITEM_IMAGES.boots_ankle,
    tags: ['versatile', 'classic', 'winter'],
    addedDate: '2024-09-20',
    isFavorite: true,
    forSale: true,
    salePrice: 80,
  },
  {
    id: '12',
    name: 'Leather Tote Bag',
    category: 'Bags',
    brand: 'Coach',
    color: 'Tan',
    size: 'One Size',
    season: 'All Season',
    price: 350,
    image: ITEM_IMAGES.bag_tote,
    tags: ['work', 'everyday', 'classic'],
    addedDate: '2024-08-10',
    isFavorite: true,
  },
  {
    id: '13',
    name: 'Striped T-Shirt',
    category: 'T shirts',
    brand: 'Saint James',
    color: 'Navy/White',
    size: 'M',
    season: 'Spring/Summer',
    price: 75,
    image: ITEM_IMAGES.tshirt_stripe,
    tags: ['casual', 'nautical', 'summer'],
    addedDate: '2025-02-28',
    isFavorite: false,
  },
  {
    id: '14',
    name: 'Linen Shorts',
    category: 'Shorts',
    brand: 'Zara',
    color: 'Beige',
    size: 'S',
    season: 'Spring/Summer',
    price: 45,
    image: ITEM_IMAGES.shorts_linen,
    tags: ['casual', 'beach', 'summer'],
    addedDate: '2025-03-10',
    isFavorite: false,
  },
  {
    id: '15',
    name: 'Black Heeled Pumps',
    category: 'Shoes',
    brand: 'Steve Madden',
    color: 'Black',
    size: '38',
    season: 'All Season',
    price: 125,
    image: ITEM_IMAGES.heels_black,
    tags: ['formal', 'evening', 'classic'],
    addedDate: '2024-07-15',
    isFavorite: false,
    forSale: true,
    salePrice: 60,
  },
];

export const CATEGORIES = [
  'All',
  'Coats',
  'Jackets',
  'Cardigans',
  'Sweaters',
  'Blouses',
  'T shirts',
  'Dresses',
  'Pants',
  'Skirts',
  'Shorts',
  'Shoes',
  'Bags',
];

export const MOCK_OUTFITS: Outfit[] = [
  {
    id: 'o1',
    name: 'Weekend Casual',
    items: [MOCK_CLOSET_ITEMS[2], MOCK_CLOSET_ITEMS[3], MOCK_CLOSET_ITEMS[4]],
    occasion: 'Casual',
    season: 'Fall/Winter',
    createdDate: '2025-03-18',
    isShared: true,
    likes: 42,
  },
  {
    id: 'o2',
    name: 'Office Chic',
    items: [MOCK_CLOSET_ITEMS[8], MOCK_CLOSET_ITEMS[7], MOCK_CLOSET_ITEMS[10]],
    occasion: 'Work',
    season: 'All Season',
    createdDate: '2025-03-15',
    isShared: false,
    likes: 0,
  },
  {
    id: 'o3',
    name: 'Spring Brunch',
    items: [MOCK_CLOSET_ITEMS[0], MOCK_CLOSET_ITEMS[4], MOCK_CLOSET_ITEMS[11]],
    occasion: 'Brunch',
    season: 'Spring/Summer',
    createdDate: '2025-03-10',
    isShared: true,
    likes: 87,
  },
];

export const MOCK_SOCIAL_POSTS: SocialPost[] = [
  {
    id: 'p1',
    userId: 'u2',
    username: '@stylebyemma',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    outfit: MOCK_OUTFITS[0],
    caption: 'Cozy autumn vibes with this knit sweater combo. Perfect for weekend errands! 🍂',
    likes: 234,
    comments: 18,
    isLiked: false,
    timestamp: '2h ago',
  },
  {
    id: 'p2',
    userId: 'u3',
    username: '@fashionbysophia',
    userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    outfit: MOCK_OUTFITS[2],
    caption: 'Spring is here and so is this dreamy cream dress look. Brunch ready! ☀️',
    likes: 512,
    comments: 43,
    isLiked: true,
    timestamp: '5h ago',
  },
  {
    id: 'p3',
    userId: 'u4',
    username: '@minimalistmia',
    userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
    outfit: MOCK_OUTFITS[1],
    caption: 'Clean lines, neutral tones. Office outfit that works from desk to dinner.',
    likes: 189,
    comments: 12,
    isLiked: false,
    timestamp: '1d ago',
  },
];

export const CURRENT_USER: User = {
  id: 'u1',
  username: '@mymodtok',
  displayName: 'My Closet',
  avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop&crop=face',
  followers: 1240,
  following: 387,
  itemCount: 15,
  outfitCount: 3,
  bio: 'Fashion enthusiast | Sort. Style. Share. Sell. ✨',
};
