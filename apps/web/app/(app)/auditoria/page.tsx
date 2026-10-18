"use client";

import AuditoriaManager from "../../components/AuditoriaManager";

export default function AuditoriaPage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold">Auditoría</h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          Historial de acciones del sistema: quién realizó cada venta,
          cotización o cambio en productos, kits, catálogo y usuarios.
        </p>
      </header>
      <AuditoriaManager />
    </div>
  );
}
