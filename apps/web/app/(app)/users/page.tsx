"use client";

import UsersManager from "../../components/UsersManager";

export default function UsersPage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold">Usuarios</h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          Usuarios del sistema (con acceso) y clientes de la tienda, sin mezclarlos.
        </p>
      </header>
      <UsersManager />
    </div>
  );
}