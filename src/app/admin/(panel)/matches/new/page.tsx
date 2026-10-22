import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/admin/page-header";
import { createMatch } from "@/lib/actions/matches";
import { requireAdmin } from "@/lib/auth/session";
import { getSettings, listGroups, listTeams } from "@/lib/data/queries";
import { MatchForm } from "../match-form";

export const metadata: Metadata = { title: "Шинэ тоглолт" };

async function Content() {
  await requireAdmin();
  const [groups, teams, settings] = await Promise.all([listGroups(), listTeams(), getSettings()]);
  return <MatchForm groups={groups} teams={teams} settings={settings} action={createMatch} />;
}

export default function NewMatchPage() {
  return (
    <>
      <PageHeader
        title="Шинэ тоглолт"
        description="Группийн тоглолт. Плей-оффын тоглолтууд шатнаас автоматаар үүснэ."
        back={{ href: "/admin/matches", label: "Тоглолтууд" }}
      />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}
