import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth/session";
import { getSettings, listGroups, listMatches, listTeams } from "@/lib/data/queries";
import { CreateGroupForm, GroupCard } from "./group-card";

export const metadata: Metadata = { title: "Группүүд" };

async function Content() {
  await requireAdmin();
  const [groups, teams, matches, settings] = await Promise.all([
    listGroups(),
    listTeams(),
    listMatches({ stage: "group" }),
    getSettings(),
  ]);

  const grouped = new Set(groups.flatMap((g) => g.teams.map((t) => t.teamId)));
  const available = teams.filter((t) => !grouped.has(t.id));

  return (
    <div className="space-y-4">
      <CreateGroupForm suggestedName={`Групп ${String.fromCharCode(65 + groups.length)}`} />
      {groups.length === 0 && (
        <div className="rounded-md border border-dashed p-10 text-center text-muted-foreground">
          Групп үүсгээгүй байна.
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => {
          const groupMatches = matches
            .filter((m) => m.groupId === group.id)
            .map((m) => ({ team1Id: m.team1Id, team2Id: m.team2Id, status: m.status }));
          return (
            <GroupCard
              key={group.id}
              group={group}
              teams={teams.filter((t) => group.teams.some((g) => g.teamId === t.id))}
              available={available}
              matches={groupMatches}
              defaultFormat={settings.defaultGroupFormat}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function GroupsPage() {
  return (
    <>
      <PageHeader
        title="Группүүд"
        description="Баг бүр зөвхөн нэг группт байна. Тоглолт бүрийн хосыг болон цагийг админ сонгож нэмнэ."
      />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}
