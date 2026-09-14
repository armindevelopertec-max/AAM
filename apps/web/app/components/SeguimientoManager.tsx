"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useCartStore } from "./CartStore";
import type { CartLine } from "./CartDrawer";
import {
  formatMoney,
  generateQuotePdf,
  downloadQuotePdf,
  generateSalePdf,
  downloadSalePdf,
  updateQuoteStatus,
  convertQuoteToSale,
  getProductImage,
  getQuotesPage,
  getSalesPage,
  type Client,
  type Paginated,
  type Quote,
  type QuoteStatus,
  type Sale,
} from "../lib/api";

const PAGE_SIZE = 5;

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

const STATUS_DOT: Record<QuoteStatus, string> = {
  borrador: "bg-neutral-400",
  enviada: "bg-blue-500",
  aceptada: "bg-green-500",
  perdida: "bg-red-500",
  vencida: "bg-amber-500",
};

function StatusPill({ status }: { status: QuoteStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}

type IconProps = { className?: string };

function IconBase({ className = "h-4 w-4", children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function FileTextIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </IconBase>
  );
}

function PdfIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <polyline points="9 15 12 18 15 15" />
    </IconBase>
  );
}

function CartIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </IconBase>
  );
}

function ConvertIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v-5" />
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M16 8h5v5" />
    </IconBase>
  );
}

function SendIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </IconBase>
  );
}

function XIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </IconBase>
  );
}

function EyeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}

function UserIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </IconBase>
  );
}

function CalendarIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </IconBase>
  );
}

function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </IconBase>
  );
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString("es-MX");
  const time = date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} ${time}`;
}

function getPageNumbers(current: number, total: number): (number | "…")[] {
  const windowSize = 5;
  let start = Math.max(1, current - Math.floor(windowSize / 2));
  let end = start + windowSize - 1;
  if (end > total) {
    end = total;
    start = Math.max(1, end - windowSize + 1);
  }
  const pages: (number | "…")[] = [];
  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("…");
  }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("…");
  if (end < total) pages.push(total);
  return pages;
}

function PaginationNav({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = getPageNumbers(page, totalPages);
  const btn =
    "min-w-8 rounded-md border border-neutral-300 px-2 py-1 text-sm font-medium transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:hover:border-neutral-600";
  return (
    <nav className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className={btn}>
        « Anterior
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e-${i}`} className="px-1 text-sm text-neutral-400">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={`${btn} ${
              p === page
                ? "border-blue-600 bg-blue-600 text-white hover:border-blue-600"
                : ""
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className={btn}
      >
        Siguiente »
      </button>
    </nav>
  );
}

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative block">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:focus:border-blue-500"
      />
    </label>
  );
}

function mergeCartLines(current: CartLine[], extra: CartLine[]): CartLine[] {
  const result = [...current];
  for (const line of extra) {
    const idx = result.findIndex(
      (l) => l.productId === line.productId && l.fuente === line.fuente,
    );
    if (idx >= 0) {
      result[idx] = { ...result[idx], quantity: result[idx].quantity + line.quantity };
    } else {
      result.push(line);
    }
  }
  return result;
}

export default function SeguimientoManager({
  initialQuotes,
  initialSales,
  clients,
}: {
  initialQuotes: Paginated<Quote>;
  initialSales: Paginated<Sale>;
  clients: Client[];
}) {
  const [tab, setTab] = useState<"cotizaciones" | "ventas">("cotizaciones");
  const [quotesPage, setQuotesPage] = useState<Paginated<Quote>>(initialQuotes);
  const [salesPage, setSalesPage] = useState<Paginated<Sale>>(initialSales);
  const [quoteSearch, setQuoteSearch] = useState("");
  const [saleSearch, setSaleSearch] = useState("");
  const [debouncedQuoteSearch, setDebouncedQuoteSearch] = useState("");
  const [debouncedSaleSearch, setDebouncedSaleSearch] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [saleLoading, setSaleLoading] = useState(false);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { setPosLines, setQuoteLines, openDock } = useCartStore();

  // Debounce de búsquedas
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuoteSearch(quoteSearch), 350);
    return () => clearTimeout(t);
  }, [quoteSearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSaleSearch(saleSearch), 350);
    return () => clearTimeout(t);
  }, [saleSearch]);

  // Vuelve a la página 1 cuando cambia la búsqueda
  const prevQuoteSearch = useRef(debouncedQuoteSearch);
  useEffect(() => {
    if (prevQuoteSearch.current !== debouncedQuoteSearch) {
      prevQuoteSearch.current = debouncedQuoteSearch;
      setQuotesPage((p) => ({ ...p, page: 1 }));
    }
  }, [debouncedQuoteSearch]);

  const prevSaleSearch = useRef(debouncedSaleSearch);
  useEffect(() => {
    if (prevSaleSearch.current !== debouncedSaleSearch) {
      prevSaleSearch.current = debouncedSaleSearch;
      setSalesPage((p) => ({ ...p, page: 1 }));
    }
  }, [debouncedSaleSearch]);

  // Carga paginada de cotizaciones
  const [quoteReload, setQuoteReload] = useState(0);
  useEffect(() => {
    let active = true;
    setQuoteLoading(true);
    getQuotesPage({
      page: quotesPage.page,
      limit: PAGE_SIZE,
      search: debouncedQuoteSearch || undefined,
    })
      .then((res) => {
        if (active) setQuotesPage(res);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setQuoteLoading(false);
      });
    return () => {
      active = false;
    };
  }, [quotesPage.page, debouncedQuoteSearch, quoteReload]);

  // Corrección si la página quedó fuera de rango tras filtrar/eliminar
  useEffect(() => {
    if (
      quotesPage.totalPages > 0 &&
      quotesPage.page > quotesPage.totalPages
    ) {
      setQuotesPage((p) => ({ ...p, page: p.totalPages }));
    }
  }, [quotesPage.page, quotesPage.totalPages]);

  // Carga paginada de ventas
  const [saleReload, setSaleReload] = useState(0);
  useEffect(() => {
    let active = true;
    setSaleLoading(true);
    getSalesPage({
      page: salesPage.page,
      limit: PAGE_SIZE,
      search: debouncedSaleSearch || undefined,
    })
      .then((res) => {
        if (active) setSalesPage(res);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setSaleLoading(false);
      });
    return () => {
      active = false;
    };
  }, [salesPage.page, debouncedSaleSearch, saleReload]);

  useEffect(() => {
    if (salesPage.totalPages > 0 && salesPage.page > salesPage.totalPages) {
      setSalesPage((p) => ({ ...p, page: p.totalPages }));
    }
  }, [salesPage.page, salesPage.totalPages]);

  const refreshQuotes = useCallback(() => setQuoteReload((n) => n + 1), []);
  const refreshSales = useCallback(() => setSaleReload((n) => n + 1), []);

  async function resolveImages(lines: CartLine[]): Promise<CartLine[]> {
    if (lines.length === 0) return lines;
    const resolved = await Promise.all(
      lines.map(async (line) => {
        if (line.imageUrl) return line;
        try {
          const { imageUrl } = await getProductImage(line.fuente, line.productId);
          return imageUrl ? { ...line, imageUrl } : line;
        } catch {
          return line;
        }
      }),
    );
    return resolved;
  }

  function loadQuoteToCart(quote: Quote) {
    const lines: CartLine[] = quote.items
      .map((item) => {
        if (item.productId == null) return null;
        const line: CartLine = {
          productId: item.productId,
          fuente: item.fuente ?? "",
          moneda: "BOB",
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          originalPrice: item.originalPrice,
          costPrice: 0,
          imageUrl: null,
        };
        return line;
      })
      .filter((l): l is CartLine => l != null);
    void (async () => {
      const resolved = await resolveImages(lines);
      if (resolved.length === 0) return;
      setQuoteLines((current) => mergeCartLines(current, resolved));
      openDock("quote");
    })();
  }

  function loadSaleToPosCart(sale: Sale) {
    const lines: CartLine[] = sale.items
      .map((item) => {
        if (item.productId == null) return null;
        const line: CartLine = {
          productId: item.productId,
          fuente: item.fuente ?? "",
          moneda: "BOB",
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          originalPrice: item.unitPrice,
          costPrice: 0,
          imageUrl: null,
        };
        return line;
      })
      .filter((l): l is CartLine => l != null);
    void (async () => {
      const resolved = await resolveImages(lines);
      if (resolved.length === 0) return;
      setPosLines((current) => mergeCartLines(current, resolved));
      openDock("pos");
    })();
  }

  async function handleGeneratePdf(quoteId: string) {
    setError(null);
    try {
      await generateQuotePdf(quoteId);
      const blobUrl = await downloadQuotePdf(quoteId);
      window.open(blobUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar PDF");
    }
  }

  async function handleStatus(quoteId: string, status: QuoteStatus) {
    setError(null);
    try {
      await updateQuoteStatus(quoteId, status);
      refreshQuotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar");
    }
  }

  async function handleSalePdf(saleId: string) {
    setError(null);
    try {
      await generateSalePdf(saleId);
      const blobUrl = await downloadSalePdf(saleId);
      window.open(blobUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar PDF");
    }
  }

  async function handleConvert(quoteId: string) {
    setError(null);
    try {
      await convertQuoteToSale(quoteId);
      refreshQuotes();
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
      <div className="flex gap-1 rounded-xl border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-700 dark:bg-neutral-800">
        <button
          onClick={() => setTab("cotizaciones")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            tab === "cotizaciones"
              ? "bg-white text-blue-600 shadow dark:bg-neutral-900 dark:text-blue-400"
              : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          <FileTextIcon className="h-4 w-4" />
          Cotizaciones
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              tab === "cotizaciones"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                : "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
            }`}
          >
            {quotesPage.total}
          </span>
        </button>
        <button
          onClick={() => setTab("ventas")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            tab === "ventas"
              ? "bg-white text-green-600 shadow dark:bg-neutral-900 dark:text-green-400"
              : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          <CartIcon className="h-4 w-4" />
          Ventas
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              tab === "ventas"
                ? "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400"
                : "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
            }`}
          >
            {salesPage.total}
          </span>
        </button>
      </div>

      {/* Cotizaciones */}
      {tab === "cotizaciones" && (
        <section>
          <div className="mb-4 flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-900 dark:text-white">
              <FileTextIcon className="h-5 w-5 text-blue-500" />
              Historial de cotizaciones
            </h2>
            <SearchField
              value={quoteSearch}
              onChange={setQuoteSearch}
              placeholder="Buscar por N° del PDF, número (C-0001) o cliente…"
            />
          </div>

          {quotesPage.items.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {debouncedQuoteSearch
                ? `No se encontraron cotizaciones para «${debouncedQuoteSearch}».`
                : "No hay cotizaciones."}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {quotesPage.items.map((quote) => (
                <article
                  key={quote.id}
                  className={`overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-blue-900 ${
                    quoteLoading ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex flex-col gap-4 p-5">
                    {/* Encabezado */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                          <FileTextIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-mono text-sm font-bold text-neutral-900 dark:text-white">
                            {quote.number}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                              N° {quote.followNumber ?? "—"}
                            </span>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                              Cotización #{quote.items.length}{" "}
                              {quote.items.length === 1 ? "artículo" : "artículos"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <StatusPill status={quote.status} />
                        <div className="text-right">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                            Total
                          </p>
                          <p className="text-xl font-bold text-neutral-900 dark:text-white">
                            {formatMoney(quote.total)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Cliente y fechas */}
                    <div className="grid grid-cols-1 gap-2 rounded-lg bg-neutral-50 p-3 text-sm sm:grid-cols-2 dark:bg-neutral-800/50">
                      <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                        <UserIcon className="h-4 w-4 shrink-0 text-neutral-400" />
                        <span className="truncate">{quote.clientName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                        <CalendarIcon className="h-4 w-4 shrink-0 text-neutral-400" />
                        <span className="truncate">
                          Creada {formatDateTime(quote.createdAt)} · Vence{" "}
                          {new Date(quote.expiresAt).toLocaleDateString("es-MX")}
                        </span>
                      </div>
                    </div>

                    {/* Artículos */}
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400">
                        Artículos
                      </p>
                      <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {quote.items.map((item, idx) => {
                          const hasDiscount =
                            item.originalPrice > 0 && item.originalPrice > item.unitPrice;
                          const discountPct = hasDiscount
                            ? Math.round((1 - item.unitPrice / item.originalPrice) * 100)
                            : 0;
                          return (
                            <li
                              key={`${item.productId ?? "svc"}-${item.sku ?? item.name}-${idx}`}
                              className="flex items-center justify-between gap-3 py-2 text-sm"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <span className="flex h-6 shrink-0 items-center rounded-md bg-neutral-100 px-1.5 font-mono text-xs font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                                  ×{item.quantity}
                                </span>
                                <span className="truncate">{item.name}</span>
                                {item.sku && (
                                  <span className="hidden shrink-0 font-mono text-xs text-neutral-400 sm:inline">
                                    {item.sku}
                                  </span>
                                )}
                              </span>
                              <span className="flex shrink-0 items-center gap-2">
                                {hasDiscount && (
                                  <>
                                    <span className="text-xs text-neutral-400 line-through">
                                      {formatMoney(item.originalPrice)}
                                    </span>
                                    <span className="rounded-full bg-green-100 px-1.5 py-px text-[10px] font-bold text-green-700 dark:bg-green-900 dark:text-green-300">
                                      −{discountPct}%
                                    </span>
                                  </>
                                )}
                                <span className="font-semibold text-neutral-900 dark:text-white">
                                  {formatMoney(item.subtotal)}
                                </span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {/* Ahorro */}
                    {quote.discount > 0 && (
                      <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm dark:bg-green-950/40">
                        <span className="text-green-700 dark:text-green-400">Ahorro aplicado</span>
                        <span className="font-bold text-green-700 dark:text-green-400">
                          −{formatMoney(quote.discount)}
                        </span>
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-neutral-200 pt-4 dark:border-neutral-800">
                      <button
                        onClick={() => handleGeneratePdf(quote.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium transition hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                      >
                        <PdfIcon className="h-4 w-4" />
                        Generar PDF
                      </button>
                      <button
                        onClick={() => loadQuoteToCart(quote)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-1.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
                      >
                        <CartIcon className="h-4 w-4" />
                        Cargar a cotización
                      </button>
                      {quote.status === "borrador" && (
                        <button
                          onClick={() => handleStatus(quote.id, "enviada")}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
                        >
                          <SendIcon className="h-4 w-4" />
                          Enviar
                        </button>
                      )}
                      {(quote.status === "borrador" || quote.status === "enviada") && (
                        <>
                          <button
                            onClick={() => handleConvert(quote.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 px-3 py-1.5 text-sm font-semibold text-green-600 transition hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
                          >
                            <ConvertIcon className="h-4 w-4" />
                            Convertir en venta
                          </button>
                          <button
                            onClick={() => handleStatus(quote.id, "perdida")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                          >
                            <XIcon className="h-4 w-4" />
                            Perder
                          </button>
                        </>
                      )}
                      <span className="ml-auto hidden text-xs text-neutral-400 sm:block">
                        Creada por {quote.createdBy ?? "—"}
                      </span>
                    </div>
                  </div>
                </article>
              ))}

              <PaginationNav
                page={quotesPage.page}
                totalPages={quotesPage.totalPages}
                onPage={(p) => setQuotesPage((prev) => ({ ...prev, page: p }))}
              />
              {quoteLoading && (
                <p className="text-center text-xs text-neutral-400">Cargando…</p>
              )}
            </div>
          )}
        </section>
      )}

      {/* Ventas */}
      {tab === "ventas" && (
        <section>
          <div className="mb-4 flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-900 dark:text-white">
              <CartIcon className="h-5 w-5 text-green-500" />
              Historial de ventas
            </h2>
            <SearchField
              value={saleSearch}
              onChange={setSaleSearch}
              placeholder="Buscar por N° del PDF, número (V-0001) o cliente…"
            />
          </div>

          {salesPage.items.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {debouncedSaleSearch
                ? `No se encontraron ventas para «${debouncedSaleSearch}».`
                : "No hay ventas."}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {salesPage.items.map((sale) => (
                <article
                  key={sale.id}
                  className={`overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:border-green-200 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-green-900 ${
                    saleLoading ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex flex-col gap-3 p-5">
                    {/* Encabezado */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400">
                          <CartIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-mono text-sm font-bold text-neutral-900 dark:text-white">
                            {sale.number}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                              N° {sale.followNumber ?? "—"}
                            </span>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                              {new Date(sale.createdAt).toLocaleString("es-MX")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                          Total
                        </p>
                        <p className="text-xl font-bold text-neutral-900 dark:text-white">
                          {formatMoney(sale.total)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <p className="flex flex-wrap items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                        <UserIcon className="h-4 w-4 shrink-0 text-neutral-400" />
                        <span className="truncate">{clientNameForSale(sale)}</span>
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                          {sale.items.length} {sale.items.length === 1 ? "artículo" : "artículos"}
                        </span>
                      </p>
                      <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">
                        {sale.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")}
                      </p>
                      <p className="text-xs text-neutral-400">
                        Registrada por {sale.createdBy ?? "—"}
                      </p>
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-neutral-200 pt-3 sm:pt-4 dark:border-neutral-800">
                      <button
                        onClick={() => loadSaleToPosCart(sale)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-green-700"
                      >
                        <CartIcon className="h-4 w-4" />
                        Cargar al carrito POS
                      </button>
                      <button
                        onClick={() => handleSalePdf(sale.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium transition hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                      >
                        <PdfIcon className="h-4 w-4" />
                        Descargar PDF
                      </button>
                      <button
                        onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      >
                        <EyeIcon className="h-4 w-4" />
                        {expandedSaleId === sale.id ? "Ocultar detalle" : "Ver detalle"}
                      </button>
                    </div>

                    {/* Detalle */}
                    {expandedSaleId === sale.id && (
                      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-neutral-50 dark:bg-neutral-800/60">
                            <tr className="border-b border-neutral-200 dark:border-neutral-800">
                              <th className="py-2.5 pl-3 pr-4 text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                                Producto
                              </th>
                              <th className="py-2.5 pr-4 text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                                Cant.
                              </th>
                              <th className="py-2.5 pr-4 text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                                P. unitario
                              </th>
                              <th className="py-2.5 pr-3 text-right text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                                Subtotal
                              </th>
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
                                <td className="py-2 pr-3 text-right font-medium">
                                  {formatMoney(item.subtotal)}
                                </td>
                              </tr>
                            ))}
                            <tr className="border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/40">
                              <td className="py-2 pl-3 pr-4" colSpan={3}>
                                Subtotal
                              </td>
                              <td className="py-2 pr-3 text-right">{formatMoney(sale.subtotal)}</td>
                            </tr>
                            {sale.discount > 0 && (
                              <tr className="border-t border-neutral-100 dark:border-neutral-800">
                                <td className="py-2 pl-3 pr-4" colSpan={3}>
                                  Descuento
                                </td>
                                <td className="py-2 pr-3 text-right">
                                  −{formatMoney(sale.discount)}
                                </td>
                              </tr>
                            )}
                            <tr className="border-t border-neutral-200 dark:border-neutral-800">
                              <td className="py-2.5 pl-3 pr-4 font-bold" colSpan={3}>
                                Total
                              </td>
                              <td className="py-2.5 pr-3 text-right text-base font-bold">
                                {formatMoney(sale.total)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </article>
              ))}

              <PaginationNav
                page={salesPage.page}
                totalPages={salesPage.totalPages}
                onPage={(p) => setSalesPage((prev) => ({ ...prev, page: p }))}
              />
              {saleLoading && (
                <p className="text-center text-xs text-neutral-400">Cargando…</p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}