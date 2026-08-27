"use client";

import { useEffect, useState } from "react";
import ClientManager from "../../components/ClientManager";
import { getClients, type Client } from "../../lib/api";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getClients()
      .then((result) => {
        if (active) setClients(result);
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

  if (!clients) {
    return <p className="text-neutral-500 dark:text-neutral-400">Cargando…</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold">Clientes</h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">Agrega y administra tus clientes</p>
      </header>
      <ClientManager initialClients={clients} />
    </div>
  );
}