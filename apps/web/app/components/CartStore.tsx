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
import type { Kit } from "../lib/api";

export type PosCart = {
  lines: CartLine[];
  clientId: string | null;
  withInstallation: boolean;
  installDate: string;
  installTime: string;
  installPoints: string;
  installPricePerPoint: string;
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

const DEFAULT_POS: PosCart = {
  lines: [],
  clientId: null,
  withInstallation: false,
  installDate: "",
  installTime: "",
  installPoints: "1",
  installPricePerPoint: "100",
};

export type KitCart = {
  lines: CartLine[];
  name: string;
  description: string;
  priceOverride: string;
  editingId: string | null;
  imageUrl: string | null;
};

export const defaultKitCart = (): KitCart => ({
  lines: [],
  name: "",
  description: "",
  priceOverride: "",
  editingId: null,
  imageUrl: null,
});

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
const KIT_KEY = "segtecam_kit_cart_v1";

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
  setPosField: <K extends keyof PosCart>(key: K, value: PosCart[K]) => void;
  quote: QuoteCart;
  setQuoteLines: React.Dispatch<SetStateAction<CartLine[]>>;
  setQuoteClientId: (id: string | null) => void;
  setQuoteField: <K extends keyof QuoteCart>(key: K, value: QuoteCart[K]) => void;
  resetQuote: () => void;
  kit: KitCart;
  setKitLines: React.Dispatch<SetStateAction<CartLine[]>>;
  setKitName: (value: string) => void;
  setKitDescription: (value: string) => void;
  setKitPriceOverride: (value: string) => void;
  setKitImageUrl: (value: string | null) => void;
  loadKit: (kit: Kit) => void;
  resetKit: () => void;
  kitRevision: number;
  bumpKitRevision: () => void;
  dockOpen: "pos" | "quote" | "kit" | null;
  openDock: (tipo: "pos" | "quote" | "kit") => void;
  closeDock: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [pos, setPos] = useState<PosCart>(() => load(POS_KEY, () => ({ ...DEFAULT_POS })));
  const [quote, setQuote] = useState<QuoteCart>(() => load(QUOTE_KEY, defaultQuoteCart));
  const [kit, setKit] = useState<KitCart>(() => load(KIT_KEY, defaultKitCart));
  const [kitRevision, setKitRevision] = useState(0);

  const hydratedPos = useRef(false);
  const hydratedQuote = useRef(false);
  const hydratedKit = useRef(false);
  useEffect(() => {
    if (hydratedPos.current) localStorage.setItem(POS_KEY, JSON.stringify(pos));
    hydratedPos.current = true;
  }, [pos]);
  useEffect(() => {
    if (hydratedQuote.current) localStorage.setItem(QUOTE_KEY, JSON.stringify(quote));
    hydratedQuote.current = true;
  }, [quote]);
  useEffect(() => {
    if (hydratedKit.current) localStorage.setItem(KIT_KEY, JSON.stringify(kit));
    hydratedKit.current = true;
  }, [kit]);

  const setPosLines = useCallback((updater: SetStateAction<CartLine[]>) => {
    setPos((prev) => ({
      ...prev,
      lines: typeof updater === "function" ? updater(prev.lines) : updater,
    }));
  }, []);

  const setPosClientId = useCallback((id: string | null) => {
    setPos((prev) => ({ ...prev, clientId: id }));
  }, []);

  const setPosField = useCallback(
    <K extends keyof PosCart>(key: K, value: PosCart[K]) => {
      setPos((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

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

  const setKitLines = useCallback((updater: SetStateAction<CartLine[]>) => {
    setKit((prev) => ({
      ...prev,
      lines: typeof updater === "function" ? updater(prev.lines) : updater,
    }));
  }, []);

  const setKitName = useCallback((value: string) => {
    setKit((prev) => ({ ...prev, name: value }));
  }, []);

  const setKitDescription = useCallback((value: string) => {
    setKit((prev) => ({ ...prev, description: value }));
  }, []);

  const setKitPriceOverride = useCallback((value: string) => {
    setKit((prev) => ({ ...prev, priceOverride: value }));
  }, []);

  const setKitImageUrl = useCallback((value: string | null) => {
    setKit((prev) => ({ ...prev, imageUrl: value }));
  }, []);

  const loadKit = useCallback((source: Kit) => {
    setKit({
      lines: [],
      name: source.name,
      description: source.description ?? "",
      priceOverride:
        source.priceOverride != null ? String(source.priceOverride) : "",
      editingId: source.id,
      imageUrl: source.imageUrl,
    });
  }, []);

  const resetKit = useCallback(() => {
    setKit(defaultKitCart());
  }, []);

  const bumpKitRevision = useCallback(() => {
    setKitRevision((current) => current + 1);
  }, []);

  const [dockOpen, setDockOpen] = useState<"pos" | "quote" | "kit" | null>(null);
  const openDock = useCallback(
    (tipo: "pos" | "quote" | "kit") => setDockOpen(tipo),
    [],
  );
  const closeDock = useCallback(() => setDockOpen(null), []);

  return (
    <CartContext.Provider
      value={{
        pos,
        setPosLines,
        setPosClientId,
        setPosField,
        quote,
        setQuoteLines,
        setQuoteClientId,
        setQuoteField,
        resetQuote,
        kit,
        setKitLines,
        setKitName,
        setKitDescription,
        setKitPriceOverride,
        setKitImageUrl,
        loadKit,
        resetKit,
        kitRevision,
        bumpKitRevision,
        dockOpen,
        openDock,
        closeDock,
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