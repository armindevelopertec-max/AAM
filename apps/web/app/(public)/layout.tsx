"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import PublicNavbar from "./components/PublicNavbar";
import { useAuth } from "../components/AuthProvider";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  // No se bloquea el render mientras `loading` es true: AuthProvider arranca
  // con loading=true, asi que devolver null aqui dejaba el HTML del sitio
  // publico vacio (sin <h1>, <nav>, <footer>...) hasta que hidrataba el
  // cliente. La redireccion de usuarios con sesion sigue siendo por effect.
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <PublicNavbar />
      <main className="flex w-full flex-1 flex-col">{children}</main>
      <footer className="border-t border-neutral-200 bg-white py-8 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
          © {new Date().getFullYear()} SEGTECAM. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}