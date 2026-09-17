"use client";

import { getPublicStoreInfo, type PublicStoreInfo } from "../../lib/api";
import { useEffect, useState } from "react";

export default function CompanyInfo() {
  const [store, setStore] = useState<PublicStoreInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getPublicStoreInfo()
      .then((result) => {
        if (active) setStore(result);
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-16 animate-pulse">
        <div className="h-8 bg-neutral-200 rounded w-1/4 dark:bg-neutral-800 mb-4" />
        <div className="h-4 bg-neutral-200 rounded w-1/2 dark:bg-neutral-800" />
        <div className="h-4 bg-neutral-200 rounded w-1/3 dark:bg-neutral-800 mt-2" />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold">Quiénes Somos</h2>
          <p className="mt-4 text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {store?.description ?? "SEGTECAM es una empresa boliviana especializada en la distribución e instalación de sistemas de seguridad electrónica, CCTV, control de acceso y soluciones de networking. Con años de experiencia en el mercado, ofrecemos productos de calidad y servicio técnico especializado para proyectos residenciales, comerciales e industriales."}
          </p>
          {store?.subtitle && (
            <p className="mt-4 text-lg font-medium text-neutral-700 dark:text-neutral-300">
              {store.subtitle}
            </p>
          )}
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-lg font-semibold">Información de Contacto</h3>
            <div className="mt-4 space-y-3 text-neutral-600 dark:text-neutral-400">
              {store?.phone && (
                <div className="flex items-center gap-3">
                  <span className="text-xl">📞</span>
                  <span>{store.phone}</span>
                </div>
              )}
              {store?.email && (
                <div className="flex items-center gap-3">
                  <span className="text-xl">✉️</span>
                  <span>{store.email}</span>
                </div>
              )}
              {store?.address && (
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-1">📍</span>
                  <span>{store.address}</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-lg font-semibold">Horarios de Atención</h3>
            <div className="mt-4 space-y-2 text-neutral-600 dark:text-neutral-400">
              <div className="flex justify-between">
                <span>Lunes - Viernes</span>
                <span className="font-medium">08:00 - 18:00</span>
              </div>
              <div className="flex justify-between">
                <span>Sábados</span>
                <span className="font-medium">09:00 - 13:00</span>
              </div>
              <div className="flex justify-between">
                <span>Domingos</span>
                <span className="font-medium">Cerrado</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-lg font-semibold">Servicios Principales</h3>
            <ul className="mt-4 space-y-2 text-neutral-600 dark:text-neutral-400">
              <li className="flex items-center gap-2">✓ Venta e instalación de sistemas CCTV</li>
              <li className="flex items-center gap-2">✓ Control de acceso y asistencia</li>
              <li className="flex items-center gap-2">✓ Networking y cableado estructurado</li>
              <li className="flex items-center gap-2">✓ Mantenimiento y soporte técnico</li>
              <li className="flex items-center gap-2">✓ Asesoramiento personalizado</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}