"use client";

import { UserRound } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getUserProfile } from "@/lib/user-profile";

export function GuestSessionBadge() {
  const { isLoggedIn, session } = useAuth();
  const profile = getUserProfile();

  if (isLoggedIn && session) {
    return (
      <span className="guest-badge guest-badge-member">
        <UserRound className="h-3 w-3" />
        {session.name}
      </span>
    );
  }

  if (!profile) return null;

  return (
    <span className="guest-badge">
      <UserRound className="h-3 w-3" />
      Guest · {profile.name}
    </span>
  );
}