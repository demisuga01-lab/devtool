export type StatusUser = {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
};

const TOKEN_KEY = "status-token";
const USER_KEY = "status-user";
const AUTH_EVENT = "status-auth-changed";

function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function notifyAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

export function getToken(): string | null {
  if (!hasStorage()) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): StatusUser | null {
  if (!hasStorage()) return null;
  const user = localStorage.getItem(USER_KEY);
  if (!user) return null;
  try {
    return JSON.parse(user) as StatusUser;
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: StatusUser): void {
  if (!hasStorage()) return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyAuthChanged();
}

export function clearAuth(): void {
  if (!hasStorage()) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notifyAuthChanged();
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const authChangedEvent = AUTH_EVENT;
