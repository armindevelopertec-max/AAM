import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProductImageServer, SERVER_API_URL, type Kit, type KitItem } from "../../../lib/api";
import PublicKitDetail from "../../components/PublicKitDetail";

async function fetchItemImages(items: KitItem[]): Promise<Record<string, string>> {
  const itemsWithProduct = items.filter((item) => item.productId != null && item.fuente);
  if (itemsWithProduct.length === 0) return {};

  const results = await Promise.all(
    itemsWithProduct.map(async (item) => {
      try {
        const { imageUrl } = await getProductImageServer(item.fuente!, item.productId!);
        return { itemId: item.id, imageUrl: imageUrl ?? null };
      } catch {
        return { itemId: item.id, imageUrl: null };
      }
    })
  );

  const map: Record<string, string> = {};
  results.forEach(({ itemId, imageUrl }) => {
    if (imageUrl) map[itemId] = imageUrl;
  });
  return map;
}

export const revalidate = 0;

export default async function PublicKitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let kit: Kit;
  try {
    const apiUrl = `${SERVER_API_URL}/public/kits/${id}`;
    console.log('[PublicKitDetailPage] Fetching from:', apiUrl);
    const res = await fetch(apiUrl, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    console.log('[PublicKitDetailPage] Response status:', res.status);
    if (!res.ok) {
      const text = await res.text();
      console.error('[PublicKitDetailPage] Error response:', text);
      notFound();
    }
    kit = await res.json();
    console.log('[PublicKitDetailPage] Kit fetched:', kit.name);
  } catch (err) {
    console.error('[PublicKitDetailPage] Error:', err);
    notFound();
  }

  const itemImagesPromise = fetchItemImages(kit.items);

  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-16 animate-pulse">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
        </div>
        <div className="space-y-4">
          <div className="h-8 bg-neutral-200 rounded w-3/4 dark:bg-neutral-800" />
          <div className="h-4 bg-neutral-200 rounded w-1/2 dark:bg-neutral-800" />
        </div>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="relative aspect-square w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800" />
            <div className="flex flex-1 flex-col gap-1.5 p-4">
              <div className="h-5 bg-neutral-200 rounded w-3/4 dark:bg-neutral-800" />
              <div className="h-4 bg-neutral-200 rounded w-1/2 dark:bg-neutral-800" />
            </div>
          </div>
        ))}
      </div>
    </div>}>
      <PublicKitDetail kit={kit} itemImages={await itemImagesPromise} />
    </Suspense>
  );
}