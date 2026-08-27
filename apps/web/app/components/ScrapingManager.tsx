"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getScrapedProducts,
  getScrapingStats,
  importScrapedToPostgres,
  discardScrapedProduct,
  deleteScrapedProduct,
  getScrapedImageUrl,
  type ScrapedProduct,
  type ScrapingStats,
} from "../lib/api";

export default function ScrapingManager() {
  const [stats, setStats] = useState<ScrapingStats | null>(null);
  const [items, setItems] = useState<ScrapedProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [buscar, setBuscar] = useState("");
  const [filtroImportado, setFiltroImportado] = useState<string>("");
  const [filtroDescartado, setFiltroDescartado] = useState<string>("false");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [importModal, setImportModal] = useState<ScrapedProduct | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [products, statsData] = await Promise.all([
        getScrapedProducts({
          buscar: buscar || undefined,
          importado: filtroImportado || undefined,
          descartado: filtroDescartado || undefined,
          page,
          limit: 20,
        }),
        getScrapingStats(),
      ]);
      setItems(products.items);
      setTotal(products.total);
      setTotalPages(products.totalPages);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [buscar, filtroImportado, filtroDescartado, page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleImport(id: string) {
    setActionLoading(id);
    try {
      await importScrapedToPostgres(id);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al importar");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDiscard(id: string, current: boolean) {
    setActionLoading(id);
    try {
      await discardScrapedProduct(id, !current);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar este producto permanentemente?")) return;
    setActionLoading(id);
    try {
      await deleteScrapedProduct(id);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Scraping</h1>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Pendientes" value={stats.pendientes} color="text-amber-600" />
          <StatCard label="Importados" value={stats.importados} color="text-green-600" />
          <StatCard label="Descartados" value={stats.descartados} color="text-red-600" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre, SKU o marca..."
          value={buscar}
          onChange={(e) => { setBuscar(e.target.value); setPage(1); }}
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
        />
        <select
          value={filtroImportado}
          onChange={(e) => { setFiltroImportado(e.target.value); setPage(1); }}
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
        >
          <option value="">Todos</option>
          <option value="true">Importados</option>
          <option value="false">No importados</option>
        </select>
        <select
          value={filtroDescartado}
          onChange={(e) => { setFiltroDescartado(e.target.value); setPage(1); }}
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
        >
          <option value="">Todos</option>
          <option value="false">No descartados</option>
          <option value="true">Descartados</option>
        </select>
      </div>

      {loading ? (
        <p className="text-neutral-500">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-neutral-500">No hay productos scrapeados.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item._id}
              className={`rounded-lg border p-4 ${
                item.descartado
                  ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
                  : item.importadoAPostgres
                    ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
                    : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {item.imagenesDescargadas.length > 0 && (
                  <img
                    src={getScrapedImageUrl(item.imagenesDescargadas[0].key)}
                    alt={item.datosCrudos.nombre}
                    className="h-14 w-14 flex-shrink-0 rounded border border-neutral-200 object-cover dark:border-neutral-700"
                    loading="lazy"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{item.datosCrudos.nombre}</h3>
                    {item.importadoAPostgres && (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">
                        Importado
                      </span>
                    )}
                    {item.descartado && (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900 dark:text-red-300">
                        Descartado
                      </span>
                    )}
                  </div>
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
                    <span className={item.datosCrudos.enStock ? "text-green-600" : "text-red-600"}>
                      {item.datosCrudos.enStock ? "En stock" : "Sin stock"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!item.importadoAPostgres && !item.descartado && (
                    <button
                      onClick={() => setImportModal(item)}
                      disabled={actionLoading === item._id}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Importar
                    </button>
                  )}
                  <button
                    onClick={() => setExpandedId(expandedId === item._id ? null : item._id)}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
                  >
                    {expandedId === item._id ? "Menos" : "Detalles"}
                  </button>
                  {!item.descartado && (
                    <button
                      onClick={() => handleDiscard(item._id, item.descartado)}
                      disabled={actionLoading === item._id}
                      className="rounded-md border border-amber-300 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                    >
                      Descartar
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item._id)}
                    disabled={actionLoading === item._id}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {expandedId === item._id && (
                <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-700">
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
                      {item.historialPrecios.length > 0 && (
                        <>
                          <p className="mt-2 text-sm font-medium">Último precio registrado:</p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {item.historialPrecios[item.historialPrecios.length - 1].precioRegular}{" "}
                            {item.datosCrudos.moneda}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded border border-neutral-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-neutral-700"
          >
            Anterior
          </button>
          <span className="text-sm text-neutral-500">
            Pagina {page} de {totalPages} ({total} productos)
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="rounded border border-neutral-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-neutral-700"
          >
            Siguiente
          </button>
        </div>
      )}

      {importModal && (
        <ImportModal
          product={importModal}
          onClose={() => setImportModal(null)}
          onConfirm={async (overrides) => {
            setActionLoading(importModal._id);
            try {
              await importScrapedToPostgres(importModal._id, overrides);
              setImportModal(null);
              await fetchData();
            } catch (err) {
              alert(err instanceof Error ? err.message : "Error al importar");
            } finally {
              setActionLoading(null);
            }
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "text-neutral-900",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function ImportModal({
  product,
  onClose,
  onConfirm,
}: {
  product: ScrapedProduct;
  onClose: () => void;
  onConfirm: (overrides: {
    name?: string;
    sku?: string;
    category?: string;
    costPrice?: number;
    regularPrice?: number;
    price?: number;
    stock?: number;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(product.datosCrudos.nombre);
  const [sku, setSku] = useState(product.datosCrudos.sku || `SCRAP-${product.datosCrudos.idExterno}`);
  const [category, setCategory] = useState(product.categoriaScrape);
  const [costPrice, setCostPrice] = useState(String(product.datosCrudos.precioRegular));
  const [regularPrice, setRegularPrice] = useState(String(product.datosCrudos.precioRegular));
  const [price, setPrice] = useState(String(product.datosCrudos.precioOferta || product.datosCrudos.precioRegular));
  const [stock, setStock] = useState(String(product.datosCrudos.stockCantidad));
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm({
        name,
        sku,
        category,
        costPrice: parseFloat(costPrice) || 0,
        regularPrice: parseFloat(regularPrice) || 0,
        price: parseFloat(price) || 0,
        stock: parseInt(stock, 10) || 0,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">Importar a Inventario</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Revisa los datos antes de importar
        </p>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-neutral-600 dark:text-neutral-400">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-neutral-600 dark:text-neutral-400">SKU</label>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-neutral-600 dark:text-neutral-400">Categoría</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-neutral-600 dark:text-neutral-400">Costo</label>
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-neutral-600 dark:text-neutral-400">P. Regular</label>
              <input
                type="number"
                step="0.01"
                value={regularPrice}
                onChange={(e) => setRegularPrice(e.target.value)}
                className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-neutral-600 dark:text-neutral-400">Precio venta</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-neutral-600 dark:text-neutral-400">Stock</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Importando..." : "Confirmar importación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
