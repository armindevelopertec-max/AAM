"use client";

import { useCallback } from "react";
import ProductCatalog from "./ProductCatalog";
import { useCartStore } from "./CartStore";
import type { Product } from "../lib/api";

export default function QuotesManager() {
  const { quote, setQuoteLines, openDock } = useCartStore();
  const lines = quote.lines;

  const inCart = useCallback(
    (productId: number) => lines.find((l) => l.productId === productId)?.quantity ?? 0,
    [lines],
  );

  const addLine = useCallback(
    (product: Product) => {
      if (lines.length === 0) openDock("quote");
      setQuoteLines((current) => {
        const existing = current.find((l) => l.productId === product.id);
        if (existing) {
          return current.map((l) =>
            l.productId === product.id
              ? { ...l, quantity: Math.min(l.quantity + 1, product.stock) }
              : l,
          );
        }
        return [
          ...current,
          {
            productId: product.id,
            fuente: product.fuente ?? "",
            moneda: product.moneda ?? "BOB",
            name: product.name,
            sku: product.sku,
            quantity: 1,
            unitPrice: product.price,
            originalPrice: product.regularPrice || product.price,
            costPrice: product.costPrice,
            imageUrl: product.imageUrl,
            isInstall: false,
            unidad: product.unidad ?? null,
          },
        ];
      });
    },
    [lines, setQuoteLines, openDock],
  );

  return (
    <div className="flex w-full flex-col gap-5">
      <ProductCatalog showOriginalPrice onAdd={addLine} inCartQty={inCart} />
    </div>
  );
}