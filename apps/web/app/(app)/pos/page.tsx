"use client";

import { useEffect, useState } from "react";
import PosManager from "../../components/PosManager";
import { getClients, getProducts, type Client, type Product } from "../../lib/api";

export default function CotizadorPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [clients, setClients] = useState<Client[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getProducts(), getClients()])
      .then(([productsResult, clientsResult]) => {
        if (active) {
          setProducts(productsResult);
          setClients(clientsResult);
        }
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

  if (!products || !clients) {
    return <p className="text-neutral-500 dark:text-neutral-400">Cargando…</p>;
  }

  return (
    <PosManager initialProducts={products} clients={clients} />
  );
}
