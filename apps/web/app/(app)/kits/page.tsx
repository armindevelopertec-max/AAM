import { Suspense } from "react";
import KitsManager from "../../components/KitsManager";

export default function KitsPage() {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-3xl font-bold">Kits</h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          Armá kits de equipos y cargalos desde cotizaciones o ventas
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-neutral-400">Cargando…</p>}>
        <KitsManager />
      </Suspense>
    </div>
  );
}