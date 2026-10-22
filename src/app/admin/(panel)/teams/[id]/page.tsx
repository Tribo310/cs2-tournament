import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/admin/page-header";
import { TeamLogo } from "@/components/tournament/team-logo";
import { updateTeam } from "@/lib/actions/teams";
import { requireAdmin } from "@/lib/auth/session";
import { getTeam } from "@/lib/data/queries";
import { TeamForm } from "../team-form";
import { DeleteTeamButton, Roster } from "./roster";

export const metadata: Metadata = { title: "Баг засах" };

async function Content({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) notFound();

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <TeamLogo team={team} size={36} />
            {team.name}
          </span>
        }
        back={{ href: "/admin/teams", label: "Багууд" }}
        actions={<DeleteTeamButton teamId={team.id} teamName={team.name} />}
      />
      <div className="space-y-6">
        <TeamForm team={team} action={updateTeam.bind(null, team.id)} />
        <Roster team={team} />
      </div>
    </>
  );
}

export default function TeamPage({ params }: PageProps<"/admin/teams/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
