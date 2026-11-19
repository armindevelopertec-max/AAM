import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "./components/AuthProvider";
import { ThemeProvider } from "./components/ThemeProvider";

// Fuentes Geist variables (wght 100-900) servidas desde el repo.
// Se usa next/font/local en vez de next/font/google porque el build
// necesita descargar las fuentes de Google y el servidor de produccion
// no tiene salida a fonts.gstatic.com (build falla con ETIMEDOUT).
const geistSans = localFont({
  variable: "--font-geist-sans",
  src: "./fonts/geist-latin.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

const geistMono = localFont({
  variable: "--font-geist-mono",
  src: "./fonts/geist-mono-latin.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SEGTECAM",
  description: "SEGTECAM - Sistema de gestión",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeInitScript = `(function(){
  try {
    var pref = localStorage.getItem("aam-theme");
    if (pref !== "light" && pref !== "dark" && pref !== "system") pref = "system";
    var resolved = pref;
    if (pref === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    if (resolved === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  } catch (e) {}
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col overflow-x-clip">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
