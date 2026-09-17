"use client";

import { useEffect, useState } from "react";
import {
  createClient,
  createUser,
  deleteClient,
  deleteUser,
  getClients,
  getUsers,
  updateClient,
  updateUser,
  USER_ROLES,
  type Client,
  type SystemUser,
  type UserRole,
} from "../lib/api";
import { useAuth } from "./AuthProvider";

const inputClass =
  "rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800";
const labelClass = "text-sm text-neutral-600 dark:text-neutral-400";

const roleLabels: Record<UserRole, string> = {
  admin: "Administrador",
  ventas: "Ventas",
};

type Tab = "usuarios" | "clientes";

export default function UsersManager() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [tab, setTab] = useState<Tab>(isAdmin ? "usuarios" : "clientes");
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userModal, setUserModal] = useState<
    | { mode: "create" }
    | { mode: "edit"; user: SystemUser }
    | null
  >(null);
  const [clientModal, setClientModal] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [u, c] = isAdmin
          ? await Promise.all([getUsers(), getClients()])
          : [null, await getClients()];
        if (!active) return;
        if (u) setUsers(u);
        setClients(c);
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
  }, [isAdmin]);

  function switchTab(next: Tab) {
    setTab(next);
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => switchTab("usuarios")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                tab === "usuarios"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "border border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              Usuarios del sistema
            </button>
          )}
          <button
            type="button"
            onClick={() => switchTab("clientes")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              tab === "clientes"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "border border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            Clientes
          </button>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {tab === "usuarios"
            ? "Personas que inician sesión en el sistema para operar la tienda, con su rol y contraseña."
            : "Compradores registrados de la tienda. No tienen acceso al sistema."}
        </p>
      </div>

      {loading ? (
        <p className="text-neutral-500 dark:text-neutral-400">Cargando…</p>
      ) : error ? (
        <p className="text-red-600 dark:text-red-400">{error}</p>
      ) : tab === "usuarios" ? (
        <UsuariosSection
          users={users}
          isAdmin={isAdmin}
          modal={userModal}
          setModal={setUserModal}
          onUsersChange={setUsers}
          onError={setError}
        />
      ) : (
        <ClientesSection
          clients={clients}
          modal={clientModal}
          setModal={setClientModal}
          onClientsChange={setClients}
          onError={setError}
        />
      )}
    </div>
  );
}

function UsuariosSection(props: {
  users: SystemUser[];
  isAdmin: boolean;
  modal: { mode: "create" } | { mode: "edit"; user: SystemUser } | null;
  setModal: (m: { mode: "create" } | { mode: "edit"; user: SystemUser } | null) => void;
  onUsersChange: (users: SystemUser[]) => void;
  onError: (e: string | null) => void;
}) {
  const { users, isAdmin, modal, setModal, onUsersChange, onError } = props;

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold">Usuarios del sistema</h3>
        <button
          onClick={() => setModal({ mode: "create" })}
          className="rounded-md bg-neutral-900 px-4 py-2 text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Agregar usuario
        </button>
      </div>

      {modal && (
        <UserModal
          modal={modal}
          onClose={() => setModal(null)}
          onSaved={(next) => {
            onUsersChange(next);
            setModal(null);
          }}
          onError={onError}
        />
      )}

      {users.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          No hay usuarios del sistema.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 pr-4 font-medium">ID</th>
                <th className="py-2 pr-4 font-medium">Nombre</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">Rol</th>
                <th className="py-2 pr-4 font-medium">WhatsApp</th>
                <th className="py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                >
                  <td className="py-3 pr-4 text-neutral-500 dark:text-neutral-400">{u.id}</td>
                  <td className="py-3 pr-4">{u.name}</td>
                  <td className="py-3 pr-4">{u.email}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.role === "admin"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                      }`}
                    >
                      {roleLabels[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="py-3 pr-4">{u.phone || "—"}</td>
                  <td className="py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setModal({ mode: "edit", user: u })}
                        className="text-neutral-600 transition hover:text-neutral-400 dark:text-neutral-400"
                      >
                        Editar
                      </button>
                      {isAdmin && (
                        <button
                          onClick={async () => {
                            if (
                              !window.confirm(
                                `¿Eliminar al usuario "${u.name}"?`,
                              )
                            )
                              return;
                            try {
                              await deleteUser(u.id);
                              onUsersChange(await getUsers());
                            } catch (err) {
                              onError(
                                err instanceof Error ? err.message : "Error desconocido",
                              );
                            }
                          }}
                          className="text-red-600 transition hover:text-red-400 dark:text-red-400"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function UserModal(props: {
  modal: { mode: "create" } | { mode: "edit"; user: SystemUser };
  onClose: () => void;
  onSaved: (users: SystemUser[]) => void;
  onError: (e: string | null) => void;
}) {
  const { modal, onClose, onSaved, onError } = props;
  const editing = modal.mode === "edit" ? modal.user : null;

  const [name, setName] = useState(editing?.name ?? "");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [role, setRole] = useState<UserRole>(editing?.role ?? "ventas");
  const [alias, setAlias] = useState(editing?.alias ?? "");
  const [phone, setPhone] = useState(editing?.phone ?? "");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    setSubmitting(true);
    try {
      if (editing) {
        await updateUser(editing.id, {
          name: name.trim(),
          email: email.trim(),
          role,
          alias: alias.trim() || undefined,
          phone: phone.trim() || undefined,
          ...(password ? { password } : {}),
        });
      } else {
        await createUser({
          name: name.trim(),
          email: email.trim(),
          role,
          alias: alias.trim() || undefined,
          phone: phone.trim() || undefined,
          password,
        });
      }
      onSaved(await getUsers());
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">
          {editing ? "Editar usuario" : "Agregar usuario"}
        </h2>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="user-name" className={labelClass}>
              Nombre *
            </label>
            <input
              id="user-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="user-email" className={labelClass}>
              Email *
            </label>
            <input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="user-role" className={labelClass}>
              Rol *
            </label>
            <select
              id="user-role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className={inputClass}
            >
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="user-password" className={labelClass}>
              Contraseña {editing ? "(dejar vacío = no cambiar)" : "*"}
            </label>
            <input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              {...(!editing ? { required: true } : {})}
              minLength={6}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="user-alias" className={labelClass}>
              Alias
            </label>
            <input
              id="user-alias"
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="user-phone" className={labelClass}>
              WhatsApp
            </label>
            <input
              id="user-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-3 sm:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-neutral-300 px-4 py-2 text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-neutral-900 px-4 py-2 text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {submitting ? "Guardando…" : editing ? "Guardar" : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClientesSection(props: {
  clients: Client[];
  modal: boolean;
  setModal: (v: boolean) => void;
  onClientsChange: (clients: Client[]) => void;
  onError: (e: string | null) => void;
}) {
  const { clients, modal, setModal, onClientsChange, onError } = props;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [ci, setCi] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCi, setEditCi] = useState("");

  function openModal() {
    onError(null);
    setName("");
    setEmail("");
    setPhone("");
    setCi("");
    setModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    setSubmitting(true);
    try {
      await createClient({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        ci: ci.trim() || undefined,
      });
      setModal(false);
      onClientsChange(await getClients());
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error desconocido");
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

  async function handleSave(id: string) {
    onError(null);
    try {
      await updateClient(id, {
        name: editName,
        email: editEmail,
        phone: editPhone,
        ci: editCi || undefined,
      });
      setEditingId(null);
      onClientsChange(await getClients());
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  async function handleDelete(id: string) {
    onError(null);
    try {
      await deleteClient(id);
      onClientsChange(await getClients());
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold">Clientes de la tienda</h3>
        <button
          onClick={openModal}
          className="rounded-md bg-neutral-900 px-4 py-2 text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Agregar cliente
        </button>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold">Agregar cliente</h2>
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="client-name" className={labelClass}>
                  Nombre *
                </label>
                <input
                  id="client-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="client-email" className={labelClass}>
                  Email
                </label>
                <input
                  id="client-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="client-phone" className={labelClass}>
                  Teléfono
                </label>
                <input
                  id="client-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="client-ci" className={labelClass}>
                  CI
                </label>
                <input
                  id="client-ci"
                  type="text"
                  value={ci}
                  onChange={(e) => setCi(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex justify-end gap-3 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setModal(false)}
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

      {clients.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          No hay clientes.</p>
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
                <tr
                  key={client.id}
                  className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                >
                  <td className="py-3 pr-4 text-neutral-500 dark:text-neutral-400">
                    {client.id}
                  </td>
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
  );
}