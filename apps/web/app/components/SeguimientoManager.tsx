"use client";

import { useState } from "react";
import {
  formatMoney,
  generateQuotePdf,
  updateQuoteStatus,
  convertQuoteToSale,
  type Client,
  type Quote,
  type QuoteStatus,
  type Sale,
} from "../lib/api";

const STATUS_LABELS: Record<QuoteStatus, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  aceptada: "Aceptada",
  perdida: "Perdida",
  vencida: "Vencida",
};

const STATUS_CLASSES: Record<QuoteStatus, string> = {
  borrador: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  enviada: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  aceptada: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  perdida: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  vencida: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString("es-MX");
  const time = date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} ${time}`;
}

export default function SeguimientoManager({
  initialQuotes,
  initialSales,
  clients,
}: {
  initialQuotes: Quote[];
  initialSales: Sale[];
  clients: Client[];
}) {
  const [tab, setTab] = useState<"cotizaciones" | "ventas">("cotizaciones");
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes);
  const [expandedQuoteId, setExpandedQuoteId] = useState<number | null>(null);
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGeneratePdf(quoteId: number) {
    setError(null);
    try {
      const result = await generateQuotePdf(quoteId);
      window.open(result.url, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar PDF");
    }
  }

  async function handleStatus(quoteId: number, status: QuoteStatus) {
    setError(null);
    try {
      const updated = await updateQuoteStatus(quoteId, status);
      setQuotes((current) => current.map((q) => (q.id === quoteId ? updated : q)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar");
    }
  }

  async function handleConvert(quoteId: number) {
    setError(null);
    try {
      const result = await convertQuoteToSale(quoteId);
      setQuotes((current) =>
        current.map((q) => (q.id === quoteId ? result.quote : q)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al convertir");
    }
  }

  function clientNameForSale(sale: Sale): string {
    if (sale.clientId == null) return "Cliente general";
    return clients.find((c) => c.id === sale.clientId)?.name ?? "Cliente general";
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-700 dark:bg-neutral-800">
        <button
          onClick={() => setTab("cotizaciones")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === "cotizaciones"
              ? "bg-white text-neutral-900 shadow dark:bg-neutral-900 dark:text-white"
              : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          Cotizaciones ({quotes.length})
        </button>
        <button
          onClick={() => setTab("ventas")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === "ventas"
              ? "bg-white text-neutral-900 shadow dark:bg-neutral-900 dark:text-white"
              : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          Ventas ({initialSales.length})
        </button>
      </div>

      {/* Cotizaciones */}
      {tab === "cotizaciones" && (
        <section className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-4 text-lg font-semibold">Historial de cotizaciones</h2>
          {quotes.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">No hay cotizaciones.</p>
          ) : (
            <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
              {quotes.map((quote) => (
                <article key={quote.id} className="flex flex-col gap-3 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold">{quote.number}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[quote.status]}`}
                    >
                      {STATUS_LABELS[quote.status]}
                    </span>
                  </div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    <p>
                      <span className="text-neutral-500 dark:text-neutral-500">Cliente </span>
                      {quote.clientName}
                    </p>
                    <p>Creada {formatDateTime(quote.createdAt)}</p>
                    <p>Vence {new Date(quote.expiresAt).toLocaleDateString("es-MX")}</p>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {quote.items.map((item) => {
                      const hasDiscount = item.originalPrice > 0 && item.originalPrice > item.unitPrice;
                      const discountPct = hasDiscount
                        ? Math.round((1 - item.unitPrice / item.originalPrice) * 100)
                        : 0;
                      return (
                        <li
                          key={item.productId}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="truncate">
                            {item.quantity} × {item.name}{" "}
                            <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                              {item.sku}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            {hasDiscount && (
                              <>
                                <span className="text-[11px] text-neutral-400 line-through">
                                  {formatMoney(item.originalPrice)}
                                </span>{" "}
                                <span className="rounded-full bg-green-100 px-1.5 py-px text-[10px] font-bold text-green-700 dark:bg-green-900 dark:text-green-300">
                                  −{discountPct}%
                                </span>{" "}
                              </>
                            )}
                            <span className="font-medium">{formatMoney(item.subtotal)}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {quote.discount > 0 && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Ahorro <span className="text-green-600 dark:text-green-400">-{formatMoney(quote.discount)}</span>
                    </p>
                  )}
                  <p className="text-sm font-semibold">
                    TOTAL <span className="float-right font-bold">{formatMoney(quote.total)}</span>
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Creada por {quote.createdBy ?? "—"}
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <button
                      onClick={() => handleGeneratePdf(quote.id)}
                      className="rounded-lg border border-neutral-300 px-3 py-1.5 transition hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500"
                    >
                      Generar PDF
                    </button>
                    {quote.status === "borrador" && (
                      <button
                        onClick={() => handleStatus(quote.id, "enviada")}
                        className="text-blue-600 transition hover:text-blue-400 dark:text-blue-400"
                      >
                        Enviar
                      </button>
                    )}
                    {(quote.status === "borrador" || quote.status === "enviada") && (
                      <>
                        <button
                          onClick={() => handleConvert(quote.id)}
                          className="text-green-600 transition hover:text-green-400 dark:text-green-400"
                        >
                          Convertir en venta
                        </button>
                        <button
                          onClick={() => handleStatus(quote.id, "perdida")}
                          className="text-red-600 transition hover:text-red-400 dark:text-red-400"
                        >
                          Perder
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Ventas */}
      {tab === "ventas" && (
        <section className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-4 text-lg font-semibold">Historial de ventas</h2>
          {initialSales.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">No hay ventas.</p>
          ) : (
            <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
              {initialSales.map((sale) => (
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
                        {clientNameForSale(sale)} · {sale.items.length}{" "}
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
                        onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
                        className="text-sm text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                      >
                        {expandedSaleId === sale.id ? "Ocultar" : "Detalle"}
                      </button>
                    </div>
                  </div>
                  {expandedSaleId === sale.id && (
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
      )}
    </div>
  );
}
