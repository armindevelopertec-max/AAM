"use client";

import { useEffect, useState } from "react";
import SeguimientoManager from "../../components/SeguimientoManager";
import {
  getClients,
  getQuotes,
  getSales,
  type Client,
  type Quote,
  type Sale,
} from "../../lib/api";

export default function SeguimientoPage() {
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getQuotes(), getSales(), getClients()])
      .then(([quotesResult, salesResult, clientsResult]) => {
        if (active) {
          setQuotes(quotesResult);
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

  if (!quotes || !sales) {
    return <p className="text-neutral-500 dark:text-neutral-400">Cargando…</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-3xl font-bold">Seguimiento</h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          Historial de cotizaciones y ventas
        </p>
      </header>
      <SeguimientoManager initialQuotes={quotes} initialSales={sales} clients={clients} />
    </div>
  );
}
