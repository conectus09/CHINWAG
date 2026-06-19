"use client";

const EMOJIS = ["😀", "😂", "😍", "🔥", "👍", "👋", "🎮", "🎵", "💬", "🙌", "😎", "🤔"];

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
}

export function EmojiPicker({ onPick }: EmojiPickerProps) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-2">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onPick(emoji)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-card-hover"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}