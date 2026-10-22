import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MatchRow } from "@/components/admin/match-row";
import { PageHeader, PageSkeleton } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/session";
import type { Match } from "@/lib/data/dto";
import { getSettings, listGroups, listMatches, listTeams } from "@/lib/data/queries";
import { MATCH_STATUSES } from "@/lib/db/types";
import { matchContext } from "@/lib/tournament/context";
import { MatchFilters } from "./filters";

export const metadata: Metadata = { title: "Тоглолтууд" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Content({ searchParams }: { searchParams: PageProps<"/admin/matches">["searchParams"] }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = one(sp.status);
  const stage = one(sp.stage);
  const groupId = one(sp.group);

  const [allMatches, teams, groups, settings] = await Promise.all([listMatches(), listTeams(), listGroups(), getSettings()]);
  const statusFilter = MATCH_STATUSES.find((s) => s === status);
  const matches = allMatches.filter(
    (m) =>
      (!statusFilter || m.status === statusFilter) &&
      (stage !== "group" && stage !== "playoff" ? true : m.stage === stage) &&
      (!groupId || m.groupId === groupId),
  );
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const context = (m: Match) => matchContext({ settings, groups, matches: allMatches }, m);

  // Live first, then by schedule (already sorted by the query)
  const ordered = [...matches.filter((m) => m.status === "live"), ...matches.filter((m) => m.status !== "live")];

  return (
    <div className="space-y-4">
      <Suspense>
        <MatchFilters groups={groups} />
      </Suspense>
      {ordered.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center text-muted-foreground">
          Тоглолт олдсонгүй.
        </div>
      ) : (
        <ul className="space-y-2">
          {ordered.map((m) => (
            <li key={m.id}>
              <MatchRow match={m} teams={teamMap} context={context(m)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MatchesPage({ searchParams }: PageProps<"/admin/matches">) {
  return (
    <>
      <PageHeader
        title="Тоглолтууд"
        actions={
          <Button asChild>
            <Link href="/admin/matches/new">
              <PlusIcon aria-hidden />
              Шинэ тоглолт
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}
