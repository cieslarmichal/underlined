import { cn } from '@/lib/utils';

interface Props {
  className?: string;
}

// Same artwork as the favicon and the app icon. Decorative: the app name is always rendered next to it.
export default function Logo({ className }: Props) {
  return (
    <img
      src="/favicon.svg"
      alt=""
      className={cn('size-9 rounded-md', className)}
    />
  );
}
