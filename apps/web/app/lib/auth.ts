export type SafeUser = {
  id: number;
  name: string;
  email: string;
  storeId: number;
  role: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

let currentUser: SafeUser | null | undefined;

const listeners = new Set<() => void>();

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function readUser(): SafeUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SafeUser;
  } catch {
    return null;
  }
}

function writeSession(token: string, user: SafeUser) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

function notify() {
  listeners.forEach((listener) => listener());
}

function setUser(user: SafeUser | null) {
  currentUser = user;
  notify();
}

export function getToken(): string | null {
  return readToken();
}

export function subscribeAuth(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAuthSnapshot(): SafeUser | null {
  if (currentUser === undefined) {
    currentUser = readUser();
  }
  return currentUser;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message = Array.isArray(data?.message)
      ? data.message.join(", ")
      : data?.message ?? res.statusText;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function signIn(input: { email: string; password: string }) {
  const { token, user } = await apiPost<{ token: string; user: SafeUser }>(
    "/auth/login",
    input,
  );
  writeSession(token, user);
  setUser(user);
  return user;
}

export function signOut() {
  clearSession();
  setUser(null);
}

export async function verifySession(): Promise<SafeUser | null> {
  const token = readToken();
  if (!token) {
    setUser(null);
    return null;
  }
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Sesión inválida");
    const user = (await res.json()) as SafeUser;
    writeSession(token, user);
    setUser(user);
    return user;
  } catch {
    clearSession();
    setUser(null);
    return null;
  }
}
