import Link from "next/link";
import Header from "@/components/Header";

export default function LandingPage() {
  return (
    <>
      <Header />
      <main
        className="min-h-screen flex flex-col items-center justify-center px-5 md:px-10 text-center"
        style={{
          background:
            "linear-gradient(135deg, #FF1D6C 0%, #c2185b 25%, #8e6f5e 50%, #6d8b74 75%, #FF1D6C 100%)",
        }}
      >
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white max-w-4xl leading-tight">
          Discover the Future of Fashion with Fynds
        </h1>
        <p className="mt-6 text-lg md:text-xl text-white/80 max-w-2xl">
          Your AI-powered personal stylist. Describe what you&apos;re looking
          for in plain English and get real, shoppable product recommendations
          instantly.
        </p>
        <Link
          href="/shop"
          className="mt-10 inline-flex items-center gap-2 bg-white text-fg font-semibold text-lg px-8 py-4 rounded-full hover:scale-[1.02] transition-all duration-200 shadow-lg"
        >
          Start Shopping
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 10H16M16 10L11 5M16 10L11 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </main>
    </>
  );
}
