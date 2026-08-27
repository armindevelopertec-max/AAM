"use client";

import { useState } from "react";
import { formatMoney, type Client, type Sale } from "../lib/api";

export default function SalesManager({
  initialSales,
  clients,
}: {
  initialSales: Sale[];
  clients: Client[];
}) {
  const sales = initialSales;
  const [expandedId, setExpandedId] = useState<number | null>(null);

  function clientName(sale: Sale): string {
    if (sale.clientId == null) return "Cliente general";
    return clients.find((client) => client.id === sale.clientId)?.name ?? "Cliente general";
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <section className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-4 text-lg font-semibold">Historial de ventas</h2>
        {sales.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No hay ventas.</p>
        ) : (
          <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {sales.map((sale) => (
              <article key={sale.id} className="py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{sale.number}</span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {new Date(sale.createdAt).toLocaleString("es-MX")}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                      {clientName(sale)} · {sale.items.length}{" "}
                      {sale.items.length === 1 ? "artículo" : "artículos"}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-neutral-500 dark:text-neutral-400">
                      {sale.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")}
                    </p>
                    <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                      Registrada por {sale.createdBy ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold">{formatMoney(sale.total)}</span>
                    <button
                      onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                      className="text-sm text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                    >
                      {expandedId === sale.id ? "Ocultar detalle" : "Ver detalle"}
                    </button>
                  </div>
                </div>
                {expandedId === sale.id && (
                  <div className="mt-4 overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-neutral-200 dark:border-neutral-800">
                          <th className="py-2 pl-3 pr-4 font-medium">Producto</th>
                          <th className="py-2 pr-4 font-medium">Cantidad</th>
                          <th className="py-2 pr-4 font-medium">P. unitario</th>
                          <th className="py-2 pr-3 text-right font-medium">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sale.items.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                          >
                            <td className="py-2 pl-3 pr-4">
                              <span className="block font-medium">{item.name}</span>
                              <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                                {item.sku}
                              </span>
                            </td>
                            <td className="py-2 pr-4">{item.quantity}</td>
                            <td className="py-2 pr-4">{formatMoney(item.unitPrice)}</td>
                            <td className="py-2 pr-3 text-right">{formatMoney(item.subtotal)}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-neutral-200 dark:border-neutral-800">
                          <td className="py-2 pl-3 pr-4" colSpan={3}>
                            Subtotal
                          </td>
                          <td className="py-2 pr-3 text-right">{formatMoney(sale.subtotal)}</td>
                        </tr>
                        {sale.discount > 0 && (
                          <tr className="border-t border-neutral-200 dark:border-neutral-800">
                            <td className="py-2 pl-3 pr-4" colSpan={3}>
                              Descuento
                            </td>
                            <td className="py-2 pr-3 text-right">
                              −{formatMoney(sale.discount)}
                            </td>
                          </tr>
                        )}
                        <tr className="border-t border-neutral-200 dark:border-neutral-800">
                          <td className="py-2 pl-3 pr-4 font-semibold" colSpan={3}>
                            Total
                          </td>
                          <td className="py-2 pr-3 text-right font-bold">
                            {formatMoney(sale.total)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}