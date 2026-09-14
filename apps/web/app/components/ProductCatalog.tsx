"use client";

import { useEffect, useRef, useState } from "react";
import {
  getVentaProductos,
  ventaProductoToProduct,
  getProductImageUrl,
  formatMoney,
  type Product,
} from "../lib/api";

const PAGE_SIZE = 20;

export default function ProductCatalog({
  onAdd,
  inCartQty,
  showOriginalPrice = false,
}: {
  onAdd: (product: Product) => void;
  inCartQty?: (productId: number) => number;
  showOriginalPrice?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, activeCategory]);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    getVentaProductos({
      buscar: debouncedQuery || undefined,
      categoria: activeCategory === "all" ? undefined : activeCategory,
      conStock: true,
      page,
      limit: PAGE_SIZE,
    })
      .then((venta) => {
        if (id !== requestId.current) return;
        setProducts(venta.products.map(ventaProductoToProduct));
        setTotal(venta.total);
        setTotalPages(venta.totalPages);
        setCategories((prev) => (prev.length ? prev : venta.categorias ?? []));
      })
      .catch((err) => {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err.message : "Error desconocido");
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [debouncedQuery, activeCategory, page]);

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  function goTo(next: number) {
    setPage(Math.min(Math.max(1, next), Math.max(1, totalPages)));
  }

  const pageNumbers = (() => {
    const max = Math.max(1, totalPages);
    const pages: (number | "...")[] = [];
    const push = (n: number | "...") => {
      if (pages[pages.length - 1] !== n) pages.push(n);
    };
    for (let i = 1; i <= max; i++) {
      if (i === 1 || i === max || Math.abs(i - page) <= 2) push(i);
      else if (pages[pages.length - 1] !== "...") push("...");
    }
    return pages;
  })();

  return (
    <section>
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
            Todos{" "}
            <span className="ml-0.5 opacity-60">
              {activeCategory === "all" ? total : "…"}
            </span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                activeCategory === cat
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-neutral-300 bg-white text-neutral-500 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-16 text-center text-sm text-neutral-400">
          Cargando productos…
        </p>
      ) : products.length === 0 ? (
        <p className="py-12 text-center text-sm text-neutral-400">
          Sin productos.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {products.map((product) => {
            const inCartQtyVal = inCartQty?.(product.id) ?? 0;
            const available = product.stock - inCartQtyVal;
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
                    src={getProductImageUrl(product.imageUrl)!}
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
                  {inCartQtyVal > 0 && (
                    <span className="self-start rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      En carrito: {inCartQtyVal}
                    </span>
                  )}
                  {available > 0 && (
                    <span className="self-start rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900 dark:text-green-300">
                      {available} disp.
                    </span>
                  )}
                  {available <= 0 && (
                    <span className="self-start rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900 dark:text-red-300">
                      Agotado
                    </span>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-1">
                    <div>
                      {showOriginalPrice &&
                        product.regularPrice > 0 &&
                        product.regularPrice > product.price && (
                          <span className="block text-[11px] text-neutral-400 line-through dark:text-neutral-500">
                            {formatMoney(product.regularPrice, product.moneda)}
                          </span>
                        )}
                      <span className="text-base font-bold text-green-600 dark:text-green-400">
                        {formatMoney(product.price, product.moneda)}
                        {product.unidad === "metro" && (
                          <small className="ml-1 align-middle text-[11px] font-bold text-neutral-500 dark:text-neutral-400">
                            /m
                          </small>
                        )}
                      </span>
                      {product.unidad === "metro" && product.metros ? (
                        <span className="block text-[10px] text-neutral-400">
                          Rollo de {product.metros} m
                        </span>
                      ) : null}
                    </div>
                    <button
                      onClick={() => onAdd(product)}
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
      )}

      {/* ── Paginación ── */}
      {totalPages > 1 && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => goTo(page - 1)}
              disabled={page <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 text-sm font-bold transition hover:border-blue-500 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700"
            >
              ‹
            </button>
            {pageNumbers.map((n, i) =>
              n === "..." ? (
                <span
                  key={`e${i}`}
                  className="px-1 text-sm text-neutral-400"
                >
                  …
                </span>
              ) : (
                <button
                  key={n}
                  onClick={() => goTo(n)}
                  className={`h-8 w-8 rounded-md text-sm font-bold transition ${
                    n === page
                      ? "bg-blue-500 text-white"
                      : "border border-neutral-300 hover:border-blue-500 hover:text-blue-500 dark:border-neutral-700"
                  }`}
                >
                  {n}
                </button>
              ),
            )}
            <button
              onClick={() => goTo(page + 1)}
              disabled={page >= totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 text-sm font-bold transition hover:border-blue-500 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700"
            >
              ›
            </button>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Mostrando {from}–{to} de {total} · Página {page} de {totalPages}
          </p>
        </div>
      )}
    </section>
  );
}