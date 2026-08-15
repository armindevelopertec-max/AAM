export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
};

export type SafeUser = Omit<User, "password">;

type Session = {
  userId: string;
};

const USERS_KEY = "auth_users";
const SESSION_KEY = "auth_session";

let currentUser: SafeUser | null | undefined;

function readUsers(): User[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(USERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as User[];
  } catch {
    return [];
  }
}

function writeUsers(users: User[]) {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function toSafe(user: User): SafeUser {
  return { id: user.id, name: user.name, email: user.email };
}

function computeCurrentUser(): SafeUser | null {
  const session = readSession();
  if (!session) return null;
  const user = readUsers().find((u) => u.id === session.userId);
  if (!user) return null;
  return toSafe(user);
}

const listeners = new Set<() => void>();

export function subscribeAuth(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAuthSnapshot(): SafeUser | null {
  if (currentUser === undefined) {
    currentUser = computeCurrentUser();
  }
  return currentUser;
}

function setCurrentUser(user: SafeUser | null) {
  currentUser = user;
  listeners.forEach((listener) => listener());
}

export function signUp(input: { name: string; email: string; password: string }) {
  const users = readUsers();
  const existing = users.find((u) => u.email.toLowerCase() === input.email.toLowerCase());
  if (existing) {
    throw new Error("Ya existe una cuenta con este email");
  }
  const user: User = {
    id: crypto.randomUUID(),
    name: input.name,
    email: input.email,
    password: input.password,
  };
  writeUsers([...users, user]);
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
  setCurrentUser(toSafe(user));
  return getAuthSnapshot();
}

export function signIn(input: { email: string; password: string }) {
  const user = readUsers().find(
    (u) => u.email.toLowerCase() === input.email.toLowerCase() && u.password === input.password
  );
  if (!user) {
    throw new Error("Email o contraseña incorrectos");
  }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
  setCurrentUser(toSafe(user));
  return getAuthSnapshot();
}

export function signOut() {
  window.localStorage.removeItem(SESSION_KEY);
  setCurrentUser(null);
}
