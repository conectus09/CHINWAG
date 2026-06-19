import { clearAuthSession, readAuthSession } from "./auth-client";

export const AUTH_CHANGE_EVENT = "chinwag-auth-change";

export function isLoggedIn(): boolean {
  return readAuthSession() !== null;
}

export function setLoggedIn(loggedIn: boolean) {
  if (!loggedIn) {
    clearAuthSession();
  }
}

export function readAuthLoggedIn() {
  return isLoggedIn();
}

export function subscribeAuth(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(AUTH_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(AUTH_CHANGE_EVENT, callback);
  };
}