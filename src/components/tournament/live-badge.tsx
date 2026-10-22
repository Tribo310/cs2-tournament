import { cn } from "@/lib/utils";

export function LiveBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm bg-live px-2 py-0.5 font-heading text-xs font-bold tracking-wider text-white uppercase",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-white animate-live" />
      Шууд
    </span>
  );
}
