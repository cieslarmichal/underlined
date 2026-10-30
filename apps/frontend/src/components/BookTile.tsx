import { cn } from '@/lib/utils';

// Muted, paper-friendly tones. Each has enough contrast for the dark letter on top.
const tones = [
  'bg-[oklch(0.93_0.06_85)]',
  'bg-[oklch(0.92_0.05_150)]',
  'bg-[oklch(0.92_0.05_230)]',
  'bg-[oklch(0.92_0.06_20)]',
  'bg-[oklch(0.92_0.05_300)]',
  'bg-[oklch(0.93_0.04_60)]',
];

function toneFor(title: string): string {
  let hash = 0;

  for (const char of title) {
    hash = (hash * 31 + char.charCodeAt(0)) % 997;
  }

  return tones[hash % tones.length] ?? tones[0] ?? '';
}

interface Props {
  title: string;
  className?: string;
}

// A stand-in for a cover: the first letter of the title on a colour that is stable for that title.
export default function BookTile({ title, className }: Props) {
  const letter = title.trim().charAt(0).toUpperCase() || '?';

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-12 shrink-0 items-center justify-center rounded-lg font-serif text-2xl font-semibold text-foreground/80 shadow-xs ring-1 ring-black/5',
        toneFor(title),
        className,
      )}
    >
      {letter}
    </span>
  );
}
