import type { Metadata } from "next";
import { Suspense } from "react";
import { CardGridSkeleton, EmptyState, PageTitle } from "@/components/site/section";
import { MatchCard } from "@/components/tournament/match-card";
import { StandingsLegend, StandingsTable } from "@/components/tournament/standings-table";
import { getSnapshot, matchContext, teamLookup } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Группийн шат",
  description: "Группийн байр, оноо болон тоглолтын үр дүн.",
};

async function Groups() {
  const s = await getSnapshot();
  const teams = teamLookup(s);

  if (s.groups.length === 0) return <EmptyState>Группүүд хараахан тодорхойлогдоогүй байна.</EmptyState>;

  return (
    <div className="space-y-10">
      {s.groups.length > 1 && (
        <nav aria-label="Группүүд" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          {s.groups.map((g) => (
            <a
              key={g.id}
              href={`#group-${g.id}`}
              className="flex h-9 shrink-0 items-center rounded-full border px-4 text-sm transition-colors hover:border-primary/60 hover:text-primary"
            >
              {g.name}
            </a>
          ))}
        </nav>
      )}

      {s.groups.map((g) => {
        const matches = s.matches.filter((m) => m.stage === "group" && m.groupId === g.id);
        const live = matches.filter((m) => m.status === "live");
        const rest = matches.filter((m) => m.status !== "live");
        const done = matches.filter((m) => m.status === "finished").length;
        return (
          <section key={g.id} id={`group-${g.id}`} aria-labelledby={`h-${g.id}`} className="scroll-mt-20 space-y-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={`h-${g.id}`} className="text-xl font-extrabold">
                {g.name}
              </h2>
              <span className="tabular text-xs text-muted-foreground">
                {done}/{matches.length} тоглолт дууссан
              </span>
            </div>
            <StandingsTable
              rows={s.standings[g.id] ?? []}
              teams={teams}
              qualify={s.settings.teamsAdvancePerGroup}
              caption={`${g.name} — байр`}
            />
            <StandingsLegend qualify={s.settings.teamsAdvancePerGroup} />
            {matches.length > 0 && (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[...live, ...rest].map((m) => (
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
            )}
          </section>
        );
      })}
    </div>
  );
}

export default function GroupsPage() {
  return (
    <>
      <PageTitle title="Группийн шат" description="Байр автоматаар тооцогдоно: оноо → картын зөрүү → раундын зөрүү → хоорондын тоглолт." />
      <Suspense fallback={<CardGridSkeleton />}>
        <Groups />
      </Suspense>
    </>
  );
}
