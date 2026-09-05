"use client";

import { useState, useCallback } from "react";
import ClientPicker from "./ClientPicker";
import CartDrawer from "./CartDrawer";
import ProductCatalog from "./ProductCatalog";
import { useCartStore } from "./CartStore";
import {
  createSale,
  formatMoney,
  type Client,
  type Product,
} from "../lib/api";

export default function PosManager({
  clients,
}: {
  clients: Client[];
}) {
  const [cartOpen, setCartOpen] = useState(false);
  const { pos, setPosLines, setPosClientId } = useCartStore();
  const cart = pos.lines;

  const [clientList, setClientList] = useState<Client[]>(clients);
  const selectedClient =
    clientList.find((c) => c.id === pos.clientId) ?? null;
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const inCart = useCallback(
    (productId: number) => cart.find((l) => l.productId === productId)?.quantity ?? 0,
    [cart],
  );

  const addToCart = useCallback(
    (product: Product) => {
      setError(null);
      setSuccess(null);
      if (cart.length === 0) setCartOpen(true);
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
    [cart, setPosLines],
  );

  const setQuantity = useCallback(
    (productId: number, qty: number) => {
      setPosLines((current) =>
        current
          .map((l) =>
            l.productId === productId ? { ...l, quantity: Math.max(qty, 0) } : l,
          )
          .filter((l) => l.quantity > 0),
      );
    },
    [setPosLines],
  );

  const removeLine = useCallback(
    (productId: number) => {
      setPosLines((current) => current.filter((l) => l.productId !== productId));
    },
    [setPosLines],
  );

  const subtotal = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const subtotalOriginal = cart.reduce((s, l) => s + l.originalPrice * l.quantity, 0);
  const total = subtotal;
  const totalItems = cart.reduce((s, l) => s + l.quantity, 0);
  const totalSavings = subtotalOriginal - subtotal;
  const moneda = cart[0]?.moneda ?? "BOB";

  async function handleCheckout() {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const sale = await createSale({
        clientId: selectedClient?.id,
        discount: 0,
        items: cart.map((l) => ({
          productId: l.productId,
          fuente: l.fuente || undefined,
          quantity: l.quantity,
        })),
      });
      setSuccess(`Venta ${sale.number} registrada por ${formatMoney(sale.total, moneda)}`);
      setPosLines([]);
      setPosClientId(null);
      setCartOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-5">
      {/* ── Catálogo paginado ── */}
      <ProductCatalog onAdd={addToCart} inCartQty={inCart} />

      {/* ── Carrito flotante + drawer ── */}
      <CartDrawer
        open={cartOpen}
        setOpen={setCartOpen}
        title="Carrito"
        emptyMessage="Agregá productos del catálogo."
        lines={cart}
        subtotalOriginal={subtotalOriginal}
        totalSavings={totalSavings}
        total={total}
        totalItems={totalItems}
        moneda={moneda}
        extra={
          cart.length > 0 ? (
            <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Cliente
              </label>
              <ClientPicker
                clients={clientList}
                value={selectedClient}
                onChange={(c) => setPosClientId(c?.id ?? null)}
                onClientCreated={(c) =>
                  setClientList((cur) =>
                    cur.some((x) => x.id === c.id) ? cur : [...cur, c],
                  )
                }
              />
            </div>
          ) : undefined
        }
        actionLabel="Cobrar venta"
        actionBusyLabel="Registrando…"
        busy={saving}
        onAction={handleCheckout}
        onSetQuantity={setQuantity}
        onRemoveLine={removeLine}
      />

      {error && (
        <p className="fixed bottom-6 right-auto left-6 z-40 w-auto max-w-sm rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}
      {success && (
        <p className="fixed bottom-6 left-6 z-40 w-auto max-w-sm rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
          {success}
        </p>
      )}
    </div>
  );
}