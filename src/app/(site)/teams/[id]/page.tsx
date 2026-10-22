import { ChevronLeftIcon, MapPinIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EmptyState, SiteSection } from "@/components/site/section";
import { MatchCard } from "@/components/tournament/match-card";
import { TeamLogo } from "@/components/tournament/team-logo";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getSnapshot, matchContext, teamLookup } from "@/lib/data/public";
import { ROLE_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Баг" };

async function TeamDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSnapshot();
  const teams = teamLookup(s);
  const team = teams[id];
  if (!team) notFound();

  const group = s.groups.find((g) => g.teams.some((t) => t.teamId === id));
  const rank = group ? (s.standings[group.id] ?? []).findIndex((r) => r.teamId === id) + 1 : 0;
  const row = group ? s.standings[group.id]?.find((r) => r.teamId === id) : undefined;

  const matches = s.matches.filter((m) => m.team1Id === id || m.team2Id === id);
  const live = matches.filter((m) => m.status === "live");
  const upcoming = matches.filter((m) => m.status === "scheduled");
  const finished = matches.filter((m) => m.status === "finished").reverse();
  const wins = finished.filter((m) => m.winnerId === id).length;

  const order = ["player", "sub", "coach"] as const;
  const roster = [...team.players].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role) || a.sortOrder - b.sortOrder);

  const card = (m: (typeof matches)[number]) => (
    <li key={m.id}>
      <MatchCard
        match={m}
        team1={m.team1Id ? teams[m.team1Id] : undefined}
        team2={m.team2Id ? teams[m.team2Id] : undefined}
        context={matchContext(s, m)}
      />
    </li>
  );

  return (
    <div className="space-y-8">
      <Link href="/teams" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeftIcon className="size-4" aria-hidden />
        Багууд
      </Link>

      <header className="cut-corner flex flex-wrap items-center gap-5 rounded-md border bg-card p-5 md:p-8">
        <TeamLogo team={team} size={88} className="size-20 md:size-22" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-heading text-sm font-bold tracking-widest text-primary">{team.tag}</p>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-4xl">{team.name}</h1>
          {(team.city || team.country) && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPinIcon className="size-4" aria-hidden />
              {[team.city, team.country].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <dl className="grid w-full grid-cols-3 gap-2 text-center sm:w-auto">
          <div className="rounded-md bg-muted px-3 py-2">
            <dt className="text-xs text-muted-foreground">Хожил</dt>
            <dd className="tabular font-heading text-xl font-bold text-win">{wins}</dd>
          </div>
          <div className="rounded-md bg-muted px-3 py-2">
            <dt className="text-xs text-muted-foreground">Хожигдол</dt>
            <dd className="tabular font-heading text-xl font-bold text-destructive">{finished.length - wins}</dd>
          </div>
          <div className="rounded-md bg-muted px-3 py-2">
            <dt className="text-xs text-muted-foreground">{group ? group.name : "Групп"}</dt>
            <dd className="tabular font-heading text-xl font-bold">{rank ? `#${rank}` : "—"}</dd>
          </div>
        </dl>
      </header>

      {row && group && (
        <p className="text-sm text-muted-foreground">
          <Link href={`/groups#group-${group.id}`} className="text-foreground underline-offset-4 hover:underline">
            {group.name}
          </Link>
          : {row.points} оноо · карт {row.mapsWon}-{row.mapsLost} · раунд {row.roundsWon}-{row.roundsLost}
        </p>
      )}

      <SiteSection id="roster" title="Бүрэлдэхүүн">
        {roster.length ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {roster.map((p) => (
              <li key={p.id} className="flex min-h-14 items-center gap-3 rounded-md border bg-card px-4 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading font-bold">{p.nickname}</p>
                  {p.fullName && <p className="truncate text-xs text-muted-foreground">{p.fullName}</p>}
                </div>
                {p.role !== "player" && <Badge variant="outline">{ROLE_LABELS[p.role]}</Badge>}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>Бүрэлдэхүүн оруулаагүй байна.</EmptyState>
        )}
      </SiteSection>

      {(live.length > 0 || upcoming.length > 0) && (
        <SiteSection id="next" title="Дараагийн тоглолтууд">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[...live, ...upcoming].map(card)}</ul>
        </SiteSection>
      )}

      <SiteSection id="history" title="Тоглолтын түүх">
        {finished.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{finished.map(card)}</ul>
        ) : (
          <EmptyState>Дууссан тоглолт алга.</EmptyState>
        )}
      </SiteSection>
    </div>
  );
}

export default function TeamPage({ params }: PageProps<"/teams/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      <TeamDetail params={params} />
    </Suspense>
  );
}
