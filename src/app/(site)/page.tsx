import { LayersIcon, TrophyIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CardGridSkeleton, EmptyState, SiteSection } from "@/components/site/section";
import { MatchCard } from "@/components/tournament/match-card";
import { getSnapshot, matchContext, teamLookup, type Snapshot } from "@/lib/data/public";
import type { Match } from "@/lib/data/dto";
import { formatDateRange } from "@/lib/time";

function MatchGrid({ s, matches }: { s: Snapshot; matches: Match[] }) {
  const teams = teamLookup(s);
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {matches.map((m) => (
        <li key={m.id}>
          <MatchCard
            match={m}
            team1={m.team1Id ? teams[m.team1Id] : undefined}
            team2={m.team2Id ? teams[m.team2Id] : undefined}
            context={matchContext(s, m)}
          />
        </li>
      ))}
    </ul>
  );
}

async function Hero() {
  const { settings } = await getSnapshot();
  const dates = formatDateRange(settings.startsOn, settings.endsOn);
  return (
    <div className="relative overflow-hidden rounded-md border bg-card px-5 py-6 md:px-8 md:py-10">
      {/* Thin tactical grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(var(--foreground)_1px,transparent_1px),linear-gradient(90deg,var(--foreground)_1px,transparent_1px)] [background-size:32px_32px]"
      />
      <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />
      <div className="relative space-y-2">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">Counter-Strike 2</p>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">{settings.name}</h1>
        {settings.description && <p className="max-w-2xl text-muted-foreground">{settings.description}</p>}
        {dates && <p className="tabular text-sm text-muted-foreground">{dates}</p>}
      </div>
    </div>
  );
}

async function Sections() {
  const s = await getSnapshot();
  const live = s.matches.filter((m) => m.status === "live");
  // Skip bracket slots where neither team is known yet
  const upcoming = s.matches.filter((m) => m.status === "scheduled" && (m.team1Id || m.team2Id)).slice(0, 6);
  const results = s.matches
    .filter((m) => m.status === "finished")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 6);

  return (
    <>
      {live.length > 0 && (
        <SiteSection
          id="live"
          title={
            <>
              <span className="size-2 rounded-full bg-live animate-live" aria-hidden />
              <span className="text-foreground">Шууд явагдаж буй</span>
            </>
          }
        >
          <MatchGrid s={s} matches={live} />
        </SiteSection>
      )}

      <SiteSection id="upcoming" title="Удахгүй болох" href="/schedule">
        {upcoming.length ? <MatchGrid s={s} matches={upcoming} /> : <EmptyState>Товлогдсон тоглолт алга.</EmptyState>}
      </SiteSection>

      <SiteSection id="results" title="Сүүлийн үр дүн" href="/schedule?status=finished">
        {results.length ? <MatchGrid s={s} matches={results} /> : <EmptyState>Дууссан тоглолт хараахан алга.</EmptyState>}
      </SiteSection>
    </>
  );
}

export default function HomePage() {
  return (
    <div className="space-y-8">
      <Suspense fallback={<div className="h-40 rounded-md border bg-card" />}>
        <Hero />
      </Suspense>

      <Suspense fallback={<CardGridSkeleton count={6} />}>
        <Sections />
      </Suspense>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { href: "/groups", icon: LayersIcon, title: "Группийн байр", text: "Оноо, картын болон раундын зөрүү" },
          { href: "/bracket", icon: TrophyIcon, title: "Плей-оффын шат", text: "Шигшээ тоглолтуудын зам" },
        ].map(({ href, icon: Icon, title, text }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 rounded-md border bg-card p-4 transition-colors hover:border-primary/60"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-md bg-muted text-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-heading font-bold">{title}</span>
              <span className="block text-sm text-muted-foreground">{text}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
