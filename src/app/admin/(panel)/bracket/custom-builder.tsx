import { Trash2Icon } from "lucide-react";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { Section } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { deleteBracket } from "@/lib/actions/bracket";
import { StandingsTable } from "@/components/tournament/standings-table";
import type { Match, Settings, Team } from "@/lib/data/dto";
import { customLayout, encodeSource, feedsInto, slotSource, sourcePlaceholder } from "@/lib/tournament/custom-playoff";
import type { StandingRow } from "@/lib/tournament/standings";
import {
  AddMatchButton,
  AddStageForm,
  RoundRobinForm,
  StageHeader,
  StageMatchRow,
  type BuilderRow,
  type SourceGroups,
  type SourceOption,
} from "./custom-forms";

/** Admin builder for the "custom" playoff type: stages, their matches and the slot wiring. */
export function CustomBuilder({
  settings,
  teams,
  playoff,
  places,
  stageStandings,
}: {
  settings: Settings;
  teams: Team[];
  playoff: Match[];
  places: Map<string, string>; // team id → "A1"
  stageStandings: Record<string, StandingRow[]>;
}) {
  const stages = settings.playoffStages ?? [];
  const layout = customLayout(stages, playoff);
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]));
  const stageName = new Map(stages.map((s) => [s.key, s.name]));

  // Group places first (A1, A2, B1…), then teams outside the groups
  const sorted = [...teams].sort(
    (a, b) => (places.get(a.id) ?? "~").localeCompare(places.get(b.id) ?? "~") || a.name.localeCompare(b.name),
  );
  const teamOptions: SourceOption[] = sorted.map((t) => ({
    value: encodeSource({ kind: "team", teamId: t.id }),
    label: `${places.get(t.id) ? `${places.get(t.id)} · ` : ""}${t.name} (${t.tag})`,
  }));

  const slotLabel = (m: Match, slot: 1 | 2) => {
    const teamId = slot === 1 ? m.team1Id : m.team2Id;
    if (teamId) return teamMap[teamId]?.tag ?? "?";
    return sourcePlaceholder(slotSource(playoff, m, slot), layout.codes) ?? "TBD";
  };
  const describe = (m: Match) => `${slotLabel(m, 1)} vs ${slotLabel(m, 2)}`;

  // Options for one row: every other match that does not already depend on this one
  const optionsFor = (self?: Match): SourceGroups => ({
    teams: teamOptions,
    matches: playoff
      .filter((m) => !self || (m.id !== self.id && !feedsInto(playoff, self.id, m.id)))
      .sort((a, b) => Number(layout.codes[a.id]?.slice(1)) - Number(layout.codes[b.id]?.slice(1)))
      .flatMap((m) => {
        const where = `${layout.codes[m.id]} · ${stageName.get(m.stageKey ?? "") ?? "Шатгүй"}: ${describe(m)}`;
        return [
          { value: encodeSource({ kind: "winner", matchId: m.id }), label: `${where} — ялагч` },
          { value: encodeSource({ kind: "loser", matchId: m.id }), label: `${where} — ялагдагч` },
        ];
      }),
  });

  const row = (m: Match): BuilderRow => ({
    id: m.id,
    code: layout.codes[m.id],
    stageKey: m.stageKey && stageName.has(m.stageKey) ? m.stageKey : "",
    status: m.status,
    score: m.status === "scheduled" ? undefined : `${m.team1Score}:${m.team2Score}`,
    teams: describe(m),
    format: m.format,
    label: m.label ?? "",
    source1: encodeSource(slotSource(playoff, m, 1)),
    source2: encodeSource(slotSource(playoff, m, 2)),
    options: optionsFor(m),
  });

  return (
    <div className="space-y-4">
      <Section
        title="Хэрхэн ажилладаг"
        actions={
          playoff.length > 0 && (
            <ConfirmAction
              title="Плей-оффын бүх тоглолтыг устгах уу?"
              description="Бүх плей-оффын тоглолт, оноо бүрмөсөн устна. Шатууд үлдэнэ. Энэ үйлдлийг буцаах боломжгүй."
              action={deleteBracket}
              trigger={
                <Button variant="outline" size="sm" className="text-destructive">
                  <Trash2Icon aria-hidden /> Бүх тоглолтыг устгах
                </Button>
              }
            />
          )
        }
      >
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Шат нэмж, төрлийг нь сонгоно: «Шууд хасагдах» (ялагдсан баг хасагдана) эсвэл «Тойргийн» (бүгд хоорондоо тоглож хүснэгтээр эрэмбэлэгдэнэ).</li>
          <li>Тоглолт бүрийн байрыг баг эсвэл өмнөх тоглолтын ялагч/ялагдагчаар бөглөнө. Ялагч автоматаар дараагийн тоглолтод орно.</li>
          <li>Сүүлийн шатны ялагч (эсвэл тойргийн хүснэгтийн 1-р байр) аварга болно.</li>
        </ol>
      </Section>

      {layout.stages.map(({ stage, matches }, i) => (
        <section key={stage.key} className="space-y-3 rounded-md border bg-card p-4 md:p-5" aria-label={stage.name}>
          <StageHeader stage={stage} index={i} total={stages.length} matchCount={matches.length} />
          {stage.kind === "round_robin" && (stageStandings[stage.key]?.length ?? 0) > 0 && (
            <StandingsTable
              rows={stageStandings[stage.key]}
              teams={teamMap}
              qualify={stage.qualify ?? 0}
              caption={`${stage.name} — байр`}
            />
          )}
          {matches.length > 0 ? (
            <ol className="space-y-2">
              {matches.map((m) => (
                <StageMatchRow key={m.id} row={row(m)} stages={stages} />
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">Тоглолт алга.</p>
          )}
          {stage.kind === "round_robin" && matches.length === 0 && (
            <RoundRobinForm stageKey={stage.key} options={optionsFor()} />
          )}
          <div className="flex justify-end">
            <AddMatchButton stageKey={stage.key} />
          </div>
        </section>
      ))}

      {layout.orphans.length > 0 && (
        <Section title="Шатанд хамаараагүй тоглолтууд">
          <p className="text-sm text-muted-foreground">
            Өмнөх шатнаас үлдсэн тоглолтууд. Шат сонгож хадгалбал тэр шатанд орно. Холбоосууд нь хэвээр үлдэнэ.
          </p>
          <ol className="space-y-2">
            {layout.orphans.map((m) => (
              <StageMatchRow key={m.id} row={row(m)} stages={stages} />
            ))}
          </ol>
        </Section>
      )}

      <Section title="Шат нэмэх">
        <AddStageForm />
      </Section>
    </div>
  );
}
