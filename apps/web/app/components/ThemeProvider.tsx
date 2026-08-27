"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "aam-theme";

function getStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

function resolveTheme(pref: ThemePreference): "light" | "dark" {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return pref;
}

function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.setAttribute("data-theme", "dark");
  } else {
    root.removeAttribute("data-theme");
  }
}

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: "light" | "dark";
  setPreference: (pref: ThemePreference) => void;
  cycle: () => void;
};

const ORDER: ThemePreference[] = ["light", "dark", "system"];

const ThemeContext = createContext<ThemeContextValue | null>(null);

function usePrefersDark(): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    () => getStoredPreference(),
  );
  const prefersDark = usePrefersDark();

  useLayoutEffect(() => {
    applyTheme(resolveTheme(preference));
  }, [preference]);

  useEffect(() => {
    if (preference === "system") {
      applyTheme(resolveTheme("system"));
    }
  }, [prefersDark, preference]);

  const setPreference = useCallback((pref: ThemePreference) => {
    window.localStorage.setItem(STORAGE_KEY, pref);
    setPreferenceState(pref);
  }, []);

  const cycle = useCallback(() => {
    const idx = ORDER.indexOf(preference);
    const next = ORDER[(idx + 1) % ORDER.length];
    setPreference(next);
  }, [preference, setPreference]);

  const resolved = useMemo(
    () => (preference === "system" ? (prefersDark ? "dark" : "light") : preference),
    [preference, prefersDark],
  );

  const value = useMemo(
    () => ({ preference, resolved, setPreference, cycle }),
    [preference, resolved, setPreference, cycle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  }
  return ctx;
}
