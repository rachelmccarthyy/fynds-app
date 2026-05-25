export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: Product[];
  outfitPieces?: OutfitPieceResult[];
  queryId?: string;
  resultSetId?: string;
}

export interface Product {
  title: string;
  price: string;
  source: string;
  link: string;
  imageUrl: string;
  position: number;
  rating?: number;
  ratingCount?: number;
  productId?: string;
  delivery?: string;
  product_key?: string;
}

export interface ProductOptions {
  size?: string;
  color?: string;
  notes?: string;
}

export interface SavedProduct extends Product {
  savedAt: number;
  options?: ProductOptions;
}

export interface StyleProfile {
  aesthetic: string;
  budgetRange: string;
  sizes: string;
  shoeSize: string;
  gender: string;
  avoidBrands: string;
  notes: string;
}

export interface OutfitPiece {
  category: string;
  search_query: string;
  styling_note: string;
}

export interface OutfitPieceResult extends OutfitPiece {
  products: Product[];
}

export interface ChatRequest {
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  styleProfile?: StyleProfile | null;
  // Analytics context — generated client-side, threaded into server events
  query_id?: string;
  session_id?: string;
  platform?: string;
  anon_id?: string;
}

export interface ChatResponse {
  message: string;
  products: Product[];
  outfitPieces?: OutfitPieceResult[];
}

export interface ClaudeParseResult {
  search_query: string;
  response_text: string;
  is_shopping_query: boolean;
  is_outfit_query: boolean;
  outfit_pieces?: OutfitPiece[];
}

// Checkout types

export interface ShippingAddress {
  fullName: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

export interface PaymentDetails {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  nameOnCard: string;
  billingAddress?: ShippingAddress;
  useSameAsShipping: boolean;
}

export interface OrderItem {
  product: Product;
  quantity: number;
  retailer: string;
  retailerDomain: string;
  options?: ProductOptions;
}

export type CheckoutStep =
  | "cart_review"
  | "shipping"
  | "payment"
  | "confirm"
  | "processing"
  | "complete";

export type ItemStatus =
  | "pending"
  | "navigating"
  | "adding_to_cart"
  | "filling_shipping"
  | "filling_payment"
  | "confirming"
  | "completed"
  | "failed"
  | "captcha_required";

export interface OrderConfirmation {
  orderNumber?: string;
  estimatedDelivery?: string;
  orderTotal?: string;
  itemDetails?: string;
}

export interface ItemStatusUpdate {
  productLink: string;
  status: ItemStatus;
  message: string;
  confirmationNumber?: string;
  confirmation?: OrderConfirmation;
  manualCheckoutUrl?: string;
  retailer: string;
}

export interface CheckoutStatus {
  sessionId: string;
  overallStatus: "processing" | "completed" | "failed" | "partial";
  items: ItemStatusUpdate[];
  startedAt: number;
  completedAt?: number;
}

export interface CheckoutRequest {
  items: OrderItem[];
  shipping: ShippingAddress;
  payment: PaymentDetails;
}
