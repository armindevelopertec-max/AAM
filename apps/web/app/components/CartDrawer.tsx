"use client";

import { getProductImageUrl, formatMoney } from "../lib/api";

export type CartLine = {
  productId: number;
  fuente: string;
  moneda: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  costPrice: number;
  imageUrl: string | null;
  isInstall?: boolean;
  unidad?: string | null;
};

/** Los productos por metro (cable) cuentan como un solo ítem, sin importar los metros. */
export function cartItemCount(line: CartLine): number {
  return line.unidad === "metro" ? 1 : line.quantity;
}

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
  buttonless?: boolean;
  title: string;
  lines: CartLine[];
  emptyMessage: string;
  subtotalOriginal: number;
  totalSavings: number;
  total: number;
  totalItems: number;
  moneda: string;
  advance?: number;
  balance?: number;
  extra?: React.ReactNode;
  actionLabel: string;
  actionBusyLabel?: string;
  actionDisabled?: boolean;
  busy?: boolean;
  onAction: () => void;
  onSetQuantity: (productId: number, qty: number) => void;
  onRemoveLine: (productId: number) => void;
  onPriceChange?: (productId: number, price: number) => void;
};

export default function CartDrawer({
  open,
  setOpen,
  buttonless = false,
  title,
  lines,
  emptyMessage,
  subtotalOriginal,
  totalSavings,
  total,
  totalItems,
  moneda,
  advance = 0,
  balance,
  extra,
  actionLabel,
  actionBusyLabel,
  actionDisabled = false,
  busy = false,
  onAction,
  onSetQuantity,
  onRemoveLine,
  onPriceChange,
}: Props) {
  const hasLines = lines.length > 0;
  const disabled = busy || !hasLines || actionDisabled;

  return (
    <>
      {/* ── Botón flotante ── */}
      {!buttonless && (
        <button
          onClick={() => setOpen(true)}
          aria-label={title}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-xl shadow-green-600/30 transition hover:bg-green-700 active:scale-95 dark:bg-green-600"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <circle cx="9" cy="21" r="1.5" />
            <circle cx="19" cy="21" r="1.5" />
            <path d="M2 2h2l2.4 12.5a2 2 0 0 0 2 1.5h8.7a2 2 0 0 0 2-1.6L21 7H6" />
          </svg>
          {totalItems > 0 && (
            <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1.5 text-xs font-bold text-white">
              {totalItems}
            </span>
          )}
        </button>
      )}

      {/* ── Fondo oscuro ── */}
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Panel deslizante ── */}
      <aside
        className={`fixed inset-y-0 right-0 z-[70] flex w-full max-w-[420px] flex-col bg-white shadow-2xl transition-transform duration-300 dark:bg-neutral-900 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <h2 className="text-base font-semibold">
            {title}
            {totalItems > 0 && (
              <span className="ml-2 rounded-full bg-blue-500 px-2 py-0.5 text-xs text-white">
                {totalItems}
              </span>
            )}
          </h2>
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar carrito"
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-5 w-5"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!hasLines ? (
            <p className="py-14 text-center text-sm text-neutral-400">
              {emptyMessage}
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {lines.map((line) => {
                  const isInstall = line.isInstall;
                  const hasDiscount =
                    !isInstall &&
                    line.originalPrice > 0 &&
                    line.originalPrice > line.unitPrice;
                  const discountPct = hasDiscount
                    ? Math.round((1 - line.unitPrice / line.originalPrice) * 100)
                    : 0;
                  const lineTotal = line.unitPrice * line.quantity;
                  return (
                    <div
                      key={line.productId}
                      className={`grid grid-cols-[42px_1fr] items-center gap-2 rounded-lg border p-2 sm:grid-cols-[42px_1fr_auto] ${
                        isInstall
                          ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
                          : "border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800"
                      }`}
                    >
                      {isInstall ? (
                        <div className="flex h-[42px] w-[42px] items-center justify-center rounded-md bg-amber-100 text-lg dark:bg-amber-900">
                          🔧
                        </div>
                      ) : line.imageUrl ? (
                        <img
                          src={getProductImageUrl(line.imageUrl)!}
                          alt=""
                          className="h-[42px] w-[42px] rounded-md object-cover"
                        />
                      ) : (
                        <div className="h-[42px] w-[42px] rounded-md bg-neutral-200 dark:bg-neutral-700" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium leading-tight">
                          {line.name}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              onSetQuantity(line.productId, line.quantity - 1)
                            }
                            className="flex h-6 w-6 items-center justify-center rounded-md border border-neutral-300 text-xs font-bold transition hover:border-blue-500 hover:text-blue-500 dark:border-neutral-600"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={line.quantity}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (Number.isFinite(v) && v > 0) {
                                onSetQuantity(line.productId, v);
                              }
                            }}
                            className="w-12 rounded-md border border-neutral-300 px-1 py-0.5 text-center text-xs font-bold dark:border-neutral-600 dark:bg-neutral-900"
                          />
                          {line.unidad === "metro" && (
                            <span className="text-[10px] text-neutral-400">
                              m
                            </span>
                          )}
                          <button
                            onClick={() =>
                              onSetQuantity(line.productId, line.quantity + 1)
                            }
                            className="flex h-6 w-6 items-center justify-center rounded-md border border-neutral-300 text-xs font-bold transition hover:border-blue-500 hover:text-blue-500 dark:border-neutral-600"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="col-span-2 mt-1 flex flex-wrap items-center gap-1 sm:col-span-1 sm:mt-0 sm:flex-col sm:items-end">
                        {hasDiscount && (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-neutral-400 line-through">
                              {formatMoney(line.originalPrice, line.moneda)}
                            </span>
                            <span
                              className={`rounded-full px-1.5 py-px text-[10px] font-bold ${
                                line.unitPrice < line.costPrice
                                  ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                  : line.unitPrice < line.costPrice * 1.4
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                                    : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                              }`}
                            >
                              −{discountPct}%
                            </span>
                          </div>
                        )}
                        {onPriceChange ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.unitPrice}
                              onChange={(e) =>
                                onPriceChange(
                                  line.productId,
                                  Math.max(Number(e.target.value) || 0, 0),
                                )
                              }
                              className="w-14 rounded-md border border-neutral-300 px-1.5 py-1 text-right text-xs sm:w-[70px] dark:border-neutral-600 dark:bg-neutral-900"
                            />
                            <span className="text-[10px] text-neutral-400">
                              ×{line.quantity}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold">
                            {formatMoney(line.unitPrice, line.moneda)}
                          </span>
                        )}
                        <span className="text-[11px] font-bold">
                          {formatMoney(lineTotal, line.moneda)}
                        </span>
                        <button
                          onClick={() => onRemoveLine(line.productId)}
                          className="text-xs text-red-500 hover:text-red-400"
                          title="Quitar"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {extra}
            </>
          )}
        </div>

        {hasLines && (
          <div className="border-t border-neutral-200 px-5 py-4 dark:border-neutral-800">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Items</span>
              <span className="font-bold">{totalItems}</span>
            </div>
            {totalSavings > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Precio real</span>
                  <span className="text-neutral-400 line-through">
                    {formatMoney(subtotalOriginal, moneda)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>
                    Ahorro (
                    {subtotalOriginal > 0
                      ? Math.round((totalSavings / subtotalOriginal) * 100)
                      : 0}
                    %)
                  </span>
                  <span className="font-bold">
                    −{formatMoney(totalSavings, moneda)}
                  </span>
                </div>
              </>
            )}
            <div className="mt-1 flex items-center justify-between border-t border-neutral-200 pt-2 dark:border-neutral-700">
              <span className="text-base font-bold">Total</span>
              <span className="text-xl font-bold">
                {formatMoney(total, moneda)}
              </span>
            </div>
            {advance > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber-600 dark:text-amber-400">Adelanto</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  −{formatMoney(advance, moneda)}
                </span>
              </div>
            )}
            {advance > 0 && (
              <div className="flex items-center justify-between border-t border-neutral-200 pt-2 dark:border-neutral-700">
                <span className="font-semibold">Saldo restante</span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {formatMoney(balance ?? total - advance, moneda)}
                </span>
              </div>
            )}
            <button
              onClick={onAction}
              disabled={disabled}
              className="mt-3 w-full rounded-xl bg-green-600 px-4 py-3 text-base font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? actionBusyLabel ?? actionLabel : actionLabel}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}