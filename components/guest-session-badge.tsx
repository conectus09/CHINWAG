"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getUserProfile, type UserProfile } from "@/lib/user-profile";

export function GuestSessionBadge() {
  const { isLoggedIn, session } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    setProfile(getUserProfile());
  }, []);

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