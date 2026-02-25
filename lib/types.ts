export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: Product[];
  outfitPieces?: OutfitPieceResult[];
}

export interface Product {
  title: string;
  price: string;
  source: string;
  link: string;
  imageUrl: string;
  position: number;
}

export interface SavedProduct extends Product {
  savedAt: number;
}

export interface StyleProfile {
  aesthetic: string;
  budgetRange: string;
  sizes: string;
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
