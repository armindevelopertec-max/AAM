"use client";

import Link from "next/link";
import { useTheme } from "../../components/ThemeProvider";
import { useEffect, useState } from "react";

export default function PublicNavbar() {
  const { preference, cycle } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const labels: Record<string, string> = {
    light: "Modo claro",
    dark: "Modo oscuro",
    system: "Automático",
  };

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-xl font-bold" onClick={() => setMounted(true)}>
          SEGTECAM
        </Link>
        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/login"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500"
          >
            Acceso Administradores
          </Link>
          <ThemeToggle mounted={mounted} preference={preference} cycle={cycle} labels={labels} />
        </div>
        <button
          className="md:hidden"
          onClick={() => {}}
          aria-label="Menú"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </nav>
    </header>
  );
}

function ThemeToggle({ mounted, preference, cycle, labels }: {
  mounted: boolean;
  preference: string;
  cycle: () => void;
  labels: Record<string, string>;
}) {
  return (
    <button
      onClick={cycle}
      title={mounted ? `Tema: ${labels[preference]}. Clic para cambiar.` : "Cambiar tema"}
      aria-label="Cambiar tema"
      className="rounded-md border border-neutral-300 p-1.5 text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:text-white"
    >
      {(!mounted || preference === "light") && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
      {mounted && preference === "dark" && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
      {mounted && preference === "system" && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      )}
    </button>
  );
}