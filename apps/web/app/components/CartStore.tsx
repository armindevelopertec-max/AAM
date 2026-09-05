"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { CartLine } from "./CartDrawer";

export type PosCart = {
  lines: CartLine[];
  clientId: string | null;
};

export type QuoteCart = {
  lines: CartLine[];
  clientId: string | null;
  validDays: string;
  advancePayment: string;
  withInstallation: boolean;
  installDate: string;
  installTime: string;
  installPoints: string;
  installPricePerPoint: string;
};

const DEFAULT_POS: PosCart = { lines: [], clientId: null };

export const defaultQuoteCart = (): QuoteCart => ({
  lines: [],
  clientId: null,
  validDays: "7",
  advancePayment: "",
  withInstallation: false,
  installDate: "",
  installTime: "",
  installPoints: "1",
  installPricePerPoint: "100",
});

const POS_KEY = "segtecam_pos_cart_v1";
const QUOTE_KEY = "segtecam_quote_cart_v1";

function load<T>(key: string, fallback: () => T): T {
  if (typeof window === "undefined") return fallback();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback();
    const parsed = JSON.parse(raw) as T;
    const fallbackVal = fallback();
    const merged = { ...fallbackVal, ...parsed };
    return merged;
  } catch {
    return fallback();
  }
}

type CartContextValue = {
  pos: PosCart;
  setPosLines: React.Dispatch<SetStateAction<CartLine[]>>;
  setPosClientId: (id: string | null) => void;
  quote: QuoteCart;
  setQuoteLines: React.Dispatch<SetStateAction<CartLine[]>>;
  setQuoteClientId: (id: string | null) => void;
  setQuoteField: <K extends keyof QuoteCart>(key: K, value: QuoteCart[K]) => void;
  resetQuote: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [pos, setPos] = useState<PosCart>(() => load(POS_KEY, () => ({ ...DEFAULT_POS })));
  const [quote, setQuote] = useState<QuoteCart>(() => load(QUOTE_KEY, defaultQuoteCart));

  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) localStorage.setItem(POS_KEY, JSON.stringify(pos));
    hydrated.current = true;
  }, [pos]);
  useEffect(() => {
    if (hydrated.current) localStorage.setItem(QUOTE_KEY, JSON.stringify(quote));
    hydrated.current = true;
  }, [quote]);

  const setPosLines = useCallback((updater: SetStateAction<CartLine[]>) => {
    setPos((prev) => ({
      ...prev,
      lines: typeof updater === "function" ? updater(prev.lines) : updater,
    }));
  }, []);

  const setPosClientId = useCallback((id: string | null) => {
    setPos((prev) => ({ ...prev, clientId: id }));
  }, []);

  const setQuoteLines = useCallback((updater: SetStateAction<CartLine[]>) => {
    setQuote((prev) => ({
      ...prev,
      lines: typeof updater === "function" ? updater(prev.lines) : updater,
    }));
  }, []);

  const setQuoteClientId = useCallback((id: string | null) => {
    setQuote((prev) => ({ ...prev, clientId: id }));
  }, []);

  const setQuoteField = useCallback(
    <K extends keyof QuoteCart>(key: K, value: QuoteCart[K]) => {
      setQuote((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetQuote = useCallback(() => {
    setQuote(defaultQuoteCart());
  }, []);

  return (
    <CartContext.Provider
      value={{
        pos,
        setPosLines,
        setPosClientId,
        quote,
        setQuoteLines,
        setQuoteClientId,
        setQuoteField,
        resetQuote,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCartStore() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCartStore debe usarse dentro de <CartProvider>");
  }
  return ctx;
}