"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getPublicKits, formatMoney, getKitImageUrl, type Kit } from "../../lib/api";

export default function PublicKits() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getPublicKits()
      .then((result) => {
        if (active) setKits(result);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Error al cargar kits");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const kitTotal = (kit: Kit) =>
    kit.priceOverride != null && kit.priceOverride > 0 ? kit.priceOverride : kit.subtotal;

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 animate-pulse">
            <div className="h-40 bg-neutral-200 dark:bg-neutral-800" />
            <div className="flex flex-1 flex-col gap-1.5 p-4">
              <div className="h-4 bg-neutral-200 rounded w-3/4 dark:bg-neutral-800" />
              <div className="h-4 bg-neutral-200 rounded w-1/2 dark:bg-neutral-800" />
              <div className="mt-auto h-6 bg-neutral-200 rounded w-1/4 dark:bg-neutral-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (kits.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 py-16 text-center dark:border-neutral-700">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          No hay kits disponibles en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {kits.map((kit) => {
        const total = kitTotal(kit);
        const currency = kit.items[0]?.moneda ?? "BOB";
        const hasFixedPrice = kit.priceOverride != null && kit.priceOverride > 0;
        const imageUrl = getKitImageUrl(kit.imageUrl);

        return (
          <article
            key={kit.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-shadow hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
          >
<div className="relative h-40 w-full overflow-hidden">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={kit.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
                  📦
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-bold leading-tight">{kit.name}</h3>
                {hasFixedPrice && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                    Precio fijo
                  </span>
                )}
              </div>
              {kit.description && (
                <p className="line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                  {kit.description}
                </p>
              )}
              <p className="text-xs text-neutral-400">
                {kit.items.length} {kit.items.length === 1 ? "producto" : "productos"}
              </p>
              <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatMoney(total, currency)}
                </span>
                {hasFixedPrice && (
                  <span className="text-xs text-neutral-400 line-through">
                    {formatMoney(kit.subtotal, currency)}
                  </span>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}