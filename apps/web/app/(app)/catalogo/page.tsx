"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  getCatalogo,
  updateProducto,
  deleteProducto,
  deleteCatalogoImagen,
  uploadCatalogoImagenes,
  importCatalogoFromJson,
  type CatalogoProducto,
  type CatalogoPrecioVentaTipo,
  type CatalogoImagen,
  formatMoney,
} from "../../lib/api";

type Draft = {
  nombre: string;
  descripcion: string;
  marca: string;
  modelo: string;
  categoria: string;
  canales: string;
  precio: string;
  precioVentaTipo: string;
  precioVentaValor: string;
  moneda: string;
};

const FIELDS: { key: keyof Draft; label: string; type?: "number" }[] = [
  { key: "nombre", label: "Nombre" },
  { key: "marca", label: "Marca" },
  { key: "modelo", label: "Modelo" },
  { key: "categoria", label: "Categoría" },
  { key: "canales", label: "Canales", type: "number" },
  { key: "precio", label: "Precio de compra", type: "number" },
  { key: "moneda", label: "Moneda" },
];

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getPrecioVentaPreview(
  precioCompra: string,
  precioVentaTipo: string,
  precioVentaValor: string,
): number | null {
  if (!precioVentaTipo || !precioVentaValor.trim()) return null;
  const valor = Number(precioVentaValor);
  if (!Number.isFinite(valor)) return null;
  if (precioVentaTipo === "fijo") return roundMoney(valor);
  if (precioVentaTipo === "porcentaje") {
    const compra = Number(precioCompra);
    if (!Number.isFinite(compra)) return null;
    return roundMoney(compra * (1 + valor / 100));
  }
  return null;
}

function toDraft(p: CatalogoProducto): Draft {
  return {
    nombre: p.nombre ?? "",
    descripcion: p.descripcion ?? "",
    marca: p.marca ?? "",
    modelo: p.modelo ?? "",
    categoria: p.categoria ?? "",
    canales: p.canales != null ? String(p.canales) : "",
    precio: p.precio != null ? String(p.precio) : "",
    precioVentaTipo: p.precioVentaTipo ?? "",
    precioVentaValor: p.precioVentaValor != null ? String(p.precioVentaValor) : "",
    moneda: p.moneda ?? "",
  };
}

const str = (v: string) => (v.trim() ? v : null);
const num = (v: string) => (v.trim() ? Number(v) : null);
const saleType = (v: string): CatalogoPrecioVentaTipo | null =>
  v === "fijo" || v === "porcentaje" ? v : null;

const inputCls =
  "block w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100";

function toPatch(draft: Draft) {
  return {
    nombre: str(draft.nombre),
    descripcion: str(draft.descripcion),
    marca: str(draft.marca),
    modelo: str(draft.modelo),
    categoria: str(draft.categoria),
    canales: num(draft.canales),
    precio: num(draft.precio),
    precioVentaTipo: saleType(draft.precioVentaTipo),
    precioVentaValor: num(draft.precioVentaValor),
    moneda: str(draft.moneda),
  };
}

function getProductId(p: CatalogoProducto): number {
  return (p as CatalogoProducto & { catalogoId?: number }).catalogoId ?? (p as CatalogoProducto & { id?: number }).id ?? 0;
}

export default function CatalogoPage() {
  const [productos, setProductos] = useState<CatalogoProducto[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [uploadingImagesId, setUploadingImagesId] = useState<number | null>(null);
  const [removingImageKey, setRemovingImageKey] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getCatalogo(query || undefined, undefined, undefined, page, 20)
      .then((data) => {
        if (active) {
          setProductos(data.productos);
          setTotal(data.catalogo.total);
          setTotalPages(data.catalogo.totalPages);
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Error desconocido");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [query, page]);

  const startEditRow = (p: CatalogoProducto) => {
    setRowError(null);
    setEditingId(getProductId(p));
    setDraft(toDraft(p));
  };

  const cancelEdit = () => { setEditingId(null); setDraft(null); };

  const saveEdit = async () => {
    if (!editingId || !draft) return;
    setSavingId(editingId);
    setRowError(null);
    const hasSaleType = Boolean(draft.precioVentaTipo.trim());
    const hasSaleValue = Boolean(draft.precioVentaValor.trim());
    if (hasSaleType !== hasSaleValue) {
      setRowError("Completa el tipo y el valor del precio de venta, o deja ambos vacíos.");
      setSavingId(null);
      return;
    }
    if (draft.precioVentaTipo === "porcentaje" && !draft.precio.trim()) {
      setRowError("Para calcular un porcentaje de venta necesitas un precio de compra.");
      setSavingId(null);
      return;
    }
    try {
      await updateProducto(editingId, toPatch(draft));
      cancelEdit();
      const data = await getCatalogo(query || undefined, undefined, undefined, page, 20);
      setProductos(data.productos);
      setTotal(data.catalogo.total);
      setTotalPages(data.catalogo.totalPages);
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSavingId(null);
    }
  };

  const removeRow = async (p: CatalogoProducto) => {
    const id = getProductId(p);
    if (!confirm(`¿Eliminar el producto "${p.nombre}" (id ${id})?`)) return;
    setDeletingId(id);
    setRowError(null);
    try {
      await deleteProducto(id);
      const data = await getCatalogo(query || undefined, undefined, undefined, page, 20);
      setProductos(data.productos);
      setTotal(data.catalogo.total);
      setTotalPages(data.catalogo.totalPages);
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setDeletingId(null);
    }
  };

  const handleUploadImages = async (id: number, fileList?: FileList | null) => {
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0) return;
    setRowError(null);
    setUploadingImagesId(id);
    try {
      await uploadCatalogoImagenes(id, files);
      const data = await getCatalogo(query || undefined, undefined, undefined, page, 20);
      setProductos(data.productos);
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "No se pudieron subir las imágenes");
    } finally {
      setUploadingImagesId(null);
    }
  };

  const handleRemoveImage = async (id: number, key: string) => {
    setRowError(null);
    setRemovingImageKey(key);
    try {
      await deleteCatalogoImagen(id, key);
      const data = await getCatalogo(query || undefined, undefined, undefined, page, 20);
      setProductos(data.productos);
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "No se pudo eliminar la imagen");
    } finally {
      setRemovingImageKey(null);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await importCatalogoFromJson();
      alert(`Importados: ${result.imported}, Ya existían: ${result.skipped}, Total: ${result.total}`);
      const data = await getCatalogo(query || undefined, undefined, undefined, page, 20);
      setProductos(data.productos);
      setTotal(data.catalogo.total);
      setTotalPages(data.catalogo.totalPages);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al importar");
    } finally {
      setImporting(false);
    }
  };

  const onFieldChange = (field: keyof Draft, value: string) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Catálogo CCTV</h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            {total} productos en base de datos. El precio actual es el costo de compra;
            también puedes definir una venta fija o un porcentaje sobre ese costo.
          </p>
        </div>
        <button
          onClick={handleImport}
          disabled={importing}
          className="w-fit rounded-md border border-neutral-300 px-4 py-2 text-sm transition hover:border-neutral-400 disabled:opacity-50 dark:border-neutral-700"
        >
          {importing ? "Importando..." : "Importar desde JSON"}
        </button>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="query" className="block text-sm text-neutral-500 dark:text-neutral-400">
            Buscar
          </label>
          <input
            id="query"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Nombre, marca o modelo"
            className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
      </div>

      {rowError && <p className="text-sm text-red-600 dark:text-red-400">{rowError}</p>}

      <div className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-300">
        <span>{total} productos</span>
        <span>Página {page} de {totalPages}</span>
      </div>

      {loading ? (
        <p className="text-neutral-500">Cargando...</p>
      ) : productos.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          No hay productos. Importa desde JSON para comenzar.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {productos.map((p) => {
            const pid = getProductId(p);
            const editMode = editingId === pid;
            const saving = savingId === pid;
            const deleting = deletingId === pid;
            const d = draft ?? toDraft(p);
            const currency = p.moneda ?? "BOB";
            const saleTypeValue = editMode ? d.precioVentaTipo : (p.precioVentaTipo ?? "");
            const saleValueSource = editMode
              ? d.precioVentaValor
              : p.precioVentaValor != null ? String(p.precioVentaValor) : "";
            const salePreview = getPrecioVentaPreview(d.precio, d.precioVentaTipo, d.precioVentaValor);
            const saleTypeLabel = saleTypeValue === "porcentaje" ? "Porcentaje" : saleTypeValue === "fijo" ? "Fijo" : "Sin definir";
            const saleValueLabel = saleTypeValue === "porcentaje"
              ? saleValueSource ? `${saleValueSource}%` : "—"
              : saleTypeValue === "fijo"
                ? saleValueSource ? formatMoney(Number(saleValueSource), currency) : "—"
                : "—";
            const saleCalculated = editMode ? salePreview : (p as CatalogoProducto & { precioVenta?: number | null }).precioVenta;
            const images: CatalogoImagen[] = p.imagenes ?? [];

            return (
              <article
                key={pid}
                className={`rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 ${editMode ? "ring-2 ring-neutral-400 dark:ring-neutral-600" : ""}`}
              >
                <header className="mb-3 flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">#{pid}</span>
                    {editMode ? (
                      <input value={d.nombre} onChange={(e) => onFieldChange("nombre", e.target.value)} placeholder="Nombre" className={inputCls + " mt-1"} />
                    ) : (
                      <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white" title={p.nombre ?? undefined}>
                        {p.nombre || <span className="italic">Sin nombre</span>}
                      </p>
                    )}
                  </div>
                  {!editMode && (
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                      p.categoria ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" : "text-neutral-500"
                    }`}>
                      {p.categoria || "Sin categoría"}
                    </span>
                  )}
                </header>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {FIELDS.filter((f) => f.key !== "nombre").map((f) => (
                    <div key={f.key}>
                      <dt className="text-xs text-neutral-500 dark:text-neutral-400">{f.label}</dt>
                      {editMode ? (
                        <input type={f.type} value={d[f.key]} onChange={(e) => onFieldChange(f.key, e.target.value)} className={inputCls} />
                      ) : (
                        <dd className="mt-0.5 text-sm text-neutral-700 dark:text-neutral-300">
                          {f.key === "precio"
                            ? p.precio != null ? formatMoney(p.precio, p.moneda ?? "BOB") : "—"
                            : (p as unknown as Record<string, number | string | null>)[f.key] == null
                              ? "—"
                              : String((p as unknown as Record<string, number | string | null>)[f.key])}
                        </dd>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-lg border border-dashed border-neutral-200 p-3 dark:border-neutral-800">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <dt className="text-xs text-neutral-500 dark:text-neutral-400">Precio de venta</dt>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">{saleTypeLabel}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-neutral-500 dark:text-neutral-400">Tipo</dt>
                      {editMode ? (
                        <select value={d.precioVentaTipo} onChange={(e) => onFieldChange("precioVentaTipo", e.target.value)} className={inputCls}>
                          <option value="">Sin definir</option>
                          <option value="fijo">Fijo</option>
                          <option value="porcentaje">Porcentaje sobre compra</option>
                        </select>
                      ) : (
                        <dd className="mt-0.5 text-sm text-neutral-700 dark:text-neutral-300">{saleTypeLabel}</dd>
                      )}
                    </div>
                    <div>
                      <dt className="text-xs text-neutral-500 dark:text-neutral-400">
                        {saleTypeValue === "porcentaje" ? "Porcentaje" : "Valor"}
                      </dt>
                      {editMode ? (
                        <input
                          type="number" value={d.precioVentaValor}
                          onChange={(e) => onFieldChange("precioVentaValor", e.target.value)}
                          min="0" step="0.01"
                          placeholder={d.precioVentaTipo === "porcentaje" ? "Ej. 25" : "Ej. 1200"}
                          className={inputCls}
                        />
                      ) : (
                        <dd className="mt-0.5 text-sm text-neutral-700 dark:text-neutral-300">{saleValueLabel}</dd>
                      )}
                    </div>
                    <div>
                      <dt className="text-xs text-neutral-500 dark:text-neutral-400">Venta calculada</dt>
                      <dd className="mt-0.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {saleCalculated != null ? formatMoney(saleCalculated, currency) : "—"}
                      </dd>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-xs text-neutral-500 dark:text-neutral-400">Imágenes</dt>
                    {editMode && (
                      <label htmlFor={`catalogo-files-${pid}`} className="cursor-pointer rounded-md border border-neutral-300 px-2 py-1 text-xs transition hover:border-neutral-400 dark:border-neutral-700">
                        {uploadingImagesId === pid ? "Subiendo..." : "Subir imagen(es)"}
                      </label>
                    )}
                  </div>
                  {editMode && (
                    <input id={`catalogo-files-${pid}`} type="file" accept="image/*" multiple className="hidden"
                      onChange={(e) => { void handleUploadImages(pid, e.currentTarget.files); e.currentTarget.value = ""; }}
                    />
                  )}
                  {images.length === 0 ? (
                    <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{editMode ? "Agrega imágenes." : "Sin imágenes."}</p>
                  ) : (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {images.map((image) => (
                        <article key={image.key} className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
                          <div className="relative">
                            <Image src={image.accessUrl ?? image.url} alt={p.nombre ?? image.originalName} width={640} height={360} unoptimized className="h-32 w-full object-cover" />
                            {editMode && (
                              <button type="button"
                                onClick={() => { if (confirm(`¿Eliminar imagen "${image.originalName}"?`)) void handleRemoveImage(pid, image.key); }}
                                disabled={removingImageKey === image.key}
                                className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-[11px] font-medium text-white transition hover:bg-black disabled:opacity-60"
                              >
                                {removingImageKey === image.key ? "Eliminando..." : "Quitar"}
                              </button>
                            )}
                          </div>
                          <div className="space-y-1 p-2">
                            <p className="truncate text-xs text-neutral-700 dark:text-neutral-300" title={image.originalName}>{image.originalName}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <dt className="text-xs text-neutral-500 dark:text-neutral-400">Descripción</dt>
                  {editMode ? (
                    <textarea value={d.descripcion} onChange={(e) => onFieldChange("descripcion", e.target.value)} rows={3} placeholder="Descripción" className={inputCls} />
                  ) : (
                    <dd className="mt-0.5 line-clamp-3 text-sm text-neutral-700 dark:text-neutral-300">{p.descripcion || "—"}</dd>
                  )}
                </div>

                <footer className="mt-4 flex items-center justify-end gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
                  {editMode ? (
                    <>
                      <button onClick={cancelEdit} disabled={saving} className="rounded-md border border-neutral-300 px-3 py-1 text-xs transition hover:border-neutral-400 disabled:opacity-60 dark:border-neutral-700">Cancelar</button>
                      <button onClick={saveEdit} disabled={saving} className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-900 transition hover:border-neutral-400 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-100">{saving ? "Guardando..." : "Guardar"}</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEditRow(p)} className="rounded-md border border-neutral-300 px-3 py-1 text-xs transition hover:border-neutral-400 dark:border-neutral-700">Editar</button>
                      <button onClick={() => removeRow(p)} disabled={deleting} className="rounded-md border border-rose-300 px-3 py-1 text-xs font-medium text-rose-600 transition hover:border-rose-400 disabled:opacity-60 dark:border-rose-800">{deleting ? "Borrando..." : "Eliminar"}</button>
                    </>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="rounded-md border border-neutral-300 px-3 py-1 text-sm transition hover:border-neutral-400 disabled:cursor-default disabled:opacity-50 dark:border-neutral-700">Anterior</button>
          <span className="text-neutral-600 dark:text-neutral-300">Página {page} de {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="rounded-md border border-neutral-300 px-3 py-1 text-sm transition hover:border-neutral-400 disabled:cursor-default disabled:opacity-50 dark:border-neutral-700">Siguiente</button>
        </div>
      )}
    </div>
  );
}
