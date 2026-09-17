"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProductCatalog from "./ProductCatalog";
import { type CartLine } from "./CartDrawer";
import { useCartStore } from "./CartStore";
import {
  deleteKit,
  formatMoney,
  getKitImageUrl,
  getKits,
  getProductImage,
  getProductImageUrl,
  getQuote,
  getSale,
  type Kit,
  type Product,
  type Quote,
  type Sale,
} from "../lib/api";

type SeedData = {
  items: Array<{
    productId: number | null;
    fuente: string | null;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    originalPrice: number;
    unidad?: string | null;
  }>;
};

function buildLinesFromSeed(seed: SeedData): CartLine[] {
  return seed.items.map((item, index) => ({
    productId: item.productId ?? -(index + 1),
    fuente: item.fuente ?? "",
    moneda: "BOB",
    name: item.name,
    sku: item.sku,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    originalPrice: item.originalPrice,
    costPrice: 0,
    imageUrl: null,
    isInstall: item.productId == null,
    unidad: item.unidad ?? null,
  }));
}

export default function KitsManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const desde = searchParams.get("desde");
  const {
    kit,
    setKitLines,
    setKitName,
    loadKit,
    resetKit,
    openDock,
    kitRevision,
  } = useCartStore();

  const [kits, setKits] = useState<Kit[]>([]);
  const [loadingKits, setLoadingKits] = useState(true);
  const [collages, setCollages] = useState<Record<string, string[]>>({});
  const [listError, setListError] = useState<string | null>(null);
  const seedApplied = useRef(false);

  const resolveCollages = useCallback(async (result: Kit[]) => {
    const map: Record<string, string[]> = {};
    await Promise.all(
      result.map(async (kit) => {
        const imgs: string[] = [];
        await Promise.all(
          kit.items
            .filter((item) => item.productId != null)
            .slice(0, 4)
            .map(async (item) => {
              if (imgs.length >= 4) return;
              try {
                const { imageUrl } = await getProductImage(
                  item.fuente,
                  item.productId!,
                );
                if (imageUrl && imgs.length < 4) imgs.push(getProductImageUrl(imageUrl)!);
              } catch {
                // sin imagen
              }
            }),
        );
        map[kit.id] = imgs;
      }),
    );
    setCollages((prev) => ({ ...prev, ...map }));
  }, []);

  const loadKits = useCallback(async () => {
    setLoadingKits(true);
    setListError(null);
    try {
      const result = await getKits();
      setKits(result);
      void resolveCollages(result);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoadingKits(false);
    }
  }, [resolveCollages]);

  useEffect(() => {
    void loadKits();
  }, [loadKits, kitRevision]);

  const resolveImages = useCallback(async (sessionLines: CartLine[]) => {
    const pending = sessionLines.filter((line) => !line.imageUrl && !line.isInstall && line.fuente);
    if (pending.length === 0) return sessionLines;
    const resolved = await Promise.all(
      sessionLines.map(async (line) => {
        if (line.imageUrl || line.isInstall || !line.fuente) return line;
        try {
          const { imageUrl } = await getProductImage(line.fuente, line.productId);
          return imageUrl ? { ...line, imageUrl } : line;
        } catch {
          return line;
        }
      }),
    );
    return resolved;
  }, []);

  // Semilla desde Seguimiento: /kits?desde=quote:<id> o /kits?desde=sale:<id>
  useEffect(() => {
    if (!desde || seedApplied.current) return;
    seedApplied.current = true;
    const [tipo, id] = desde.split(":");
    if (!tipo || !id) return;

    const fetchSeed = async () => {
      try {
        const seed =
          tipo === "sale"
            ? ((await getSale(id)) as Sale)
            : ((await getQuote(id)) as Quote);
        const items = seed.items.map((item) => ({
          productId: item.productId,
          fuente: item.fuente,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          originalPrice: "originalPrice" in item ? item.originalPrice : item.unitPrice,
        }));
        const sessionLines = buildLinesFromSeed({ items });
        const resolved = await resolveImages(sessionLines);
        resetKit();
        setKitLines(resolved);
        setKitName(`Kit ${seed.number ?? ""}`.trim());
        openDock("kit");
      } catch (err) {
        setListError(
          err instanceof Error ? err.message : "No se pudo cargar la referencia",
        );
      }
    };
    void fetchSeed();
    router.replace("/kits");
  }, [desde, router, resolveImages, resetKit, setKitLines, setKitName, openDock]);

  const startEdit = useCallback(
    async (source: Kit) => {
      loadKit(source);
      const sessionLines = buildLinesFromSeed(source);
      const resolved = await resolveImages(sessionLines);
      setKitLines(resolved);
      openDock("kit");
    },
    [loadKit, resolveImages, setKitLines, openDock],
  );

  const addLine = useCallback(
    (product: Product) => {
      setKitLines((current) => {
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
            unidad: product.unidad ?? null,
          },
        ];
      });
    },
    [setKitLines],
  );

  const inCart = useCallback(
    (productId: number) =>
      kit.lines.find((l) => l.productId === productId)?.quantity ?? 0,
    [kit.lines],
  );

  const removeKit = useCallback(
    async (target: Kit) => {
      if (!confirm(`¿Eliminar el kit "${target.name}"?`)) return;
      try {
        await deleteKit(target.id);
        if (kit.editingId === target.id) resetKit();
        setKits((current) => current.filter((k) => k.id !== target.id));
        setCollages((prev) => {
          const next = { ...prev };
          delete next[target.id];
          return next;
        });
      } catch (err) {
        setListError(err instanceof Error ? err.message : "Error al eliminar");
      }
    },
    [kit.editingId, resetKit],
  );

  const kitTotal = useCallback(
    (target: Kit) =>
      target.priceOverride != null && target.priceOverride > 0
        ? target.priceOverride
        : target.subtotal,
    [],
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Kits</h2>
      </div>

      {listError && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {listError}
        </p>
      )}

      {loadingKits ? (
        <p className="py-16 text-center text-sm text-neutral-400">
          Cargando kits…
        </p>
      ) : kits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 py-16 text-center dark:border-neutral-700">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Todavía no hay kits. Agregá productos del catálogo y guardá el kit
            desde el carrito flotante.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kits.map((item) => {
            const collage = collages[item.id] ?? [];
            return (
              <div
                key={item.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
              >
                {item.imageUrl ? (
                  <img
                    src={getKitImageUrl(item.imageUrl)!}
                    alt={item.name}
                    className="h-40 w-full object-cover"
                  />
                ) : collage.length > 0 ? (
                  <div className="grid h-40 w-full grid-cols-2 overflow-hidden">
                    {collage.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex h-40 w-full items-center justify-center bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
                    📦
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-1.5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold leading-tight">
                      {item.name}
                    </h3>
                    {item.priceOverride != null && item.priceOverride > 0 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                        Precio fijo
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                      {item.description}
                    </p>
                  )}
                  <p className="text-xs text-neutral-400">
                    {item.items.length}{" "}
                    {item.items.length === 1 ? "producto" : "productos"} ·{" "}
                    {item.items.reduce(
                      (s, it) => s + (it.unidad === "metro" ? 1 : it.quantity),
                      0,
                    )}{" "}
                    ítems
                  </p>
                  <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
                    <span className="text-base font-bold text-green-600 dark:text-green-400">
                      {formatMoney(kitTotal(item), item.items[0]?.moneda ?? "BOB")}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void startEdit(item)}
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-bold transition hover:border-blue-500 hover:text-blue-500 dark:border-neutral-700"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => void removeKit(item)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-500 transition hover:border-red-500 dark:border-red-900"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          Agregá productos del catálogo a tu kit
        </h3>
        <ProductCatalog
          showOriginalPrice
          onAdd={addLine}
          inCartQty={inCart}
        />
      </div>
    </div>
  );
}
