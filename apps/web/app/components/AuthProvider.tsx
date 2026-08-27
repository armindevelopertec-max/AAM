"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  getAuthSnapshot,
  signIn as doSignIn,
  signOut as doSignOut,
  subscribeAuth,
  verifySession,
  type SafeUser,
} from "../lib/auth";

type AuthContextValue = {
  user: SafeUser | null;
  loading: boolean;
  login: (input: { email: string; password: string }) => Promise<SafeUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const user = useSyncExternalStore(subscribeAuth, getAuthSnapshot, () => null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void verifySession().finally(() => setLoading(false));
  }, []);

  const login = useCallback((input: { email: string; password: string }) => {
    return doSignIn(input);
  }, []);

  const logout = useCallback(() => {
    doSignOut();
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
