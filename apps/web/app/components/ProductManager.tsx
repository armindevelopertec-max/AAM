"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  adjustStock,
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
  uploadProductImage,
  formatMoney,
  getProductImageUrl,
  type Product,
} from "../lib/api";

export default function ProductManager({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    sku: "",
    category: "",
    costPrice: "",
    regularPrice: "",
    price: "",
  });
  const [adjustingId, setAdjustingId] = useState<number | null>(null);
  const [adjustment, setAdjustment] = useState("");

  async function refresh() {
    setProducts(await getProducts());
  }

  function openModal() {
    setShowModal(true);
    setError(null);
  }

  function closeModal() {
    setShowModal(false);
    setError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const nameVal = (fd.get("name") as string).trim();
    const priceVal = Number(fd.get("price")) || 0;
    if (!nameVal || !priceVal) return;

    setError(null);
    try {
      const product = await createProduct({
        name: nameVal,
        sku: (fd.get("sku") as string) || undefined,
        category: (fd.get("category") as string) || undefined,
        costPrice: Number(fd.get("costPrice")) || undefined,
        regularPrice: Number(fd.get("regularPrice")) || undefined,
        price: priceVal,
        stock: Number(fd.get("stock")) || undefined,
      });
      const imageFile = fd.get("image") as File | null;
      if (imageFile && imageFile.size > 0) {
        await uploadProductImage(product.id, imageFile);
      }
      form.reset();
      closeModal();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      costPrice: String(product.costPrice),
      regularPrice: String(product.regularPrice),
      price: String(product.price),
    });
  }

  async function handleSave(id: number) {
    setError(null);
    try {
      await updateProduct(id, {
        name: editForm.name,
        sku: editForm.sku,
        category: editForm.category,
        costPrice: Number(editForm.costPrice),
        regularPrice: Number(editForm.regularPrice),
        price: Number(editForm.price),
      });
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  async function handleAdjust(id: number) {
    setError(null);
    try {
      await adjustStock(id, Number(adjustment));
      setAdjustingId(null);
      setAdjustment("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  async function handleDelete(id: number) {
    setError(null);
    try {
      await deleteProduct(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  const filtered = products.filter((product) => {
    const needle = query.toLowerCase();
    if (!needle) return true;
    return (
      product.name.toLowerCase().includes(needle) ||
      product.sku.toLowerCase().includes(needle) ||
      product.category.toLowerCase().includes(needle)
    );
  });

  const inputClass =
    "rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800";
  const labelClass = "text-sm text-neutral-600 dark:text-neutral-400";

  return (
    <div className="flex w-full flex-col gap-8">
      <section className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Inventario</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, SKU o categoría…"
              className={`${inputClass} w-full sm:w-72`}
            />
            <button
              onClick={openModal}
              className="whitespace-nowrap rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              + Agregar producto
            </button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No hay productos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 pr-4 font-medium">SKU</th>
                <th className="py-2 pr-4 font-medium">Imagen</th>
                <th className="py-2 pr-4 font-medium">Nombre</th>
                <th className="py-2 pr-4 font-medium">Categoría</th>
                <th className="py-2 pr-4 font-medium">Costo</th>
                <th className="py-2 pr-4 font-medium">P. Regular</th>
                <th className="py-2 pr-4 font-medium">Precio</th>
                <th className="py-2 pr-4 font-medium">Stock</th>
                <th className="py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="py-3 pr-4 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                    {editingId === product.id ? (
                      <input
                        type="text"
                        value={editForm.sku}
                        onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                        className="w-full rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
                      />
                    ) : (
                      product.sku
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {product.imageUrl ? (
                      <Image
                        src={getProductImageUrl(product.imageUrl)!}
                        alt={product.name}
                        width={40}
                        height={40}
                        unoptimized
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-md border border-dashed border-neutral-300 dark:border-neutral-700" />
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {editingId === product.id ? (
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
                      />
                    ) : (
                      product.name
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {editingId === product.id ? (
                      <input
                        type="text"
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
                      />
                    ) : (
                      product.category
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {editingId === product.id ? (
                      <input
                        type="number"
                        value={editForm.costPrice}
                        onChange={(e) => setEditForm({ ...editForm, costPrice: e.target.value })}
                        min="0"
                        step="0.01"
                        className="w-full rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
                      />
                    ) : (
                      formatMoney(product.costPrice)
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {editingId === product.id ? (
                      <input
                        type="number"
                        value={editForm.regularPrice}
                        onChange={(e) => setEditForm({ ...editForm, regularPrice: e.target.value })}
                        min="0"
                        step="0.01"
                        className="w-full rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
                      />
                    ) : (
                      formatMoney(product.regularPrice)
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {editingId === product.id ? (
                      <input
                        type="number"
                        value={editForm.price}
                        onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                        min="0"
                        step="0.01"
                        className="w-full rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
                      />
                    ) : (
                      formatMoney(product.price)
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {adjustingId === product.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={adjustment}
                          onChange={(e) => setAdjustment(e.target.value)}
                          placeholder="+/-"
                          className="w-20 rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
                        />
                        <button
                          onClick={() => handleAdjust(product.id)}
                          className="text-green-600 transition hover:text-green-400 dark:text-green-400"
                        >
                          OK
                        </button>
                        <button
                          onClick={() => {
                            setAdjustingId(null);
                            setAdjustment("");
                          }}
                          className="text-neutral-600 transition hover:text-neutral-400 dark:text-neutral-400"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAdjustingId(product.id)}
                        title="Ajustar stock"
                        className={`font-medium ${
                          product.stock <= 3
                            ? "text-red-600 dark:text-red-400"
                            : product.stock <= 10
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        {product.stock}
                      </button>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    {editingId === product.id ? (
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => handleSave(product.id)}
                          className="text-green-600 transition hover:text-green-400 dark:text-green-400"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-neutral-600 transition hover:text-neutral-400 dark:text-neutral-400"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => startEdit(product)}
                          className="text-neutral-600 transition hover:text-neutral-400 dark:text-neutral-400"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 transition hover:text-red-400 dark:text-red-400"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeModal}>
          <div
            className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">Agregar producto</h2>
            <p className="mt-1 text-sm text-neutral-500">Completa los datos del nuevo producto</p>

            <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Nombre *</label>
                <input name="name" type="text" required className={inputClass} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>SKU</label>
                  <input name="sku" type="text" placeholder="ELC-0001" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Categoría</label>
                  <input name="category" type="text" placeholder="Electrónica" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Costo</label>
                  <input name="costPrice" type="number" min="0" step="0.01" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>P. Regular</label>
                  <input name="regularPrice" type="number" min="0" step="0.01" placeholder="Precio lista" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Precio venta *</label>
                  <input name="price" type="number" min="0" step="0.01" required className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Stock</label>
                  <input name="stock" type="number" min="0" step="1" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Imagen</label>
                  <input
                    name="image"
                    type="file"
                    accept="image/*"
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <div className="mt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm transition hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
