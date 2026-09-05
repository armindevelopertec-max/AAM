"use client";

import { useState, useCallback } from "react";
import ClientPicker from "./ClientPicker";
import CartDrawer, { type CartLine } from "./CartDrawer";
import ProductCatalog from "./ProductCatalog";
import { useCartStore } from "./CartStore";
import {
  createQuote,
  formatMoney,
  type Client,
  type Product,
} from "../lib/api";

const INSTALL_ID = -1;

function computeExpiresLabel(days: number): string {
  const date = new Date(Date.now() + Math.max(1, days) * 24 * 60 * 60 * 1000);
  return date.toLocaleDateString("es-MX");
}

export default function QuotesManager({
  clients,
}: {
  clients: Client[];
}) {
  const [cartOpen, setCartOpen] = useState(false);
  const { quote, setQuoteLines, setQuoteClientId, setQuoteField, resetQuote } =
    useCartStore();
  const lines = quote.lines;

  const [clientList, setClientList] = useState<Client[]>(clients);
  const selectedClient = clientList.find((c) => c.id === quote.clientId) ?? null;
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expiresLabel, setExpiresLabel] = useState(() =>
    computeExpiresLabel(Math.max(1, Number(quote.validDays) || 7)),
  );

  const inCart = useCallback(
    (productId: number) => lines.find((l) => l.productId === productId)?.quantity ?? 0,
    [lines],
  );

  const addLine = useCallback(
    (product: Product) => {
      setError(null);
      setSuccess(null);
      if (lines.length === 0) setCartOpen(true);
      setQuoteLines((current) => {
        const existing = current.find((l) => l.productId === product.id);
        if (existing) {
          return current.map((l) =>
            l.productId === product.id
              ? { ...l, quantity: Math.min(l.quantity + 1, product.stock) }
              : l,
          );
        }
        return [
          ...current,
          {
            productId: product.id,
            fuente: product.fuente ?? "",
            moneda: product.moneda ?? "BOB",
            name: product.name,
            sku: product.sku,
            quantity: 1,
            unitPrice: product.price,
            originalPrice: product.regularPrice || product.price,
            costPrice: product.costPrice,
            imageUrl: product.imageUrl,
            isInstall: false,
          },
        ];
      });
    },
    [lines, setQuoteLines],
  );

  const setQuantity = useCallback(
    (productId: number, qty: number) => {
      if (productId === INSTALL_ID) {
        const next = Math.max(1, qty);
        setQuoteField("installPoints", String(next));
        setQuoteLines((current) =>
          current.map((l) =>
            l.productId === INSTALL_ID ? { ...l, quantity: next } : l,
          ),
        );
        return;
      }
      setQuoteLines((current) =>
        current
          .map((l) =>
            l.productId === productId ? { ...l, quantity: Math.max(qty, 0) } : l,
          )
          .filter((l) => l.quantity > 0),
      );
    },
    [setQuoteLines, setQuoteField],
  );

  const removeLine = useCallback(
    (productId: number) => {
      if (productId === INSTALL_ID) {
        setQuoteField("withInstallation", false);
      }
      setQuoteLines((current) => current.filter((l) => l.productId !== productId));
    },
    [setQuoteLines, setQuoteField],
  );

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const subtotalOriginal = lines.reduce((s, l) => s + l.originalPrice * l.quantity, 0);
  const total = subtotal;
  const totalItems = lines.reduce((s, l) => s + l.quantity, 0);
  const totalSavings = subtotalOriginal - subtotal;
  const advance = Math.max(0, Number(quote.advancePayment) || 0);
  const balance = Math.max(total - advance, 0);
  const moneda = lines[0]?.moneda ?? "BOB";

  const validDaysNum = Math.max(1, Number(quote.validDays) || 7);

  function makeInstallLine(puntos: number, precio: number): CartLine {
    return {
      productId: INSTALL_ID,
      fuente: "",
      moneda: "BOB",
      name: "Instalación de cámaras",
      sku: "SERVICIO",
      quantity: Math.max(1, puntos),
      unitPrice: Math.max(0, precio),
      originalPrice: Math.max(0, precio),
      costPrice: 0,
      imageUrl: null,
      isInstall: true,
    };
  }

  function syncInstallation(puntosOverride?: number, precioOverride?: number) {
    const puntos = Math.max(
      1,
      (puntosOverride ?? parseInt(quote.installPoints, 10)) || 1,
    );
    const precio = Math.max(
      0,
      (precioOverride ?? Number(quote.installPricePerPoint)) || 0,
    );
    setQuoteLines((current) => [
      ...current.filter((l) => l.productId !== INSTALL_ID),
      makeInstallLine(puntos, precio),
    ]);
  }

  function toggleInstallation(checked: boolean) {
    setQuoteField("withInstallation", checked);
    setQuoteLines((current) =>
      checked
        ? [
            ...current.filter((l) => l.productId !== INSTALL_ID),
            makeInstallLine(
              Math.max(1, parseInt(quote.installPoints, 10) || 1),
              Math.max(0, Number(quote.installPricePerPoint) || 0),
            ),
          ]
        : current.filter((l) => l.productId !== INSTALL_ID),
    );
  }

  function handleInstallPrice(price: number) {
    const v = Math.max(price, 0);
    setQuoteField("installPricePerPoint", String(v));
    setQuoteLines((current) =>
      current.map((l) =>
        l.productId === INSTALL_ID ? { ...l, unitPrice: v, originalPrice: v } : l,
      ),
    );
  }

  async function handleCreate() {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const quote = await createQuote({
        clientId: selectedClient?.id,
        discount: totalSavings,
        validDays: validDaysNum,
        items: lines.map((line) =>
          line.productId === INSTALL_ID
            ? {
                quantity: line.quantity,
                precio: line.unitPrice,
                nombre: line.name,
                sku: line.sku,
              }
            : {
                productId: line.productId,
                fuente: line.fuente || undefined,
                quantity: line.quantity,
              },
        ),
      });
      setSuccess(`Cotización ${quote.number} creada por ${formatMoney(quote.total, moneda)}`);
      resetQuote();
      setCartOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-5">
      {/* ── Catálogo paginado ── */}
      <ProductCatalog showOriginalPrice onAdd={addLine} inCartQty={inCart} />

      {/* ── Carrito flotante + drawer ── */}
      <CartDrawer
        open={cartOpen}
        setOpen={setCartOpen}
        title="Cotización"
        emptyMessage="Agregá productos del catálogo."
        lines={lines}
        subtotalOriginal={subtotalOriginal}
        totalSavings={totalSavings}
        total={total}
        totalItems={totalItems}
        moneda={moneda}
        advance={advance}
        balance={balance}
        extra={
          lines.length > 0 ? (
            <>
              {/* Cliente */}
              <div className="mt-3">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Cliente *
                </label>
                <ClientPicker
                  clients={clientList}
                  value={selectedClient}
                  onChange={(c) => setQuoteClientId(c?.id ?? null)}
                  onClientCreated={(c) =>
                    setClientList((cur) =>
                      cur.some((x) => x.id === c.id) ? cur : [...cur, c],
                    )
                  }
                />
              </div>

              {/* Instalación */}
              <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={quote.withInstallation}
                    onChange={(e) => toggleInstallation(e.target.checked)}
                    className="h-4 w-4 rounded accent-blue-500"
                  />
                  Incluye instalación
                </label>
                {quote.withInstallation && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                        Fecha
                      </label>
                      <input
                        type="date"
                        value={quote.installDate}
                        onChange={(e) => setQuoteField("installDate", e.target.value)}
                        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                        Hora
                      </label>
                      <input
                        type="time"
                        value={quote.installTime}
                        onChange={(e) => setQuoteField("installTime", e.target.value)}
                        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                        Puntos
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={quote.installPoints}
                        onChange={(e) => {
                          setQuoteField("installPoints", e.target.value);
                          if (quote.withInstallation)
                            syncInstallation(parseInt(e.target.value, 10));
                        }}
                        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                        Precio/punto
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={quote.installPricePerPoint}
                        onChange={(e) => {
                          setQuoteField("installPricePerPoint", e.target.value);
                          if (quote.withInstallation)
                            syncInstallation(undefined, Number(e.target.value));
                        }}
                        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Vigencia */}
              <div className="mt-3 flex items-end justify-between gap-2">
                <div className="flex items-end gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                      Vigencia
                    </label>
                    <input
                      type="number"
                      value={quote.validDays}
                      onChange={(e) => {
                        setQuoteField("validDays", e.target.value);
                        setExpiresLabel(
                          computeExpiresLabel(Math.max(1, Number(e.target.value) || 7)),
                        );
                      }}
                      min="1"
                      className="w-20 rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                    />
                  </div>
                  <span className="pb-1.5 text-xs text-neutral-500 dark:text-neutral-400">días</span>
                </div>
                <span className="pb-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  Vence: {expiresLabel}
                </span>
              </div>

              {/* Saldo adelanto */}
              <div className="mt-3">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Saldo adelanto
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={quote.advancePayment}
                  onChange={(e) => setQuoteField("advancePayment", e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-right dark:border-neutral-700 dark:bg-neutral-800"
                />
              </div>
            </>
          ) : undefined
        }
        actionLabel="Crear cotización"
        actionBusyLabel="Creando…"
        busy={saving}
        onAction={handleCreate}
        onSetQuantity={setQuantity}
        onRemoveLine={removeLine}
        onPriceChange={(productId, price) => {
          if (productId === INSTALL_ID) handleInstallPrice(price);
        }}
      />

      {error && (
        <p className="fixed bottom-6 right-auto left-6 z-40 w-auto max-w-sm rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}
      {success && (
        <p className="fixed bottom-6 left-6 z-40 w-auto max-w-sm rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
          {success}
        </p>
      )}
    </div>
  );
}