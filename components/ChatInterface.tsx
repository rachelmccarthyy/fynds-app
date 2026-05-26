"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Message, Product, OutfitPieceResult } from "@/lib/types";
import { WELCOME_MESSAGE } from "@/lib/constants";
import { useStore } from "@/lib/store-context";
import { useSupabaseAuth } from "@/lib/supabase/auth-context";
import { useTrack } from "@/lib/analytics/use-track";
import { getAnonId, getSessionId, getPlatform } from "@/lib/analytics/session";
import MessageBubble from "./MessageBubble";
import ProductGrid from "./ProductGrid";
import OutfitView from "./OutfitView";
import SearchBar from "./SearchBar";
import SuggestedQueries from "./SuggestedQueries";
import LoadingIndicator from "./LoadingIndicator";
import StyleQuiz from "./StyleQuiz";
import CartDrawer from "./CartDrawer";
import FavoritesDrawer from "./FavoritesDrawer";
import CheckoutFlow from "./CheckoutFlow";
import { DesktopSidebar, MobileFilterChips } from "./FilterSidebar";

export default function ChatInterface() {
  const { styleProfile } = useStore();
  const { accessToken } = useSupabaseAuth();
  const trackEvent = useTrack();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: WELCOME_MESSAGE,
      products: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [latestProducts, setLatestProducts] = useState<Product[]>([]);
  const [latestOutfitPieces, setLatestOutfitPieces] = useState<
    OutfitPieceResult[]
  >([]);
  const [latestQueryId, setLatestQueryId] = useState<string | undefined>();
  const [latestResultSetId, setLatestResultSetId] = useState<string | undefined>();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const sendMessage = async (text: string, entryPoint: string = "free_text") => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const queryId = crypto.randomUUID();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    trackEvent("query_submitted", {
      query_id: queryId,
      raw_text: trimmed,
      entry_point: entryPoint,
    });

    try {
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: trimmed,
          history,
          styleProfile,
          query_id: queryId,
          session_id: getSessionId(),
          platform: getPlatform(),
          anon_id: getAnonId(),
        }),
      });

      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      const resultSetId = crypto.randomUUID();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        products: data.products,
        outfitPieces: data.outfitPieces,
        queryId,
        resultSetId,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // All three set in the same synchronous block — React 18 batches these
      // into one render, so there's no intermediate frame with mismatched ids.
      if (data.outfitPieces && data.outfitPieces.length > 0) {
        setLatestOutfitPieces(data.outfitPieces);
        setLatestProducts([]);
        setLatestQueryId(queryId);
        setLatestResultSetId(resultSetId);
      } else if (data.products && data.products.length > 0) {
        setLatestProducts(data.products);
        setLatestOutfitPieces([]);
        setLatestQueryId(queryId);
        setLatestResultSetId(resultSetId);
      }
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, something went wrong. Please try again!",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuery = (query: string) => {
    sendMessage(query, "chip");
  };

  const hasProducts = latestProducts.length > 0;
  const hasOutfit = latestOutfitPieces.length > 0;
  const hasSidebar = hasProducts || hasOutfit;

  return (
    <>
      {/* Style Quiz — shows on first visit */}
      {styleProfile === null && <StyleQuiz />}

      {/* Drawers */}
      <CartDrawer />
      <FavoritesDrawer />
      <CheckoutFlow />

      <div className="flex flex-col md:flex-row h-[calc(100vh-65px)]">
        {/* Filter sidebar — desktop only */}
        <DesktopSidebar />

        {/* Chat Column */}
        <div
          className={`flex flex-col ${
            hasSidebar ? "md:w-[40%]" : "md:flex-1 md:max-w-2xl md:mx-auto"
          } w-full h-full transition-all duration-300`}
        >
          {/* Mobile filter chips */}
          <MobileFilterChips />

          {/* Messages */}
          <div className="flex-1 overflow-y-auto chat-scroll px-4 py-6">
            <div className="flex flex-col gap-4 max-w-2xl mx-auto">
              {messages.map((message) => (
                <div key={message.id}>
                  <MessageBubble message={message} />
                  {/* Inline products on mobile */}
                  {message.products && message.products.length > 0 && (
                    <div className="mt-3 md:hidden">
                      <ProductGrid
                        products={message.products}
                        queryId={message.queryId}
                        resultSetId={message.resultSetId}
                        isOutfit={false}
                      />
                    </div>
                  )}
                  {/* Inline outfit on mobile */}
                  {message.outfitPieces && message.outfitPieces.length > 0 && (
                    <div className="mt-3 md:hidden">
                      <OutfitView
                        pieces={message.outfitPieces}
                        queryId={message.queryId}
                        resultSetId={message.resultSetId}
                      />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && <LoadingIndicator />}
              <div ref={chatEndRef} />
            </div>

            {/* Suggested queries — show only at start */}
            {messages.length === 1 && (
              <div className="mt-6 max-w-2xl mx-auto">
                <p className="text-xs text-muted mb-3">Try asking:</p>
                <SuggestedQueries onSelect={handleSuggestedQuery} />
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="shrink-0 px-4 pb-4 pt-2 border-t border-gray-100 bg-white">
            <div className="max-w-2xl mx-auto">
              <SearchBar
                value={input}
                onChange={setInput}
                onSubmit={() => sendMessage(input)}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Product/Outfit Column — desktop only */}
        {hasSidebar && (
          <div className="hidden md:block md:w-[55%] border-l border-gray-100 overflow-y-auto bg-surface p-6">
            {hasOutfit ? (
              <>
                <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
                  Your Outfit
                </h2>
                <OutfitView
                  pieces={latestOutfitPieces}
                  queryId={latestQueryId}
                  resultSetId={latestResultSetId}
                />
              </>
            ) : (
              <>
                <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
                  Results
                </h2>
                <ProductGrid
                  products={latestProducts}
                  queryId={latestQueryId}
                  resultSetId={latestResultSetId}
                  isOutfit={false}
                />
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
