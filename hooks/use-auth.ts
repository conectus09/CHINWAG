"use client";

import { useSyncExternalStore } from "react";
import { readAuthSession } from "@/lib/auth-client";
import { readAuthLoggedIn, subscribeAuth } from "@/lib/auth-session";

export function useAuth() {
  const isLoggedIn = useSyncExternalStore(
    subscribeAuth,
    readAuthLoggedIn,
    () => false,
  );

  const session = useSyncExternalStore(
    subscribeAuth,
    readAuthSession,
    () => null,
  );

  return { isLoggedIn, session };
}