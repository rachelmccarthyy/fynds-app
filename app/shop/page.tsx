import Header from "@/components/Header";
import ChatInterface from "@/components/ChatInterface";

export const metadata = {
  title: "Shop — Fynds AI",
  description: "Chat with your AI stylist and find real fashion products.",
};

export default function ShopPage() {
  return (
    <>
      <Header />
      <div className="pt-[65px]">
        <ChatInterface />
      </div>
    </>
  );
}
