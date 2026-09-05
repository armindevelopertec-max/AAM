"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getScrapedProducts,
  updateScrapedPrecio,
  getScrapedImageUrl,
  type ScrapedProduct,
} from "../lib/api";

export default function CatalogManager() {
  const [items, setItems] = useState<ScrapedProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [buscar, setBuscar] = useState("");
  const [filtroFuente, setFiltroFuente] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const products = await getScrapedProducts({
        buscar: buscar || undefined,
        fuente: filtroFuente || undefined,
        page,
        limit: 20,
      });
      setItems(products.items);
      setTotal(products.total);
      setTotalPages(products.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [buscar, filtroFuente, page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Catálogo de productos</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Productos desde el catálogo compartido (Mongo). Edita precio y stock directamente.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre, SKU o marca..."
          value={buscar}
          onChange={(e) => {
            setBuscar(e.target.value);
            setPage(1);
          }}
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
        />
        <select
          value={filtroFuente}
          onChange={(e) => {
            setFiltroFuente(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
        >
          <option value="">Todas las fuentes</option>
          <option value="dahubolivia">Dahua Bolivia</option>
          <option value="dicabolivia">Dica Bolivia</option>
        </select>
      </div>

      {loading ? (
        <p className="text-neutral-500">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-neutral-500">No hay productos en el catálogo.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item._id}
              className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {item.imagenesDescargadas.length > 0 ? (
                  <img
                    src={getScrapedImageUrl(item.imagenesDescargadas[0].key)}
                    alt={item.datosCrudos.nombre}
                    className="h-14 w-14 flex-shrink-0 rounded border border-neutral-200 object-cover dark:border-neutral-700"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded border border-neutral-200 text-xs text-neutral-400 dark:border-neutral-700">
                    Sin imagen
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-medium">{item.datosCrudos.nombre}</h3>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
                    <span>SKU: {item.datosCrudos.sku || "N/A"}</span>
                    <span>Marca: {item.datosCrudos.marca || "N/A"}</span>
                    <span>Categoría: {item.categoriaScrape}</span>
                    <span>Fuente: {item.fuente}</span>
                  </div>
                  <div className="mt-1 flex gap-4 text-sm">
                    <span>
                      Regular: {item.datosCrudos.precioRegular} {item.datosCrudos.moneda}
                    </span>
                    <span>
                      Oferta: {item.datosCrudos.precioOferta} {item.datosCrudos.moneda}
                    </span>
                    <span
                      className={
                        hasStock(item.datosCrudos)
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {hasStock(item.datosCrudos) ? "En stock" : "Sin stock"}
                      {typeof item.datosCrudos.stockCantidad === "number" &&
                        ` (${item.datosCrudos.stockCantidad})`}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedId(expandedId === item._id ? null : item._id)}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
                >
                  {expandedId === item._id ? "Menos" : "Editar"}
                </button>
              </div>

              {expandedId === item._id && (
                <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                  <PrecioEditor
                    product={item}
                    onSaved={() => {
                      void fetchData();
                    }}
                  />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium">Descripción corta:</p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {item.datosCrudos.descripcionCorta || "Sin descripción"}
                      </p>
                      <p className="mt-2 text-sm font-medium">Categorías:</p>
                      <div className="flex flex-wrap gap-1">
                        {item.datosCrudos.categorias.map((cat) => (
                          <span key={cat} className="rounded bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Imágenes:</p>
                      <div className="flex flex-wrap gap-2">
                        {item.imagenesDescargadas.map((img) => (
                          <a
                            key={img.key}
                            href={getScrapedImageUrl(img.key)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img
                              src={getScrapedImageUrl(img.key)}
                              alt={item.datosCrudos.nombre}
                              className="h-20 w-20 rounded border border-neutral-200 object-cover dark:border-neutral-700"
                              loading="lazy"
                            />
                          </a>
                        ))}
                        {item.imagenesDescargadas.length === 0 && (
                          <span className="text-xs text-neutral-400">Sin imágenes</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded border border-neutral-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-neutral-700"
            >
              Anterior
            </button>
            {getPageNumbers(page, totalPages).map((p, i) =>
              p === "…" ? (
                <span
                  key={`ellipsis-${i}`}
                  className="px-1 text-sm text-neutral-400"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  disabled={p === page}
                  className={`min-w-8 rounded border px-2 py-1 text-sm ${
                    p === page
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-neutral-300 hover:border-blue-400 dark:border-neutral-700 dark:hover:border-blue-600"
                  }`}
                >
                  {p}
                </button>
              ),
            )}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="rounded border border-neutral-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-neutral-700"
            >
              Siguiente
            </button>
          </div>
          <span className="text-sm text-neutral-500">
            Página {page} de {totalPages} ({total} productos)
          </span>
        </div>
      )}
    </div>
  );
}

function PrecioEditor({
  product,
  onSaved,
}: {
  product: ScrapedProduct;
  onSaved: () => void;
}) {
  const [oferta, setOferta] = useState(String(product.datosCrudos.precioOferta ?? 0));
  const [regular, setRegular] = useState(String(product.datosCrudos.precioRegular ?? 0));
  const [stock, setStock] = useState(String(product.datosCrudos.stockCantidad ?? 0));
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setMsg(null);
    try {
      await updateScrapedPrecio(product._id, {
        precioOferta: parseFloat(oferta) || 0,
        precioRegular: parseFloat(regular) || 0,
        stockCantidad: parseInt(stock, 10) || 0,
      });
      setMsg("Guardado (precio y stock en el catálogo Mongo)");
      onSaved();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/40 p-3 dark:border-blue-900 dark:bg-blue-950/20">
      <p className="mb-2 text-sm font-medium">Precio y stock en el catálogo (Mongo)</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Precio oferta (venta)
          <input
            type="number"
            step="0.01"
            min="0"
            value={oferta}
            onChange={(e) => setOferta(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Precio regular
          <input
            type="number"
            step="0.01"
            min="0"
            value={regular}
            onChange={(e) => setRegular(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Stock
          <input
            type="number"
            step="1"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </label>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Guardando…" : "Guardar"}
        </button>
        {msg && <span className="text-xs text-neutral-500">{msg}</span>}
      </div>
    </div>
  );
}

function hasStock(datosCrudos: ScrapedProduct["datosCrudos"]): boolean {
  return typeof datosCrudos.stockCantidad === "number"
    ? datosCrudos.stockCantidad > 0
    : datosCrudos.enStock;
}

function getPageNumbers(
  current: number,
  total: number,
): (number | "…")[] {
  const windowSize = 5;
  let start = Math.max(1, current - Math.floor(windowSize / 2));
  let end = start + windowSize - 1;
  if (end > total) {
    end = total;
    start = Math.max(1, end - windowSize + 1);
  }
  const pages: (number | "…")[] = [];
  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("…");
  }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("…");
  if (end < total) pages.push(total);
  return pages;
}