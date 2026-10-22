import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/admin/page-header";
import { TeamLogo } from "@/components/tournament/team-logo";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/session";
import { listTeams } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Багууд" };

async function TeamList() {
  await requireAdmin();
  const teams = await listTeams();

  if (teams.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center text-muted-foreground">
        Одоогоор баг бүртгэгдээгүй байна.
      </div>
    );
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => {
        const starters = team.players.filter((p) => p.role === "player").length;
        return (
          <li key={team.id}>
            <Link
              href={`/admin/teams/${team.id}`}
              className="flex items-center gap-3 rounded-md border bg-card p-3 transition-colors hover:border-primary/60"
            >
              <TeamLogo team={team} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{team.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {team.tag}
                  {team.city && ` · ${team.city}`}
                </p>
              </div>
              <span
                className={`tabular text-xs ${starters === 5 ? "text-muted-foreground" : "text-side-t"}`}
                title="Үндсэн тоглогчид"
              >
                {starters}/5
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
      <PageHeader
        title="Багууд"
        actions={
          <Button asChild>
            <Link href="/admin/teams/new">
              <PlusIcon aria-hidden />
              Шинэ баг
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <TeamList />
      </Suspense>
    </>
  );
}
