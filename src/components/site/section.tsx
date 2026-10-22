import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function SiteSection({
  title,
  href,
  linkLabel = "Бүгд",
  children,
  id,
}: {
  title: ReactNode;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="flex items-center gap-2 font-heading text-sm font-bold tracking-widest text-muted-foreground uppercase">
          {title}
        </h2>
        {href && (
          <Link href={href} className="flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground">
            {linkLabel}
            <ChevronRightIcon className="size-4" aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function PageTitle({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="mb-6 space-y-1">
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{children}</div>
  );
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Ачаалж байна">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  );
}
