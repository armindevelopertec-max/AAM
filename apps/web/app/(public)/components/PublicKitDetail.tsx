"use client";

import Link from "next/link";
import Image from "next/image";
import { formatMoney, getKitImageUrl, getProductImageUrl, type Kit, type KitItem } from "../../lib/api";

interface PublicKitDetailProps {
  kit: Kit;
  itemImages: Record<string, string>;
}

export default function PublicKitDetail({ kit, itemImages }: PublicKitDetailProps) {
  const kitImageUrl = getKitImageUrl(kit.imageUrl);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/#kits"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white mb-6"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Volver a Kits
      </Link>

      {/* Kit Header */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {kitImageUrl ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800">
              <Image
                src={kitImageUrl}
                alt={kit.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 66vw, 50vw"
              />
            </div>
          ) : (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <span className="text-6xl">📦</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-bold">{kit.name}</h1>
          {kit.description && (
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {kit.description}
            </p>
          )}
          <div className="flex items-center gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <span className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatMoney(
                kit.priceOverride != null && kit.priceOverride > 0 ? kit.priceOverride : kit.subtotal,
                kit.items[0]?.moneda ?? "BOB"
              )}
            </span>
            {kit.priceOverride != null && kit.priceOverride > 0 && (
              <span className="text-neutral-400 line-through">
                {formatMoney(kit.subtotal, kit.items[0]?.moneda ?? "BOB")}
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {kit.items.length} {kit.items.length === 1 ? "producto" : "productos"} incluidos
          </p>
        </div>
      </div>

      {/* Items Grid */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Productos Incluidos</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kit.items.map((item) => {
            const itemImageUrl = itemImages[item.id];
            const displayName = item.name;
            const displaySku = item.sku;
            const quantity = item.quantity;
            const unidad = item.unidad ?? "unidad";

            return (
              <article
                key={item.id}
                className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                  {itemImageUrl ? (
                    <Image
                      src={itemImageUrl}
                      alt={displayName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-400 dark:text-neutral-500">
                      📦
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-4">
                  <h3 className="text-base font-semibold leading-tight line-clamp-2">{displayName}</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">{displaySku}</p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Cantidad: {quantity} {unidad === "metro" ? "m" : unidad + (quantity > 1 ? "s" : "")}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <div className="mt-12 text-center">
        <Link
          href="/#contacto"
          className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-6 py-3 text-white font-medium transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Solicitar Instalación / Cotización
        </Link>
      </div>
    </div>
  );
}