import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/admin/page-header";
import { updateMatchDetails } from "@/lib/actions/matches";
import { requireAdmin } from "@/lib/auth/session";
import { getMatch, getSettings, listGroups, listMatches, listTeams } from "@/lib/data/queries";
import { matchContext } from "@/lib/tournament/context";
import { MatchForm } from "../match-form";
import { DeleteMatchButton } from "./delete-match";
import { MatchControl } from "./match-control";

export const metadata: Metadata = { title: "Тоглолт удирдах" };

async function Content({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [match, teams, groups, settings, allMatches] = await Promise.all([
    getMatch(id),
    listTeams(),
    listGroups(),
    getSettings(),
    listMatches({ stage: "playoff" }),
  ]);
  if (!match) notFound();

  const team1 = teams.find((t) => t.id === match.team1Id);
  const team2 = teams.find((t) => t.id === match.team2Id);
  const context = matchContext({ settings, groups, matches: allMatches }, match);

  return (
    <>
      <PageHeader
        title={`${team1?.tag ?? "TBD"} vs ${team2?.tag ?? "TBD"}`}
        description={context}
        back={{ href: "/admin/matches", label: "Тоглолтууд" }}
        actions={match.stage === "group" && <DeleteMatchButton matchId={match.id} />}
      />
      <div className="space-y-6">
        <MatchControl initial={match} team1={team1} team2={team2} />
        <MatchForm
          match={match}
          groups={groups}
          teams={teams}
          settings={settings}
          action={updateMatchDetails.bind(null, match.id)}
        />
      </div>
    </>
  );
}

export default function MatchPage({ params }: PageProps<"/admin/matches/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
