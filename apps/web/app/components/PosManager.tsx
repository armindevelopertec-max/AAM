"use client";

import { useMemo, useState, useCallback } from "react";
import ClientPicker from "./ClientPicker";
import {
  createSale,
  formatMoney,
  type Client,
  type Product,
} from "../lib/api";

type CartLine = {
  productId: number;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  costPrice: number;
  imageUrl: string | null;
};

export default function PosManager({
  initialProducts,
  clients,
}: {
  initialProducts: Product[];
  clients: Client[];
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [cart, setCart] = useState<CartLine[]>([]);

  const [clientList, setClientList] = useState<Client[]>(clients);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const categories = useMemo(() => {
    const cats = new Map<string, number>();
    initialProducts.forEach((p) => {
      const cat = p.category || "General";
      cats.set(cat, (cats.get(cat) || 0) + 1);
    });
    return Array.from(cats.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [initialProducts]);

  const filtered = useMemo(() => {
    const needle = query.toLowerCase();
    return initialProducts.filter((p) => {
      if (activeCategory !== "all" && (p.category || "General") !== activeCategory)
        return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        p.sku.toLowerCase().includes(needle) ||
        p.category.toLowerCase().includes(needle)
      );
    });
  }, [query, activeCategory, initialProducts]);

  const inCart = useCallback(
    (productId: number) => cart.find((l) => l.productId === productId)?.quantity ?? 0,
    [cart],
  );

  const addToCart = useCallback(
    (product: Product) => {
      setError(null);
      setSuccess(null);
      setCart((current) => {
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
    [],
  );

  const setQuantity = useCallback((productId: number, qty: number) => {
    setCart((current) =>
      current
        .map((l) =>
          l.productId === productId ? { ...l, quantity: Math.max(qty, 0) } : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }, []);

  const setUnitPrice = useCallback((productId: number, price: number) => {
    setCart((current) =>
      current.map((l) =>
        l.productId === productId ? { ...l, unitPrice: Math.max(price, 0) } : l,
      ),
    );
  }, []);

  const removeLine = useCallback((productId: number) => {
    setCart((current) => current.filter((l) => l.productId !== productId));
  }, []);

  const subtotal = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const subtotalOriginal = cart.reduce((s, l) => s + l.originalPrice * l.quantity, 0);
  const total = subtotal;
  const totalItems = cart.reduce((s, l) => s + l.quantity, 0);
  const totalSavings = subtotalOriginal - subtotal;

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
          quantity: l.quantity,
          price: l.unitPrice,
        })),
      });
      setSuccess(`Venta ${sale.number} registrada por ${formatMoney(sale.total)}`);
      setCart([]);
      setSelectedClient(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid w-full gap-5 lg:grid-cols-5">
      {/* ── Catálogo ── */}
      <section className="lg:col-span-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto, SKU o categoría…"
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory("all")}
              className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                activeCategory === "all"
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-neutral-300 bg-white text-neutral-500 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
              }`}
            >
              Todos
            </button>
            {categories.map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                  activeCategory === cat
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-neutral-300 bg-white text-neutral-500 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
                }`}
              >
                {cat}{" "}
                <span className="ml-0.5 opacity-60">({count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {filtered.length === 0 && (
            <p className="col-span-full py-12 text-center text-sm text-neutral-400">
              Sin productos.
            </p>
          )}
          {filtered.map((product) => {
            const available = product.stock - inCart(product.id);
            const inCartQty = inCart(product.id);
            return (
              <div
                key={product.id}
                className={`flex flex-col overflow-hidden rounded-xl border transition ${
                  available <= 0
                    ? "border-neutral-200 opacity-50 dark:border-neutral-800"
                    : "border-neutral-200 hover:border-blue-400 dark:border-neutral-800 dark:hover:border-blue-600"
                } bg-white dark:bg-neutral-900`}
              >
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="aspect-square w-full bg-neutral-100 dark:bg-neutral-800" />
                )}
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                    {product.category || "General"}
                  </span>
                  <p className="line-clamp-2 text-[13px] font-medium leading-tight">
                    {product.name}
                  </p>
                  <p className="font-mono text-[11px] text-neutral-400">{product.sku}</p>
                  {inCartQty > 0 && (
                    <span className="self-start rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      En carrito: {inCartQty}
                    </span>
                  )}
                  <span
                    className={`self-start rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      available > 0
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400"
                    }`}
                  >
                    {available > 0 ? `${available} disp.` : "Sin stock"}
                  </span>
                  <div className="mt-auto flex items-center justify-between pt-1">
                    <span className="text-base font-bold text-green-600 dark:text-green-400">
                      {formatMoney(product.price)}
                    </span>
                    <button
                      onClick={() => addToCart(product)}
                      disabled={available <= 0}
                      className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Carrito ── */}
      <section className="sticky top-20 flex flex-col rounded-xl border border-neutral-200 bg-white p-5 lg:col-span-2 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-base font-semibold">
          Carrito
          {totalItems > 0 && (
            <span className="ml-2 rounded-full bg-blue-500 px-2 py-0.5 text-xs text-white">
              {totalItems}
            </span>
          )}
        </h2>

        {cart.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-400">
            Agregá productos del catálogo.
          </p>
        ) : (
          <>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto" style={{ maxHeight: "420px" }}>
              {cart.map((line) => {
                const hasDiscount =
                  line.originalPrice > 0 && line.originalPrice > line.unitPrice;
                const discountPct = hasDiscount
                  ? Math.round((1 - line.unitPrice / line.originalPrice) * 100)
                  : 0;
                return (
                  <div
                    key={line.productId}
                    className="grid grid-cols-[42px_1fr_auto] items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-800"
                  >
                    {line.imageUrl ? (
                      <img
                        src={line.imageUrl}
                        alt=""
                        className="h-[42px] w-[42px] rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-[42px] w-[42px] rounded-md bg-neutral-200 dark:bg-neutral-700" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium leading-tight">
                        {line.name}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <button
                          onClick={() => setQuantity(line.productId, line.quantity - 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-neutral-300 text-xs font-bold transition hover:border-blue-500 hover:text-blue-500 dark:border-neutral-600"
                        >
                          −
                        </button>
                        <span className="min-w-[20px] text-center text-xs font-bold">
                          {line.quantity}
                        </span>
                        <button
                          onClick={() => setQuantity(line.productId, line.quantity + 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-neutral-300 text-xs font-bold transition hover:border-blue-500 hover:text-blue-500 dark:border-neutral-600"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {hasDiscount && (
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-neutral-400 line-through">
                            {formatMoney(line.originalPrice)}
                          </span>
                          <span
                            className={`rounded-full px-1.5 py-px text-[10px] font-bold ${
                              line.unitPrice < line.costPrice
                                ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                : line.unitPrice < line.costPrice * 1.4
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                                  : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            }`}
                          >
                            −{discountPct}%
                          </span>
                        </div>
                      )}
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={line.unitPrice}
                        onChange={(e) =>
                          setUnitPrice(line.productId, parseFloat(e.target.value) || 0)
                        }
                        className="w-[80px] rounded-md border border-neutral-300 px-1.5 py-1 text-right text-xs dark:border-neutral-600 dark:bg-neutral-900"
                      />
                      <button
                        onClick={() => removeLine(line.productId)}
                        className="text-xs text-red-500 hover:text-red-400"
                        title="Quitar"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Cliente ── */}
            <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Cliente
              </label>
              <ClientPicker
                clients={clientList}
                value={selectedClient}
                onChange={setSelectedClient}
                onClientCreated={(c) =>
                  setClientList((cur) =>
                    cur.some((x) => x.id === c.id) ? cur : [...cur, c],
                  )
                }
              />
            </div>


            {/* ── Totales ── */}
            <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Items</span>
                <span className="font-bold">{totalItems}</span>
              </div>
              {totalSavings > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Subtotal (normal)</span>
                    <span className="text-neutral-400 line-through">
                      {formatMoney(subtotalOriginal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                    <span>
                      Descuento (
                      {subtotalOriginal > 0
                        ? Math.round((totalSavings / subtotalOriginal) * 100)
                        : 0}
                      %)
                    </span>
                    <span className="font-bold">−{formatMoney(totalSavings)}</span>
                  </div>
                </>
              )}

              <div className="mt-1 flex items-center justify-between border-t border-neutral-200 pt-2 dark:border-neutral-700">
                <span className="text-base font-bold">Total</span>
                <span className="text-xl font-bold">{formatMoney(total)}</span>
              </div>
            </div>

            {/* ── Botón cobrar ── */}
            <button
              onClick={handleCheckout}
              disabled={saving || cart.length === 0}
              className="mt-3 w-full rounded-xl bg-green-600 px-4 py-3 text-base font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Registrando…" : "Cobrar venta"}
            </button>
          </>
        )}

        {error && (
          <p className="mt-3 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {success && (
          <p className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-center text-sm font-medium text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
            {success}
          </p>
        )}
      </section>
    </div>
  );
}
