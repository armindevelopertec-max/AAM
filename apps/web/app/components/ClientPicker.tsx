"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient, type Client } from "../lib/api";

type ClientPickerProps = {
  clients: Client[];
  value: Client | null;
  onChange: (client: Client | null) => void;
  onClientCreated?: (client: Client) => void;
};

const inputClass =
  "rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800";

export default function ClientPicker({
  clients,
  value,
  onChange,
  onClientCreated,
}: ClientPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [ci, setCi] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(needle) ||
        (client.email ?? "").toLowerCase().includes(needle) ||
        (client.phone ?? "").toLowerCase().includes(needle) ||
        (client.ci ?? "").toLowerCase().includes(needle),
    );
  }, [query, clients]);

  const noMatch = query.trim().length > 0 && filtered.length === 0;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function select(client: Client | null) {
    onChange(client);
    setOpen(false);
    setQuery("");
    setError(null);
  }

  function openCreate() {
    setQuery("");
    setError(null);
    setCreating(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const client = await createClient({
        name,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        ci: ci.trim() || undefined,
      });
      onClientCreated?.(client);
      onChange(client);
      setCreating(false);
      setOpen(false);
      setName("");
      setEmail("");
      setPhone("");
      setCi("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${inputClass} flex w-full items-center justify-between gap-2 text-left`}
      >
        <span className="truncate">{value ? `👤 ${value.name}` : "👤 Cliente general"}</span>
        <span className="text-neutral-400 dark:text-neutral-500" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full min-w-64 rounded-md border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <div className="border-b border-neutral-100 p-2 dark:border-neutral-800">
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, correo, CI o WhatsApp…"
              className={`${inputClass} w-full`}
            />
          </div>
          <ul className="max-h-60 overflow-y-auto p-1" role="listbox">
            <li>
              <button
                type="button"
                onClick={() => select(null)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                👤 Cliente general
              </button>
            </li>
            {filtered.map((client) => (
              <li key={client.id}>
                <button
                  type="button"
                  onClick={() => select(client)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span className="truncate">{client.name}</span>
                  <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
                    {client.email || client.phone || client.ci || ""}
                  </span>
                </button>
              </li>
            ))}
            {noMatch && (
              <li className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">
                No encontramos este cliente.
              </li>
            )}
            <li className="border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={openCreate}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-blue-600 transition hover:bg-neutral-100 dark:text-blue-400 dark:hover:bg-neutral-800"
              >
                ➕ Nuevo cliente
              </button>
            </li>
          </ul>
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
          >
            <h3 className="mb-4 text-lg font-semibold">Nuevo cliente</h3>
            <div className="grid gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre *"
                required
                autoFocus
                className={inputClass}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo"
                className={inputClass}
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="WhatsApp"
                className={inputClass}
              />
              <input
                type="text"
                value={ci}
                onChange={(e) => setCi(e.target.value)}
                placeholder="CI"
                className={inputClass}
              />
            </div>
            {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-md px-4 py-2 text-sm text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                {saving ? "Creando…" : "Crear"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}