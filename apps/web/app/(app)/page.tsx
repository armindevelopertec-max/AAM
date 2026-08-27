"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney, getDashboard, type DashboardSummary } from "../lib/api";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getDashboard()
      .then((result) => {
        if (active) setData(result);
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

  if (!data) {
    return <p className="text-neutral-500 dark:text-neutral-400">Cargando…</p>;
  }

  const currency = data.store.currency;

  const stats = [
    {
      label: "Ventas hoy",
      value: formatMoney(data.sales.todayRevenue, currency),
      sub: `${data.sales.todayCount} operaciones`,
      href: "/pos",
    },
    {
      label: "Ventas totales",
      value: formatMoney(data.sales.revenue, currency),
      sub: `${data.sales.total} registradas`,
      href: "/pos",
    },
    {
      label: "Cotizaciones pendientes",
      value: String(data.quotes.pending),
      sub: `${data.quotes.total} en total`,
      href: "/quotes",
    },
    {
      label: "Productos con stock bajo",
      value: String(data.products.lowStock),
      sub: "requieren reabastecimiento",
      href: "/products",
    },
    {
      label: "Valor de inventario (costo)",
      value: formatMoney(data.products.inventoryValue, currency),
      sub: `${data.products.total} productos`,
      href: "/products",
    },
    {
      label: "Valor de inventario (venta)",
      value: formatMoney(data.products.stockValue, currency),
      sub: `${data.clients.total} clientes`,
      href: "/clients",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold">{data.store.name}</h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          Resumen general de tu negocio
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-lg border border-neutral-200 bg-white p-6 transition hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
          >
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold">{stat.value}</p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{stat.sub}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Últimas ventas</h2>
            <Link href="/pos" className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
              Ver
            </Link>
          </div>
          {data.recentSales.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">No hay ventas.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
              {data.recentSales.map((sale) => (
                <li key={sale.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="font-mono text-sm font-medium">{sale.number}</span>
                    <span className="ml-2 text-sm text-neutral-500 dark:text-neutral-400">
                      {sale.items.length} ítems
                    </span>
                  </div>
                  <span className="font-medium">{formatMoney(sale.total, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Últimas cotizaciones</h2>
            <Link href="/quotes" className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
              Ver
            </Link>
          </div>
          {data.recentQuotes.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">No hay cotizaciones.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
              {data.recentQuotes.map((quote) => (
                <li key={quote.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="font-mono text-sm font-medium">{quote.number}</span>
                    <span className="ml-2 text-sm text-neutral-500 dark:text-neutral-400">
                      {quote.clientName}
                    </span>
                  </div>
                  <span className="font-medium">{formatMoney(quote.total, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Stock bajo</h2>
          <Link href="/products" className="text-sm text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
            Ver inventario
          </Link>
        </div>
        {data.lowStockProducts.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Todo el inventario está saludable.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {data.lowStockProducts.map((product) => (
              <li key={product.id} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-medium">{product.name}</span>
                  <span className="ml-2 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                    {product.sku}
                  </span>
                </div>
                <span
                  className={`font-medium ${
                    product.stock <= 0 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {product.stock} disponibles
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}