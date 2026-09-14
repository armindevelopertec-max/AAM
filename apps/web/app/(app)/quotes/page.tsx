"use client";

import QuotesManager from "../../components/QuotesManager";

export default function QuotesPage() {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-3xl font-bold">Cotizaciones</h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          Arma cotizaciones y conviértelas en ventas
        </p>
      </header>
      <QuotesManager />
    </div>
  );
}