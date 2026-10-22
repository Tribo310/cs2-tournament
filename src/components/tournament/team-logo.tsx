import Image from "next/image";
import { cn } from "@/lib/utils";

export function TeamLogo({
  team,
  size = 28,
  className,
}: {
  team?: { name: string; tag: string; logoUrl?: string } | null;
  size?: number;
  className?: string;
}) {
  const box = cn("shrink-0 rounded-sm", className);
  if (!team) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className={cn(box, "border border-dashed border-border bg-muted/40")}
      />
    );
  }
  if (team.logoUrl) {
    return (
      <Image
        src={team.logoUrl}
        alt=""
        width={size}
        height={size}
        // Logos are tiny and already cached immutably by /api/logos
        unoptimized
        className={cn(box, "object-contain")}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.32) }}
      className={cn(box, "grid place-items-center bg-muted font-heading font-bold text-muted-foreground")}
    >
      {team.tag.slice(0, 4)}
    </span>
  );
}
