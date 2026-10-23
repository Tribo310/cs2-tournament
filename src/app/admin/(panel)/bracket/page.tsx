import { TriangleAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader, PageSkeleton, Section } from "@/components/admin/page-header";
import { BracketSection } from "@/components/tournament/bracket";
import { StandingsTable } from "@/components/tournament/standings-table";
import { requireAdmin } from "@/lib/auth/session";
import type { Match } from "@/lib/data/dto";
import {
  getFinalStandings,
  getGroupStandings,
  getSettings,
  getStageStandings,
  listGroups,
  listMatches,
  listTeams,
} from "@/lib/data/queries";
import { BRACKET_TYPE_LABELS } from "@/lib/labels";
import { suggestFirstRound } from "@/lib/tournament/bracket-plan";
import { matchContext, ROUND_NAMES } from "@/lib/tournament/context";
import { BracketControls, type SeedOption } from "./bracket-controls";
import { CustomBuilder } from "./custom-builder";

export const metadata: Metadata = { title: "Плей-офф" };

async function Content() {
  await requireAdmin();
  const [settings, teams, groups, matches, standings, finalStandings, stageStandings] = await Promise.all([
    getSettings(),
    listTeams(),
    listGroups(),
    listMatches(),
    getGroupStandings(),
    getFinalStandings(),
    getStageStandings(),
  ]);
  const roundRobinFinal = settings.bracketType === "knockout_rr";

  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]));
  const groupMatches = matches.filter((m) => m.stage === "group");
  const unfinished = groupMatches.filter((m) => m.status !== "finished").length;
  const playoff = matches.filter((m) => m.stage === "playoff");
  const started = playoff.some((m) => m.status !== "scheduled");

  // Optional suggestion (filled only when the admin asks), based on group standings
  const ordered = groups.map((g) => (standings[g.id] ?? []).map((r) => r.teamId));
  const suggestion = suggestFirstRound(ordered, settings.teamsAdvancePerGroup, settings.bracketSize);
  const placeOf = new Map<string, string>();
  groups.forEach((g, gi) =>
    ordered[gi].forEach((teamId, place) => placeOf.set(teamId, `${g.name.replace(/^Групп\s*/, "")}${place + 1}`)),
  );
  const qualified = groups.length * settings.teamsAdvancePerGroup;
  const custom = settings.bracketType === "custom";

  const summary = (
    <Section title="Тохиргоо">
      <p className="text-sm">
        {BRACKET_TYPE_LABELS[settings.bracketType]}
        {!custom && ` · ${settings.bracketSize} баг`} · групп бүрээс {settings.teamsAdvancePerGroup} баг шалгарна.{" "}
        <Link href="/admin/settings" className="text-primary underline-offset-4 hover:underline">
          Өөрчлөх
        </Link>
      </p>
      {!custom && qualified !== settings.bracketSize && groups.length > 0 && (
        <Warning>
          Группээс шалгарах багийн тоо ({groups.length}×{settings.teamsAdvancePerGroup} = {qualified}) плей-оффын хэмжээтэй (
          {settings.bracketSize}) таарахгүй байна. Үлдсэн байрыг гараар сонгоно уу.
        </Warning>
      )}
      {unfinished > 0 && (
        <Warning>Группийн {unfinished} тоглолт дуусаагүй байна — байр өөрчлөгдөж болзошгүй.</Warning>
      )}
    </Section>
  );

  if (custom) {
    return (
      <div className="space-y-4">
        {summary}
        <CustomBuilder settings={settings} teams={teams} playoff={playoff} places={placeOf} stageStandings={stageStandings} />
      </div>
    );
  }

  const options: SeedOption[] = teams.map((t) => ({ id: t.id, label: `${t.name} (${t.tag})`, place: placeOf.get(t.id) }));
  // The form starts from the current first round (or empty): the admin chooses every matchup
  const firstRound = playoff.filter((m) => m.bracket === "upper" && m.round === 1);
  const current = Array.from({ length: settings.bracketSize / 2 }, (_, p) => {
    const m = firstRound.find((x) => x.position === p + 1);
    return [m?.team1Id ?? "", m?.team2Id ?? ""] as [string, string];
  });

  const upper = playoff.filter((m) => m.bracket === "upper");
  const lower = playoff.filter((m) => m.bracket === "lower");
  const final = playoff.filter((m) => m.bracket === "final");
  const lastUpper = Math.max(0, ...upper.map((m) => m.round ?? 1));
  const title = (m: Match) => matchContext({ settings, groups, matches }, m);
  const sections = roundRobinFinal
    ? [
        { name: "Шигшээ тойрог", list: upper, label: () => "Шигшээ тойрог" },
        { name: "Финалын тойрог", list: final, label: () => "Финалын тойрог" },
      ].filter((s) => s.list.length)
    : [
    {
      name: settings.bracketType === "double" ? "Дээд шат" : "Шат",
      list: upper,
      label: (r: number) =>
        settings.bracketType === "double" && r === lastUpper
          ? "Дээд шатны финал"
          : (ROUND_NAMES[2 ** (lastUpper - r)] ?? `${r}-р тойрог`),
    },
    { name: "Доод шат", list: lower, label: (r: number) => `${r}-р тойрог` },
    { name: "Гранд финал", list: final, label: () => "Гранд финал" },
  ].filter((s) => s.list.length);

  return (
    <div className="space-y-4">
      {summary}

      <BracketControls
        options={options}
        current={current}
        suggestion={suggestion}
        hasBracket={playoff.length > 0}
        started={started}
        finalFormatLabel={roundRobinFinal ? "Финалын тойргийн формат" : "Финалын формат"}
        finalFormatDefault={roundRobinFinal ? "bo3" : "bo5"}
      />

      {sections.map((s) => (
        <Section key={s.name} title={s.name}>
          {roundRobinFinal && s.list === final && finalStandings.length > 0 && (
            <StandingsTable rows={finalStandings} teams={teamMap} qualify={1} caption="Финалын тойргийн байр" />
          )}
          <BracketSection matches={s.list} teams={teamMap} matchTitle={title} roundLabel={s.label} hrefBase="/admin/matches/" />
        </Section>
      ))}
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 rounded-md border border-side-t/40 bg-side-t/10 px-3 py-2 text-sm">
      <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-side-t" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export default function BracketAdminPage() {
  return (
    <>
      <PageHeader
        title="Плей-офф"
        description="Плей-оффын бүтцийг админ тодорхойлно. Тоглолт дуусахад ялагч (холбосон бол ялагдагч ч бас) дараагийн тоглолтод автоматаар шилжинэ."
      />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}
