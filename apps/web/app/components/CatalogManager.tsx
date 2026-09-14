"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getScrapedProducts,
  updateScrapedPrecio,
  createScrapedProduct,
  uploadScrapedImages,
  deleteScrapedImage,
  getScrapedImageUrl,
  type ScrapedProduct,
} from "../lib/api";

const emptyManual = () => ({
  nombre: "",
  categoria: "",
  marca: "",
  sku: "",
  precioRegular: "",
  precioOferta: "",
  stockCantidad: "0",
  moneda: "BOB",
  unidad: "unidad",
  precioMetro: "",
  metros: "",
  descripcionCorta: "",
});

type ManualDraft = ReturnType<typeof emptyManual>;

const toNum = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const toStr = (v: string) => (v.trim() ? v.trim() : undefined);

export default function CatalogManager() {
  const [items, setItems] = useState<ScrapedProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [buscar, setBuscar] = useState("");
  const [filtroFuente, setFiltroFuente] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [newProducto, setNewProducto] = useState<ManualDraft>(emptyManual);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [imagenesFiles, setImagenesFiles] = useState<File[]>([]);
  const [uploadingImgsId, setUploadingImgsId] = useState<string | null>(null);
  const [removingImgKey, setRemovingImgKey] = useState<string | null>(null);

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

  async function handleCrear() {
    setCreateMsg(null);
    if (!newProducto.nombre.trim()) {
      setCreateMsg("El nombre es obligatorio.");
      return;
    }
    setGuardando(true);
    try {
      const esMetro = newProducto.unidad === "metro";
      const nombre = newProducto.nombre.trim();
      const created = await createScrapedProduct({
        nombre,
        categoria: toStr(newProducto.categoria),
        marca: toStr(newProducto.marca),
        sku: toStr(newProducto.sku),
        moneda: toStr(newProducto.moneda),
        precioRegular: toNum(newProducto.precioRegular),
        precioOferta: toNum(newProducto.precioOferta),
        stockCantidad: Math.floor(toNum(newProducto.stockCantidad)),
        unidad: newProducto.unidad,
        ...(esMetro
          ? {
              precioMetro: toNum(newProducto.precioMetro),
              metros: toNum(newProducto.metros),
            }
          : {}),
        descripcionCorta: toStr(newProducto.descripcionCorta),
      });
      if (imagenesFiles.length > 0) {
        await uploadScrapedImages(created._id, imagenesFiles);
      }
      setCreando(false);
      setNewProducto(emptyManual());
      setImagenesFiles([]);
      setBuscar(nombre);
      setPage(1);
      setCreateMsg(`Producto "${nombre}" agregado al catálogo.`);
    } catch (err) {
      setCreateMsg(err instanceof Error ? err.message : "No se pudo agregar el producto");
    } finally {
      setGuardando(false);
    }
  }

  async function handleSubirImagenes(id: string, fileList?: FileList | null) {
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0) return;
    setCreateMsg(null);
    setUploadingImgsId(id);
    try {
      await uploadScrapedImages(id, files);
      await fetchData();
    } catch (err) {
      setCreateMsg(err instanceof Error ? err.message : "No se pudieron subir las imágenes");
    } finally {
      setUploadingImgsId(null);
    }
  }

  async function handleQuitarImagen(id: string, key: string) {
    if (!confirm("¿Eliminar esta imagen?")) return;
    setCreateMsg(null);
    setRemovingImgKey(key);
    try {
      await deleteScrapedImage(id, key);
      await fetchData();
    } catch (err) {
      setCreateMsg(err instanceof Error ? err.message : "No se pudo eliminar la imagen");
    } finally {
      setRemovingImgKey(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catálogo de productos</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Productos desde el catálogo compartido (Mongo). Edita precio y stock directamente.
          </p>
        </div>
        <button
          onClick={() => {
            setCreando((c) => !c);
            setCreateMsg(null);
            setImagenesFiles([]);
          }}
          className="w-fit rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          {creando ? "Cancelar" : "Agregar producto"}
        </button>
      </div>

      {creando && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900 dark:bg-blue-950/20">
          <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-white">
            Nuevo producto manual
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              Nombre *
              <input
                value={newProducto.nombre}
                onChange={(e) => setNewProducto((d) => ({ ...d, nombre: e.target.value }))}
                placeholder="Ej. Cámara IP 2MP"
                className="rounded-md border border-neutral-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-800"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              Categoría
              <input
                value={newProducto.categoria}
                onChange={(e) => setNewProducto((d) => ({ ...d, categoria: e.target.value }))}
                placeholder="Ej. Cámaras"
                className="rounded-md border border-neutral-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-800"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              Marca
              <input
                value={newProducto.marca}
                onChange={(e) => setNewProducto((d) => ({ ...d, marca: e.target.value }))}
                placeholder="Ej. Dahua"
                className="rounded-md border border-neutral-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-800"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              SKU
              <input
                value={newProducto.sku}
                onChange={(e) => setNewProducto((d) => ({ ...d, sku: e.target.value }))}
                placeholder="Ej. IPC-2MP"
                className="rounded-md border border-neutral-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-800"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              Precio regular
              <input
                type="number"
                min="0"
                step="0.01"
                value={newProducto.precioRegular}
                onChange={(e) => setNewProducto((d) => ({ ...d, precioRegular: e.target.value }))}
                className="rounded-md border border-neutral-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-800"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              Precio de venta (oferta)
              <input
                type="number"
                min="0"
                step="0.01"
                value={newProducto.precioOferta}
                onChange={(e) => setNewProducto((d) => ({ ...d, precioOferta: e.target.value }))}
                className="rounded-md border border-neutral-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-800"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              Stock
              <input
                type="number"
                min="0"
                step="1"
                value={newProducto.stockCantidad}
                onChange={(e) => setNewProducto((d) => ({ ...d, stockCantidad: e.target.value }))}
                className="rounded-md border border-neutral-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-800"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              Moneda
              <input
                value={newProducto.moneda}
                onChange={(e) => setNewProducto((d) => ({ ...d, moneda: e.target.value }))}
                placeholder="BOB"
                className="rounded-md border border-neutral-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-800"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              Unidad
              <select
                value={newProducto.unidad}
                onChange={(e) => setNewProducto((d) => ({ ...d, unidad: e.target.value }))}
                className="rounded-md border border-neutral-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-800"
              >
                <option value="unidad">Unidad</option>
                <option value="metro">Metro</option>
              </select>
            </label>
            {newProducto.unidad === "metro" && (
              <>
                <label className="flex flex-col gap-1 text-xs text-blue-600 dark:text-blue-400">
                  Precio por metro (Bs/m)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newProducto.precioMetro}
                    onChange={(e) => setNewProducto((d) => ({ ...d, precioMetro: e.target.value }))}
                    className="rounded-md border border-neutral-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-800"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Metros por rollo
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newProducto.metros}
                    onChange={(e) => setNewProducto((d) => ({ ...d, metros: e.target.value }))}
                    className="rounded-md border border-neutral-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-800"
                  />
                </label>
              </>
            )}
            <label className="flex flex-col gap-1 text-xs text-neutral-500 dark:text-neutral-400 sm:col-span-2 lg:col-span-4">
              Descripción corta
              <input
                value={newProducto.descripcionCorta}
                onChange={(e) => setNewProducto((d) => ({ ...d, descripcionCorta: e.target.value }))}
                className="rounded-md border border-neutral-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-800"
              />
            </label>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="flex flex-col gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                Imágenes (opcional)
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    setImagenesFiles(Array.from(e.currentTarget.files ?? []));
                    e.currentTarget.value = "";
                  }}
                  className="block w-full text-xs file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
                />
              </label>
              {imagenesFiles.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {imagenesFiles.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-1.5 rounded-md bg-white px-2 py-1 text-xs text-neutral-700 shadow-sm dark:bg-neutral-800 dark:text-neutral-200"
                    >
                      {f.name}
                      <button
                        type="button"
                        onClick={() =>
                          setImagenesFiles((prev) => prev.filter((_, j) => j !== i))
                        }
                        className="text-red-500 hover:text-red-400"
                        title="Quitar"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleCrear}
              disabled={guardando}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar producto"}
            </button>
            <button
              onClick={() => { setCreando(false); setCreateMsg(null); setImagenesFiles([]); }}
              disabled={guardando}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm transition hover:border-neutral-400 disabled:opacity-50 dark:border-neutral-700"
            >
              Cancelar
            </button>
            {createMsg && (
              <span
                className={`text-sm ${createMsg.includes("obligatorio") || /Error|No se pudo/.test(createMsg) ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
              >
                {createMsg}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Buscar por nombre, SKU o marca..."
          value={buscar}
          onChange={(e) => {
            setBuscar(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800 sm:flex-1"
        />
        <select
          value={filtroFuente}
          onChange={(e) => {
            setFiltroFuente(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800 sm:w-auto"
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
              className="rounded-lg border border-neutral-200 bg-white p-3 sm:p-4 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex gap-3 sm:gap-4">
                {item.imagenesDescargadas.length > 0 ? (
                  <img
                    src={getScrapedImageUrl(item.imagenesDescargadas[0].key)}
                    alt={item.datosCrudos.nombre}
                    className="h-12 w-12 flex-shrink-0 rounded border border-neutral-200 object-cover sm:h-14 sm:w-14 dark:border-neutral-700"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded border border-neutral-200 text-[10px] text-neutral-400 sm:h-14 sm:w-14 dark:border-neutral-700">
                    Sin img
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 truncate text-sm font-medium sm:text-base">
                      {item.datosCrudos.nombre}
                    </h3>
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === item._id ? null : item._id)
                      }
                      className="flex-shrink-0 rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 sm:px-3 sm:py-1.5 sm:text-sm"
                    >
                      {expandedId === item._id ? "Menos" : "Editar"}
                    </button>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-neutral-500 sm:text-sm sm:gap-x-4 sm:gap-y-1">
                    <span className="truncate">SKU: {item.datosCrudos.sku || "N/A"}</span>
                    <span className="hidden sm:inline">Marca: {item.datosCrudos.marca || "N/A"}</span>
                    <span className="hidden sm:inline">Categoría: {item.categoriaScrape}</span>
                    <span className="hidden sm:inline">Fuente: {item.fuente}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm sm:gap-x-4">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {item.datosCrudos.precioRegular} {item.datosCrudos.moneda}
                    </span>
                    {item.datosCrudos.precioOferta > 0 && (
                      <span className="font-medium text-green-600 dark:text-green-400">
                        Oferta: {item.datosCrudos.precioOferta} {item.datosCrudos.moneda}
                      </span>
                    )}
                    {item.datosCrudos.unidad === "metro" &&
                      (item.datosCrudos.precioMetro ?? 0) > 0 && (
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          Precio/m: {item.datosCrudos.precioMetro} {item.datosCrudos.moneda}
                          {item.datosCrudos.metros ? ` (rollo de ${item.datosCrudos.metros} m)` : ""}
                        </span>
                      )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold sm:text-xs ${
                        hasStock(item.datosCrudos)
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                      }`}
                    >
                      {hasStock(item.datosCrudos)
                        ? `En stock (${item.datosCrudos.stockCantidad})`
                        : "Sin stock"}
                    </span>
                  </div>
                </div>
              </div>

              {expandedId === item._id && (
                <div className="mt-3 border-t border-neutral-200 pt-3 sm:mt-4 sm:pt-4 dark:border-neutral-700">
                  <PrecioEditor
                    product={item}
                    onSaved={() => {
                      void fetchData();
                    }}
                  />
                  <div className="grid grid-cols-1 gap-4 pt-3 sm:pt-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium">Descripción corta:</p>
                      <p className="mt-1 text-xs text-neutral-600 sm:text-sm dark:text-neutral-400">
                        {item.datosCrudos.descripcionCorta || "Sin descripción"}
                      </p>
                      <p className="mt-2 text-sm font-medium">Categorías:</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.datosCrudos.categorias.map((cat) => (
                          <span key={cat} className="rounded bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">Imágenes:</p>
                        <label
                          htmlFor={`scraped-files-${item._id}`}
                          className="cursor-pointer rounded-md border border-neutral-300 px-2 py-1 text-xs transition hover:border-neutral-400 dark:border-neutral-700"
                        >
                          {uploadingImgsId === item._id ? "Subiendo..." : "Subir imagen(es)"}
                        </label>
                        <input
                          id={`scraped-files-${item._id}`}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            void handleSubirImagenes(item._id, e.currentTarget.files);
                            e.currentTarget.value = "";
                          }}
                        />
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {item.imagenesDescargadas.map((img) => (
                          <div key={img.key} className="relative">
                            <a
                              href={getScrapedImageUrl(img.key)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={getScrapedImageUrl(img.key)}
                                alt={item.datosCrudos.nombre}
                                className="h-16 w-16 rounded border border-neutral-200 object-cover sm:h-20 sm:w-20 dark:border-neutral-700"
                                loading="lazy"
                              />
                            </a>
                            <button
                              type="button"
                              onClick={() => void handleQuitarImagen(item._id, img.key)}
                              disabled={removingImgKey === img.key}
                              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] font-bold text-white transition hover:bg-black disabled:opacity-60"
                              title="Quitar imagen"
                            >
                              {removingImgKey === img.key ? "…" : "✕"}
                            </button>
                          </div>
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
              className="rounded border border-neutral-300 px-2 py-1 text-xs disabled:opacity-50 sm:px-3 sm:text-sm dark:border-neutral-700"
            >
              Anterior
            </button>
            {getPageNumbers(page, totalPages).map((p, i) =>
              p === "…" ? (
                <span
                  key={`ellipsis-${i}`}
                  className="px-1 text-xs text-neutral-400 sm:text-sm"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  disabled={p === page}
                  className={`min-w-7 rounded border px-1.5 py-1 text-xs sm:min-w-8 sm:px-2 sm:text-sm ${
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
              className="rounded border border-neutral-300 px-2 py-1 text-xs disabled:opacity-50 sm:px-3 sm:text-sm dark:border-neutral-700"
            >
              Siguiente
            </button>
          </div>
          <span className="text-xs text-neutral-500 sm:text-sm">
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
  const [precioMetro, setPrecioMetro] = useState(
    String(product.datosCrudos.precioMetro ?? 0),
  );
  const esPorMetro = product.datosCrudos.unidad === "metro";
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
        ...(esPorMetro
          ? { precioMetro: parseFloat(precioMetro) || 0 }
          : {}),
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
        {esPorMetro && (
          <label className="flex flex-col gap-1 text-xs text-blue-600 dark:text-blue-400">
            Precio por metro (Bs/m)
            <input
              type="number"
              step="0.01"
              min="0"
              value={precioMetro}
              onChange={(e) => setPrecioMetro(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </label>
        )}
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