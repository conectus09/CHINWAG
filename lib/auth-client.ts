import type { AuthSession } from "./platform-types";

const TOKEN_KEY = "chinwag-auth-token";
const SESSION_KEY = "chinwag-auth-session";

export function saveAuthSession(session: AuthSession) {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("chinwag-auth-change"));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("chinwag-auth-change"));
}

export function readAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (session.expiresAt <= Date.now()) {
      clearAuthSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function readAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}