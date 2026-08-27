"use client";

import { useEffect, useState } from "react";
import ProductManager from "../../components/ProductManager";
import { getProducts, type Product } from "../../lib/api";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getProducts()
      .then((result) => {
        if (active) setProducts(result);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Error desconocido");
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return <p className="text-red-600 dark:text-red-400">{error}</p>;
  }

  if (!products) {
    return <p className="text-neutral-500 dark:text-neutral-400">Cargando…</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold">Productos</h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">Agrega y administra tus productos</p>
      </header>
      <ProductManager initialProducts={products} />
    </div>
  );
}