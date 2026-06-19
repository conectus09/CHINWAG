"use client";

import { INTERESTS, LANGUAGES, MOODS, REGIONS } from "@/lib/platform-types";
import type { Interest, MatchPreferences } from "@/lib/platform-types";
import { cn } from "@/lib/utils";

interface MatchPreferencesPanelProps {
  value: MatchPreferences;
  onChange: (next: MatchPreferences) => void;
  compact?: boolean;
}

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
        active
          ? "border-sky-400/60 bg-sky-500/15 text-sky-100"
          : "border-border bg-card-hover text-muted hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

export function MatchPreferencesPanel({
  value,
  onChange,
  compact = false,
}: MatchPreferencesPanelProps) {
  const toggleInterest = (interest: Interest) => {
    const has = value.interests.includes(interest);
    onChange({
      ...value,
      interests: has
        ? value.interests.filter((item) => item !== interest)
        : [...value.interests, interest].slice(0, 5),
    });
  };

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Language</p>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((language) => (
            <Chip
              key={language}
              label={language}
              active={value.language === language}
              onClick={() => onChange({ ...value, language })}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Region</p>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((region) => (
            <Chip
              key={region}
              label={region}
              active={value.region === region}
              onClick={() => onChange({ ...value, region })}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Mood</p>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((mood) => (
            <Chip
              key={mood}
              label={mood}
              active={value.mood === mood}
              onClick={() => onChange({ ...value, mood })}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Interests</p>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((interest) => (
            <Chip
              key={interest}
              label={interest}
              active={value.interests.includes(interest)}
              onClick={() => toggleInterest(interest)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}