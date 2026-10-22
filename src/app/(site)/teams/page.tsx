import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CardGridSkeleton, EmptyState, PageTitle } from "@/components/site/section";
import { TeamLogo } from "@/components/tournament/team-logo";
import { getSnapshot } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Багууд",
  description: "Тэмцээнд оролцож буй багууд, тоглогчид.",
};

async function TeamGrid() {
  const s = await getSnapshot();
  if (s.teams.length === 0) return <EmptyState>Баг бүртгэгдээгүй байна.</EmptyState>;

  const groupOf = new Map(s.groups.flatMap((g) => g.teams.map((t) => [t.teamId, g.name] as const)));
  const record = (teamId: string) => {
    const done = s.matches.filter((m) => m.status === "finished" && (m.team1Id === teamId || m.team2Id === teamId));
    const wins = done.filter((m) => m.winnerId === teamId).length;
    return { wins, losses: done.length - wins };
  };

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {s.teams.map((team) => {
        const { wins, losses } = record(team.id);
        return (
          <li key={team.id}>
            <Link
              href={`/teams/${team.id}`}
              className="flex items-center gap-4 rounded-md border bg-card p-4 transition-colors hover:border-primary/60"
            >
              <TeamLogo team={team} size={48} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-lg font-bold">{team.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {[team.tag, groupOf.get(team.id), team.city].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className="tabular shrink-0 text-sm" aria-label={`${wins} хожил, ${losses} хожигдол`}>
                <span className="text-win">{wins}</span>
                <span className="text-muted-foreground">–</span>
                <span className="text-destructive">{losses}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function TeamsPage() {
  return (
    <>
      <PageTitle title="Багууд" />
      <Suspense fallback={<CardGridSkeleton count={6} />}>
        <TeamGrid />
      </Suspense>
    </>
  );
}
