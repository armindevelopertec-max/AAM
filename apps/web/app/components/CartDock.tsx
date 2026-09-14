"use client";

import { useCallback, useEffect, useState } from "react";
import ClientPicker from "./ClientPicker";
import CartDrawer, { type CartLine } from "./CartDrawer";
import { useCartStore } from "./CartStore";
import {
  createQuote,
  createSale,
  getClients,
  formatMoney,
  type Client,
} from "../lib/api";

const INSTALL_ID = -1;

function computeExpiresLabel(days: number): string {
  const date = new Date(Date.now() + Math.max(1, days) * 24 * 60 * 60 * 1000);
  return date.toLocaleDateString("es-MX");
}

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

function ClientBlock({
  clients,
  value,
  onChange,
  onClientCreated,
}: {
  clients: Client[];
  value: Client | null;
  onChange: (client: Client | null) => void;
  onClientCreated: (client: Client) => void;
}) {
  return (
    <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
        Cliente
      </label>
      <ClientPicker
        clients={clients}
        value={value}
        onChange={onChange}
        onClientCreated={onClientCreated}
      />
    </div>
  );
}

function InstallationBlock({
  withInstallation,
  installDate,
  installTime,
  installPoints,
  installPricePerPoint,
  onToggle,
  onField,
  onSyncPoints,
  onSyncPrice,
}: {
  withInstallation: boolean;
  installDate: string;
  installTime: string;
  installPoints: string;
  installPricePerPoint: string;
  onToggle: (checked: boolean) => void;
  onField: (
    key: "installDate" | "installTime" | "installPoints" | "installPricePerPoint",
    value: string,
  ) => void;
  onSyncPoints: (puntos: number) => void;
  onSyncPrice: (precio: number) => void;
}) {
  return (
    <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={withInstallation}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 rounded accent-blue-500"
        />
        Incluye instalación
      </label>
      {withInstallation && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Fecha
            </label>
            <input
              type="date"
              value={installDate}
              onChange={(e) => onField("installDate", e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Hora
            </label>
            <input
              type="time"
              value={installTime}
              onChange={(e) => onField("installTime", e.target.value)}
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
              value={installPoints}
              onChange={(e) => {
                onField("installPoints", e.target.value);
                if (withInstallation) onSyncPoints(parseInt(e.target.value, 10));
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
              value={installPricePerPoint}
              onChange={(e) => {
                onField("installPricePerPoint", e.target.value);
                if (withInstallation) onSyncPrice(Number(e.target.value));
              }}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function CartDock() {
  const {
    pos,
    setPosLines,
    setPosClientId,
    setPosField,
    quote,
    setQuoteLines,
    setQuoteClientId,
    setQuoteField,
    resetQuote,
    dockOpen,
    openDock,
    closeDock,
  } = useCartStore();

  const [clientList, setClientList] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getClients()
      .then((result) => {
        if (active) setClientList(result);
      })
      .catch(() => {
        // El usuario puede crear el cliente desde el picker igualmente
      });
    return () => {
      active = false;
    };
  }, []);

  const posClient = clientList.find((c) => c.id === pos.clientId) ?? null;
  const quoteClient = clientList.find((c) => c.id === quote.clientId) ?? null;

  // ── Cálculos POS ──
  const posSubtotal = pos.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const posSubtotalOriginal = pos.lines.reduce((s, l) => s + l.originalPrice * l.quantity, 0);
  const posTotal = posSubtotal;
  const posTotalItems = pos.lines.reduce((s, l) => s + l.quantity, 0);
  const posTotalSavings = posSubtotalOriginal - posSubtotal;
  const posMoneda = pos.lines[0]?.moneda ?? "BOB";

  // ── Cálculos Cotización ──
  const quoteSubtotal = quote.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const quoteSubtotalOriginal = quote.lines.reduce((s, l) => s + l.originalPrice * l.quantity, 0);
  const quoteTotal = quoteSubtotal;
  const quoteTotalItems = quote.lines.reduce((s, l) => s + l.quantity, 0);
  const quoteTotalSavings = quoteSubtotalOriginal - quoteSubtotal;
  const quoteMoneda = quote.lines[0]?.moneda ?? "BOB";
  const quoteAdvance = Math.max(0, Number(quote.advancePayment) || 0);
  const quoteBalance = Math.max(quoteTotal - quoteAdvance, 0);
  const validDaysNum = Math.max(1, Number(quote.validDays) || 7);
  const [expiresLabel, setExpiresLabel] = useState(() =>
    computeExpiresLabel(validDaysNum),
  );

  // ── POS: instalación ──
  const togglePosInstallation = useCallback(
    (checked: boolean) => {
      setPosField("withInstallation", checked);
      setPosLines((current) =>
        checked
          ? [
              ...current.filter((l) => l.productId !== INSTALL_ID),
              makeInstallLine(
                Math.max(1, parseInt(pos.installPoints, 10) || 1),
                Math.max(0, Number(pos.installPricePerPoint) || 0),
              ),
            ]
          : current.filter((l) => l.productId !== INSTALL_ID),
      );
    },
    [setPosField, setPosLines, pos.installPoints, pos.installPricePerPoint],
  );

  const syncPosInstallation = useCallback(
    (puntosOverride?: number, precioOverride?: number) => {
      const puntos = Math.max(
        1,
        (puntosOverride ?? parseInt(pos.installPoints, 10)) || 1,
      );
      const precio = Math.max(
        0,
        (precioOverride ?? Number(pos.installPricePerPoint)) || 0,
      );
      setPosLines((current) => [
        ...current.filter((l) => l.productId !== INSTALL_ID),
        makeInstallLine(puntos, precio),
      ]);
    },
    [setPosLines, pos.installPoints, pos.installPricePerPoint],
  );

  const handlePosInstallPrice = useCallback(
    (price: number) => {
      const v = Math.max(price, 0);
      setPosField("installPricePerPoint", String(v));
      setPosLines((current) =>
        current.map((l) =>
          l.productId === INSTALL_ID ? { ...l, unitPrice: v, originalPrice: v } : l,
        ),
      );
    },
    [setPosField, setPosLines],
  );

  const handlePosLinePrice = useCallback(
    (productId: number, price: number) => {
      const v = Math.max(price, 0);
      if (productId === INSTALL_ID) {
        handlePosInstallPrice(v);
        return;
      }
      setPosLines((current) =>
        current.map((l) =>
          l.productId === productId ? { ...l, unitPrice: v } : l,
        ),
      );
    },
    [setPosLines, handlePosInstallPrice],
  );

  const setPosQuantity = useCallback(
    (productId: number, qty: number) => {
      if (productId === INSTALL_ID) {
        const next = Math.max(1, qty);
        setPosField("installPoints", String(next));
        setPosLines((current) =>
          current.map((l) =>
            l.productId === INSTALL_ID ? { ...l, quantity: next } : l,
          ),
        );
        return;
      }
      setPosLines((current) =>
        current
          .map((l) =>
            l.productId === productId ? { ...l, quantity: Math.max(qty, 0) } : l,
          )
          .filter((l) => l.quantity > 0),
      );
    },
    [setPosLines, setPosField],
  );

  const removePosLine = useCallback(
    (productId: number) => {
      if (productId === INSTALL_ID) {
        setPosField("withInstallation", false);
      }
      setPosLines((current) => current.filter((l) => l.productId !== productId));
    },
    [setPosLines, setPosField],
  );

  // ── Cotización: instalación ──
  const toggleQuoteInstallation = useCallback(
    (checked: boolean) => {
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
    },
    [setQuoteField, setQuoteLines, quote.installPoints, quote.installPricePerPoint],
  );

  const syncQuoteInstallation = useCallback(
    (puntosOverride?: number, precioOverride?: number) => {
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
    },
    [setQuoteLines, quote.installPoints, quote.installPricePerPoint],
  );

  const handleQuoteInstallPrice = useCallback(
    (price: number) => {
      const v = Math.max(price, 0);
      setQuoteField("installPricePerPoint", String(v));
      setQuoteLines((current) =>
        current.map((l) =>
          l.productId === INSTALL_ID ? { ...l, unitPrice: v, originalPrice: v } : l,
        ),
      );
    },
    [setQuoteField, setQuoteLines],
  );

  const handleQuoteLinePrice = useCallback(
    (productId: number, price: number) => {
      const v = Math.max(price, 0);
      if (productId === INSTALL_ID) {
        handleQuoteInstallPrice(v);
        return;
      }
      setQuoteLines((current) =>
        current.map((l) =>
          l.productId === productId ? { ...l, unitPrice: v } : l,
        ),
      );
    },
    [setQuoteLines, handleQuoteInstallPrice],
  );

  const setQuoteQuantity = useCallback(
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

  const removeQuoteLine = useCallback(
    (productId: number) => {
      if (productId === INSTALL_ID) {
        setQuoteField("withInstallation", false);
      }
      setQuoteLines((current) => current.filter((l) => l.productId !== productId));
    },
    [setQuoteLines, setQuoteField],
  );

  // ── Acciones ──
  async function handlePosCheckout() {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const sale = await createSale({
        clientId: posClient?.id,
        discount: 0,
        items: pos.lines.map((l) =>
          l.productId === INSTALL_ID
            ? {
                quantity: l.quantity,
                precio: l.unitPrice,
                nombre: l.name,
                sku: l.sku,
              }
            : {
                productId: l.productId,
                fuente: l.fuente || undefined,
                quantity: l.quantity,
                precio: l.unitPrice,
              },
        ),
      });
      setSuccess(`Venta ${sale.number} registrada por ${formatMoney(sale.total, posMoneda)}`);
      setPosLines([]);
      setPosClientId(null);
      setPosField("withInstallation", false);
      setPosField("installDate", "");
      setPosField("installTime", "");
      setPosField("installPoints", "1");
      setPosField("installPricePerPoint", "100");
      closeDock();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  async function handleQuoteCreate() {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const q = await createQuote({
        clientId: quoteClient?.id,
        discount: quoteTotalSavings,
        validDays: validDaysNum,
        items: quote.lines.map((line) =>
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
                precio: line.unitPrice,
              },
        ),
      });
      setSuccess(`Cotización ${q.number} creada por ${formatMoney(q.total, quoteMoneda)}`);
      resetQuote();
      closeDock();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* ── Botones flotantes ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <button
          onClick={() => openDock("quote")}
          aria-label="Carrito de cotización"
          className="relative flex h-14 items-center gap-2 rounded-full bg-amber-600 px-4 text-white shadow-xl shadow-amber-600/30 transition hover:bg-amber-700 active:scale-95 dark:bg-amber-600"
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
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M16 13H8M16 17H8M10 9H8" />
          </svg>
          <span className="hidden text-sm font-bold sm:inline">Cotización</span>
          {quoteTotalItems > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1.5 text-xs font-bold">
              {quoteTotalItems}
            </span>
          )}
        </button>
        <button
          onClick={() => openDock("pos")}
          aria-label="Carrito POS"
          className="relative flex h-14 items-center gap-2 rounded-full bg-green-600 px-4 text-white shadow-xl shadow-green-600/30 transition hover:bg-green-700 active:scale-95 dark:bg-green-600"
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
          <span className="hidden text-sm font-bold sm:inline">POS</span>
          {posTotalItems > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1.5 text-xs font-bold">
              {posTotalItems}
            </span>
          )}
        </button>
      </div>

      {/* ── Drawer POS ── */}
      <CartDrawer
        buttonless
        open={dockOpen === "pos"}
        setOpen={closeDock}
        title="Carrito POS"
        emptyMessage="Agregá productos del catálogo."
        lines={pos.lines}
        subtotalOriginal={posSubtotalOriginal}
        totalSavings={posTotalSavings}
        total={posTotal}
        totalItems={posTotalItems}
        moneda={posMoneda}
        extra={
          pos.lines.length > 0 ? (
            <>
              <ClientBlock
                clients={clientList}
                value={posClient}
                onChange={(c) => setPosClientId(c?.id ?? null)}
                onClientCreated={(c) =>
                  setClientList((cur) =>
                    cur.some((x) => x.id === c.id) ? cur : [...cur, c],
                  )
                }
              />
              <InstallationBlock
                withInstallation={pos.withInstallation}
                installDate={pos.installDate}
                installTime={pos.installTime}
                installPoints={pos.installPoints}
                installPricePerPoint={pos.installPricePerPoint}
                onToggle={togglePosInstallation}
                onField={(key, value) => setPosField(key, value)}
                onSyncPoints={(puntos) => syncPosInstallation(puntos)}
                onSyncPrice={(precio) => syncPosInstallation(undefined, precio)}
              />
            </>
          ) : undefined
        }
        actionLabel="Cobrar venta"
        actionBusyLabel="Registrando…"
        busy={saving}
        onAction={handlePosCheckout}
        onSetQuantity={setPosQuantity}
        onRemoveLine={removePosLine}
        onPriceChange={handlePosLinePrice}
      />

      {/* ── Drawer Cotización ── */}
      <CartDrawer
        buttonless
        open={dockOpen === "quote"}
        setOpen={closeDock}
        title="Carrito Cotización"
        emptyMessage="Agregá productos del catálogo."
        lines={quote.lines}
        subtotalOriginal={quoteSubtotalOriginal}
        totalSavings={quoteTotalSavings}
        total={quoteTotal}
        totalItems={quoteTotalItems}
        moneda={quoteMoneda}
        advance={quoteAdvance}
        balance={quoteBalance}
        extra={
          quote.lines.length > 0 ? (
            <>
              <ClientBlock
                clients={clientList}
                value={quoteClient}
                onChange={(c) => setQuoteClientId(c?.id ?? null)}
                onClientCreated={(c) =>
                  setClientList((cur) =>
                    cur.some((x) => x.id === c.id) ? cur : [...cur, c],
                  )
                }
              />
              <InstallationBlock
                withInstallation={quote.withInstallation}
                installDate={quote.installDate}
                installTime={quote.installTime}
                installPoints={quote.installPoints}
                installPricePerPoint={quote.installPricePerPoint}
                onToggle={toggleQuoteInstallation}
                onField={(key, value) => setQuoteField(key, value)}
                onSyncPoints={(puntos) => syncQuoteInstallation(puntos)}
                onSyncPrice={(precio) => syncQuoteInstallation(undefined, precio)}
              />
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
                          computeExpiresLabel(
                            Math.max(1, Number(e.target.value) || 7),
                          ),
                        );
                      }}
                      min="1"
                      className="w-20 rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </div>
                  <span className="pb-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                    días
                  </span>
                </div>
                <span className="pb-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  Vence: {expiresLabel}
                </span>
              </div>
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
                  className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-right text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
              </div>
            </>
          ) : undefined
        }
        actionLabel="Crear cotización"
        actionBusyLabel="Creando…"
        busy={saving}
        onAction={handleQuoteCreate}
        onSetQuantity={setQuoteQuantity}
        onRemoveLine={removeQuoteLine}
        onPriceChange={handleQuoteLinePrice}
      />

      {error && (
        <p className="fixed bottom-6 left-6 z-40 w-auto max-w-sm rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}
      {success && (
        <p className="fixed bottom-6 left-6 z-40 w-auto max-w-sm rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
          {success}
        </p>
      )}
    </>
  );
}