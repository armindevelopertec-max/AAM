"use client";

import { useEffect, useState } from "react";
import SalesManager from "../../components/SalesManager";
import { getClients, getSales, type Client, type Sale } from "../../lib/api";

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getSales(), getClients()])
      .then(([salesResult, clientsResult]) => {
        if (active) {
          setSales(salesResult);
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

  if (!sales) {
    return <p className="text-neutral-500 dark:text-neutral-400">Cargando…</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold">Ventas</h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          Consulta el historial de ventas
        </p>
      </header>
      <SalesManager initialSales={sales} clients={clients} />
    </div>
  );
}