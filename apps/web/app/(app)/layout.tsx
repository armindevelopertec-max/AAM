"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { CartProvider } from "../components/CartStore";
import CartDock from "../components/CartDock";
import { useAuth } from "../components/AuthProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return null;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <CartProvider>
        <Navbar />
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8">{children}</main>
        <CartDock />
      </CartProvider>
    </div>
  );
}
