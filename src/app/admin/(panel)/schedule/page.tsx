import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, PageSkeleton, Section } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth/session";
import type { Match } from "@/lib/data/dto";
import { getSettings, listGroups, listMatches, listTeams } from "@/lib/data/queries";
import { matchContext } from "@/lib/tournament/context";
import { toLocalDateTimeInput } from "@/lib/time";
import { ScheduleRow, type ScheduleRowData, type TeamOption } from "./schedule-row";

export const metadata: Metadata = { title: "Хуваарь" };

const BRACKET_ORDER = { upper: 0, lower: 1, final: 2 } as const;

async function Content() {
  await requireAdmin();
  const [matches, teams, groups, settings] = await Promise.all([listMatches(), listTeams(), listGroups(), getSettings()]);

  const allTeams: TeamOption[] = teams.map((t) => ({ id: t.id, label: `${t.tag} · ${t.name}`, tag: t.tag }));
  const tagOf = new Map(teams.map((t) => [t.id, t.tag]));
  const row = (m: Match, options: TeamOption[]): ScheduleRowData => ({
    id: m.id,
    context: matchContext({ settings, groups, matches }, m),
    status: m.status,
    format: m.format,
    scheduledAt: toLocalDateTimeInput(m.scheduledAt),
    team1Id: m.team1Id ?? "",
    team2Id: m.team2Id ?? "",
    team1Tag: m.team1Id ? (tagOf.get(m.team1Id) ?? "?") : "TBD",
    team2Tag: m.team2Id ? (tagOf.get(m.team2Id) ?? "?") : "TBD",
    score: m.status === "scheduled" ? undefined : `${m.team1Score}:${m.team2Score}`,
    options,
  });

  const sections = groups.map((g) => {
    const options = allTeams.filter((t) => g.teams.some((gt) => gt.teamId === t.id));
    return {
      key: g.id,
      title: g.name,
      rows: matches.filter((m) => m.stage === "group" && m.groupId === g.id).map((m) => row(m, options)),
    };
  });
  // Custom playoffs follow the admin's stage order
  const stageIndex = (m: Match) => settings.playoffStages?.findIndex((st) => st.key === m.stageKey) ?? -1;
  const playoff = matches
    .filter((m) => m.stage === "playoff")
    .sort(
      (a, b) =>
        stageIndex(a) - stageIndex(b) ||
        BRACKET_ORDER[a.bracket ?? "upper"] - BRACKET_ORDER[b.bracket ?? "upper"] ||
        (a.round ?? 0) - (b.round ?? 0) ||
        (a.position ?? 0) - (b.position ?? 0),
    );
  sections.push({ key: "playoff", title: "Плей-офф", rows: playoff.map((m) => row(m, allTeams)) });

  const nonEmpty = sections.filter((s) => s.rows.length);
  if (nonEmpty.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center text-muted-foreground">
        Тоглолт алга. Группийн хэсгээс тоглолт нэмэх эсвэл плей-оффын шат үүсгэнэ үү.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {nonEmpty.map((s) => (
        <Section key={s.key} title={s.title}>
          <ul className="divide-y rounded-md border">
            {s.rows.map((r) => (
              <ScheduleRow key={r.id} row={r} />
            ))}
          </ul>
        </Section>
      ))}
    </div>
  );
}

export default function SchedulePage() {
  return (
    <>
      <PageHeader
        title="Хуваарь"
        description="Бүх тоглолтын цаг, формат, багийг нэг дороос засна. Цаг Улаанбаатарын цагаар. Эхэлсэн тоглолтын багийг солих боломжгүй."
      />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}
