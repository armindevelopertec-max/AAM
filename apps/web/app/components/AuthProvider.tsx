"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import {
  getAuthSnapshot,
  signIn as doSignIn,
  signOut as doSignOut,
  signUp as doSignUp,
  subscribeAuth,
  type SafeUser,
} from "../lib/auth";

type AuthContextValue = {
  user: SafeUser | null;
  login: (input: { email: string; password: string }) => void;
  register: (input: { name: string; email: string; password: string }) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const user = useSyncExternalStore(subscribeAuth, getAuthSnapshot, () => null);

  const login = useCallback((input: { email: string; password: string }) => {
    doSignIn(input);
  }, []);

  const register = useCallback((input: { name: string; email: string; password: string }) => {
    doSignUp(input);
  }, []);

  const logout = useCallback(() => {
    doSignOut();
  }, []);

  const value = useMemo(() => ({ user, login, register, logout }), [user, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
