"use client";

import { useCallback } from "react";
import ProductCatalog from "./ProductCatalog";
import { useCartStore } from "./CartStore";
import type { Product } from "../lib/api";

export default function PosManager() {
  const { pos, setPosLines, openDock } = useCartStore();
  const cart = pos.lines;

  const inCart = useCallback(
    (productId: number) => cart.find((l) => l.productId === productId)?.quantity ?? 0,
    [cart],
  );

  const addToCart = useCallback(
    (product: Product) => {
      if (cart.length === 0) openDock("pos");
      setPosLines((current) => {
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
          },
        ];
      });
    },
    [cart, setPosLines, openDock],
  );

  return (
    <div className="flex w-full flex-col gap-5">
      <ProductCatalog onAdd={addToCart} inCartQty={inCart} />
    </div>
  );
}