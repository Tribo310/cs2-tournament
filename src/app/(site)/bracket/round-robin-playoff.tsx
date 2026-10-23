import { TrophyIcon } from "lucide-react";
import { SiteSection } from "@/components/site/section";
import { MatchCard } from "@/components/tournament/match-card";
import { StandingsTable } from "@/components/tournament/standings-table";
import { TeamLogo } from "@/components/tournament/team-logo";
import type { Match, Team } from "@/lib/data/dto";
import { matchContext, teamLookup, type Snapshot } from "@/lib/data/public";

export function ChampionBanner({ team }: { team: Team }) {
  return (
    <div className="cut-corner flex items-center gap-4 rounded-md border border-primary/60 bg-primary/10 p-5">
      <TrophyIcon className="size-8 shrink-0 text-primary" aria-hidden />
      <TeamLogo team={team} size={48} />
      <div>
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">Аварга</p>
        <p className="font-heading text-2xl font-extrabold">{team.name}</p>
      </div>
    </div>
  );
}

/** Playoff for the knockout_rr format: one knockout round, then the winners play a round robin. */
export function RoundRobinPlayoff({ s }: { s: Snapshot }) {
  const teams = teamLookup(s);
  const playoff = s.matches.filter((m) => m.stage === "playoff");
  const knockout = playoff.filter((m) => m.bracket === "upper");
  const finals = playoff.filter((m) => m.bracket === "final");
  const finalsDone = finals.length > 0 && finals.every((m) => m.status === "finished");
  const champion = finalsDone ? teams[s.finalStandings[0]?.teamId ?? ""] : undefined;

  const grid = (list: Match[]) => (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((m) => (
        <li key={m.id}>
          <MatchCard
            match={m}
            team1={m.team1Id ? teams[m.team1Id] : undefined}
            team2={m.team2Id ? teams[m.team2Id] : undefined}
            context={matchContext(s, m)}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-10">
      {champion && <ChampionBanner team={champion} />}

      <SiteSection id="knockout" title="Шигшээ тойрог">
        <p className="text-sm text-muted-foreground">Ялсан баг финалын тойрогт шалгарна.</p>
        {grid(knockout)}
      </SiteSection>

      <SiteSection id="final-round" title="Финалын тойрог">
        <p className="text-sm text-muted-foreground">
          Шигшээ тойргийн ялагчид хоорондоо нэг нэг удаа тоглоно. 1-р байр эзэлсэн баг аварга болно.
        </p>
        {s.finalStandings.length > 0 && (
          <StandingsTable rows={s.finalStandings} teams={teams} qualify={1} caption="Финалын тойргийн байр" />
        )}
        {grid(finals)}
      </SiteSection>
    </div>
  );
}
