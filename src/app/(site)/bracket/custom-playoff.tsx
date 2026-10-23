import { SiteSection } from "@/components/site/section";
import { MatchCard } from "@/components/tournament/match-card";
import { StandingsTable } from "@/components/tournament/standings-table";
import { matchContext, teamLookup, type Snapshot } from "@/lib/data/public";
import { STAGE_KIND_HINTS, STAGE_KIND_LABELS } from "@/lib/labels";
import { customLayout, slotSource, sourcePlaceholder } from "@/lib/tournament/custom-playoff";
import { ChampionBanner } from "./round-robin-playoff";

/** Playoff built by the admin: stages in order, each a knockout round or a round-robin table. */
export function CustomPlayoff({ s }: { s: Snapshot }) {
  const teams = teamLookup(s);
  const playoff = s.matches.filter((m) => m.stage === "playoff");
  const layout = customLayout(s.settings.playoffStages ?? [], playoff);
  const shown = layout.stages.filter((st) => st.matches.length > 0);

  // Champion: winner of a one-match last stage, or the top of a finished round-robin table
  const last = shown.at(-1);
  const lastDone = last && last.matches.every((m) => m.status === "finished");
  const championId = !lastDone
    ? undefined
    : last.stage.kind === "round_robin"
      ? s.stageStandings[last.stage.key]?.[0]?.teamId
      : last.matches.length === 1
        ? last.matches[0].winnerId
        : undefined;
  const champion = championId ? teams[championId] : undefined;

  return (
    <div className="space-y-10">
      {champion && <ChampionBanner team={champion} />}

      {shown.map(({ stage, matches }) => {
        const table = s.stageStandings[stage.key] ?? [];
        return (
          <SiteSection key={stage.key} id={`stage-${stage.key}`} title={stage.name}>
            <p className="text-sm text-muted-foreground">
              {STAGE_KIND_LABELS[stage.kind]} — {STAGE_KIND_HINTS[stage.kind]}
            </p>
            {stage.kind === "round_robin" && table.length > 0 && (
              <StandingsTable rows={table} teams={teams} qualify={stage.qualify ?? 0} caption={`${stage.name} — байр`} />
            )}
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {matches.map((m) => (
                <li key={m.id}>
                  <MatchCard
                    match={m}
                    team1={m.team1Id ? teams[m.team1Id] : undefined}
                    team2={m.team2Id ? teams[m.team2Id] : undefined}
                    context={`${layout.codes[m.id]} · ${matchContext(s, m)}`}
                    placeholders={[
                      sourcePlaceholder(slotSource(playoff, m, 1), layout.codes),
                      sourcePlaceholder(slotSource(playoff, m, 2), layout.codes),
                    ]}
                  />
                </li>
              ))}
            </ul>
          </SiteSection>
        );
      })}
    </div>
  );
}
