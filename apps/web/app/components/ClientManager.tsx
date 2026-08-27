"use client";

import { useState } from "react";
import {
  createClient,
  deleteClient,
  getClients,
  updateClient,
  type Client,
} from "../lib/api";

export default function ClientManager({ initialClients }: { initialClients: Client[] }) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [ci, setCi] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCi, setEditCi] = useState("");

  async function refresh() {
    setClients(await getClients());
  }

  function openModal() {
    setError(null);
    setName("");
    setEmail("");
    setPhone("");
    setCi("");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createClient({
        name,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        ci: ci.trim() || undefined,
      });
      setShowModal(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(client: Client) {
    setEditingId(client.id);
    setEditName(client.name);
    setEditEmail(client.email ?? "");
    setEditPhone(client.phone ?? "");
    setEditCi(client.ci ?? "");
  }

  async function handleSave(id: number) {
    setError(null);
    try {
      await updateClient(id, {
        name: editName,
        email: editEmail,
        phone: editPhone,
        ci: editCi,
      });
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  async function handleDelete(id: number) {
    setError(null);
    try {
      await deleteClient(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  const inputClass =
    "rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800";
  const labelClass = "text-sm text-neutral-600 dark:text-neutral-400";

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Clientes</h2>
        <button
          onClick={openModal}
          className="rounded-md bg-neutral-900 px-4 py-2 text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Agregar cliente
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div
            className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold">Agregar cliente</h2>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="name" className={labelClass}>
                  Nombre *
                </label>
                <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="phone" className={labelClass}>
                  Teléfono
                </label>
                <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="ci" className={labelClass}>
                  CI
                </label>
                <input id="ci" type="text" value={ci} onChange={(e) => setCi(e.target.value)} className={inputClass} />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-2">{error}</p>}
              <div className="flex justify-end gap-3 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-neutral-900 px-4 py-2 text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  {submitting ? "Guardando…" : "Agregar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        {clients.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No hay clientes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="py-2 pr-4 font-medium">ID</th>
                  <th className="py-2 pr-4 font-medium">Nombre</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Teléfono</th>
                  <th className="py-2 pr-4 font-medium">CI</th>
                  <th className="py-2 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                    <td className="py-3 pr-4 text-neutral-500 dark:text-neutral-400">{client.id}</td>
                    <td className="py-3 pr-4">
                      {editingId === client.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
                        />
                      ) : (
                        client.name
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {editingId === client.id ? (
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
                        />
                      ) : (
                        client.email || "—"
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {editingId === client.id ? (
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
                        />
                      ) : (
                        client.phone || "—"
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {editingId === client.id ? (
                        <input
                          type="text"
                          value={editCi}
                          onChange={(e) => setEditCi(e.target.value)}
                          className="w-full rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
                        />
                      ) : (
                        client.ci || "—"
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {editingId === client.id ? (
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => handleSave(client.id)}
                            className="text-green-600 transition hover:text-green-400 dark:text-green-400"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-neutral-600 transition hover:text-neutral-400 dark:text-neutral-400"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => startEdit(client)}
                            className="text-neutral-600 transition hover:text-neutral-400 dark:text-neutral-400"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(client.id)}
                            className="text-red-600 transition hover:text-red-400 dark:text-red-400"
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}