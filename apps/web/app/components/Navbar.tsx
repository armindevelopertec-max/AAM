"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/products", label: "Productos" },
  { href: "/clients", label: "Clientes" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-bold" onClick={() => setOpen(false)}>
            MiApp
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={active
                    ? "font-medium text-neutral-900 dark:text-white"
                    : "text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="hidden items-center gap-4 md:flex">
          {user && <span className="text-sm text-neutral-600 dark:text-neutral-400">{user.name}</span>}
          <button
            onClick={logout}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm transition hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500"
          >
            Cerrar sesión
          </button>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden"
          aria-label="Abrir menú"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? (
              <>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </>
            ) : (
              <>
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </>
            )}
          </svg>
        </button>
      </nav>
      {open && (
        <div className="border-t border-neutral-200 px-6 py-4 md:hidden dark:border-neutral-800">
          <div className="flex flex-col gap-3">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={active
                    ? "font-medium text-neutral-900 dark:text-white"
                    : "text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="mt-2 flex flex-col gap-3 border-t border-neutral-200 pt-3 dark:border-neutral-800">
              {user && <span className="text-sm text-neutral-600 dark:text-neutral-400">{user.name}</span>}
              <button
                onClick={logout}
                className="w-fit rounded-md border border-neutral-300 px-3 py-1.5 text-sm transition hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
