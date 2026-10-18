"use client";

import { useEffect, useState } from "react";
import {
  getAuditoria,
  type AuditActor,
  type AuditEntry,
} from "../lib/api";

const actionLabels: Record<string, string> = {
  "venta.creada": "Venta creada",
  "cotizacion.creada": "Cotización creada",
  "cotizacion.convertida": "Cotización convertida en venta",
  "usuario.creado": "Usuario creado",
  "usuario.editado": "Usuario editado",
  "usuario.eliminado": "Usuario eliminado",
  "producto.creado": "Producto creado",
  "producto.editado": "Producto editado",
  "producto.eliminado": "Producto eliminado",
  "kit.creado": "Kit creado",
  "kit.editado": "Kit editado",
  "kit.eliminado": "Kit eliminado",
  "catalogo.precio": "Precio del catálogo actualizado",
  "catalogo.nombre": "Nombre del catálogo actualizado",
  "catalogo.manual.creado": "Producto agregado al catálogo",
  "catalogo.cctv.creado": "Producto CCTV creado",
  "catalogo.cctv.editado": "Producto CCTV editado",
  "catalogo.cctv.eliminado": "Producto CCTV eliminado",
};

const groupLabels: Record<string, string> = {
  "": "Todas las acciones",
  venta: "Ventas",
  cotizacion: "Cotizaciones",
  usuario: "Usuarios",
  producto: "Productos (POS)",
  kit: "Kits",
  catalogo: "Catálogo",
};

const PAGE_SIZE = 50;

function formatFecha(value: string): string {
  try {
    return new Date(value).toLocaleString("es-BO", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function Detalle({ details }: { details: string | null }) {
  if (!details) return <span className="text-neutral-400">—</span>;
  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    const texto = Object.entries(parsed)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(" · ");
    return <span className="break-words">{texto || "—"}</span>;
  } catch {
    return <span className="break-words">{details}</span>;
  }
}

const selectClass =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800";

export default function AuditoriaManager() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [actors, setActors] = useState<AuditActor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actorId, setActorId] = useState("");
  const [group, setGroup] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await getAuditoria({
          page,
          limit: PAGE_SIZE,
          ...(actorId ? { actorId } : {}),
          ...(group ? { action: group } : {}),
        });
        if (!active) return;
        setEntries(result.items);
        setActors(result.actors);
        setTotal(result.total);
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [page, actorId, group]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={actorId}
          onChange={(e) => {
            setActorId(e.target.value);
            setPage(1);
          }}
          className={selectClass}
          aria-label="Filtrar por usuario"
        >
          <option value="">Todos los usuarios</option>
          {actors.map((a) => (
            <option key={a.actorId ?? a.actorName} value={a.actorId ?? ""}>
              {a.actorName}
            </option>
          ))}
        </select>
        <select
          value={group}
          onChange={(e) => {
            setGroup(e.target.value);
            setPage(1);
          }}
          className={selectClass}
          aria-label="Filtrar por tipo de acción"
        >
          {Object.entries(groupLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {total > 0 && (
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {total} registro{total === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-neutral-500 dark:text-neutral-400">Cargando…</p>
      ) : error ? (
        <p className="text-red-600 dark:text-red-400">{error}</p>
      ) : entries.length === 0 ? (
        <p className="text-neutral-500 dark:text-neutral-400">
          No hay registros de auditoría todavía.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-500 dark:text-neutral-400">
                    {formatFecha(e.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium">
                    {e.actorName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {actionLabels[e.action] ?? e.action}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                    <Detalle details={e.details} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm transition hover:border-neutral-400 disabled:opacity-40 dark:border-neutral-700 dark:hover:border-neutral-500"
          >
            Anterior
          </button>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm transition hover:border-neutral-400 disabled:opacity-40 dark:border-neutral-700 dark:hover:border-neutral-500"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
