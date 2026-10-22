import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getSnapshot, matchContext } from "@/lib/data/public";
import { formatDayLabel, formatTime } from "@/lib/time";
import { MatchView } from "./match-view";

export const metadata: Metadata = { title: "Тоглолт" };

async function MatchDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSnapshot();
  const match = s.matches.find((m) => m.id === id);
  if (!match) notFound();

  // Only the two teams are needed client-side (bracket advancement brings a server refresh)
  const teams = Object.fromEntries(
    s.teams.filter((t) => t.id === match.team1Id || t.id === match.team2Id).map((t) => [t.id, t]),
  );
  const when = match.scheduledAt ? `${formatDayLabel(match.scheduledAt)}, ${formatTime(match.scheduledAt)}` : undefined;
  return <MatchView match={match} teams={teams} context={matchContext(s, match)} when={when} />;
}

export default function MatchPage({ params }: PageProps<"/matches/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      }
    >
      <MatchDetail params={params} />
    </Suspense>
  );
}
