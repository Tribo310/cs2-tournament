import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LiveProvider } from "@/components/live/live-provider";
import { LiveStatus } from "@/components/live/live-status";
import { BottomNav, DesktopNav } from "@/components/site/nav";
import { getSnapshot } from "@/lib/data/public";

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getSnapshot();
  return {
    // absolute: the root layout's generic template must not wrap the tournament name
    title: { absolute: settings.name, template: `%s · ${settings.name}` },
    description:
      settings.description ??
      `${settings.name} — хуваарь, үр дүн, групп болон плей-оффын шат.`,
  };
}

async function TournamentName() {
  const { settings } = await getSnapshot();
  return <>{settings.name}</>;
}

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <LiveProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4 md:px-6">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-2 font-heading font-extrabold tracking-tight"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-sm bg-primary text-xs text-primary-foreground cut-corner">
                CS2
              </span>
              <span className="truncate">
                <Suspense fallback="CS2 Тэмцээн">
                  <TournamentName />
                </Suspense>
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-4">
              <Suspense fallback={null}>
                <DesktopNav />
              </Suspense>
              <LiveStatus />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 md:px-6 md:pb-12">
          {children}
        </main>

        <footer className="hidden border-t py-6 text-center text-xs text-muted-foreground md:block">
          Counter-Strike 2 тэмцээний албан ёсны үр дүн
        </footer>

        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
      </div>
    </LiveProvider>
  );
}
