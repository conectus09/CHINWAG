"use client";

import { nanoid } from "nanoid";

const STORAGE_KEY = "chinwag-live-id";

/** One id per browser — multiple tabs share it so 1 user = 1 online. */
export function getLivePresenceId(): string {
  if (typeof window === "undefined") return "";

  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = `live-${nanoid(14)}`;
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return `live-${nanoid(14)}`;
  }
}