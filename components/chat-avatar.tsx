import Image from "next/image";
import { APP_LOGO_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

const RING_COLORS = [
  "ring-emerald-400/80",
  "ring-sky-400/80",
  "ring-violet-400/80",
  "ring-amber-400/80",
  "ring-rose-400/80",
  "ring-cyan-400/80",
] as const;

function ringForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i) * (i + 1)) % RING_COLORS.length;
  }
  return RING_COLORS[hash];
}

interface ChatAvatarProps {
  userId: string;
  label: string;
  size?: "sm" | "md" | "lg";
  online?: boolean;
  className?: string;
}

const SIZES = {
  sm: { box: "h-10 w-10", image: 40, ring: "ring-2" },
  md: { box: "h-16 w-16 sm:h-20 sm:w-20", image: 80, ring: "ring-[3px]" },
  lg: { box: "h-24 w-24 sm:h-28 sm:w-28", image: 112, ring: "ring-4" },
} as const;

export function ChatAvatar({
  userId,
  label,
  size = "md",
  online = false,
  className,
}: ChatAvatarProps) {
  const { box, image, ring } = SIZES[size];

  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl bg-card shadow-md",
          ring,
          ringForId(userId),
          box,
        )}
      >
        <Image
          src={APP_LOGO_URL}
          alt={`${label} avatar`}
          width={image}
          height={image}
          className="h-full w-full object-cover"
        />
      </div>
      {online && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-emerald-400"
          aria-hidden
        />
      )}
    </div>
  );
}