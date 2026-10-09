"use client";

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎",
  "🤔", "😅", "😢", "😡", "🙏", "👏", "👍", "👎",
  "❤️", "🔥", "✨", "🎉", "💯", "✅", "❌", "⭐",
  "💬", "📷", "🎵", "📎", "💰", "🤝", "🏠", "🌍",
];

export function ChatEmojiPicker({
  label,
  onPick,
}: {
  label: string;
  onPick: (emoji: string) => void;
}) {
  return (
    <div
      className="mb-2 grid grid-cols-8 gap-1 rounded-2xl bg-surface p-2 shadow-lift ring-1 ring-ink/[0.08]"
      role="listbox"
      aria-label={label}
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="rounded-lg py-1 text-xl hover:bg-brand-50"
          onClick={() => onPick(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
