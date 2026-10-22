"use client";

import Link from "next/link";
import { useLiveMatch } from "@/components/live/live-provider";
import type { Match, Team } from "@/lib/data/dto";

export type TeamBrief = Pick<Team, "id" | "name" | "tag" | "logoUrl">;
import { cn } from "@/lib/utils";
import { TeamLogo } from "./team-logo";

function BracketSlot({ team, score, won, decided, showScore }: { team?: TeamBrief; score: number; won: boolean; decided: boolean; showScore: boolean }) {
  return (
    <div
      className={cn(
        "flex h-8 items-center gap-2 border-l-2 px-2 text-sm",
        won ? "border-primary font-semibold" : "border-transparent",
        decided && !won && "text-muted-foreground",
      )}
    >
      <TeamLogo team={team} size={20} />
      <span className={cn("min-w-0 flex-1 truncate", !team && "text-muted-foreground italic")}>{team?.name ?? "TBD"}</span>
      {won && <span className="sr-only">(ялсан)</span>}
      <span className={cn("tabular w-5 text-right font-heading", won && "text-primary")}>{showScore ? score : ""}</span>
    </div>
  );
}

export function BracketMatch({
  match: initial,
  teams,
  title,
  hrefBase,
}: {
  match: Match;
  teams: Record<string, TeamBrief>;
  title: string;
  hrefBase: string;
}) {
  // Scores update live; connector highlights follow on the next server refresh
  const match = useLiveMatch(initial);
  const live = match.status === "live";
  const decided = Boolean(match.winnerId);
  const showScore = match.status !== "scheduled";
  return (
    <Link
      href={`${hrefBase}${match.id}`}
      aria-label={title}
      className={cn(
        "block h-full overflow-hidden rounded-md border bg-card transition-colors hover:border-primary/60",
        live && "border-live/60 shadow-[0_0_20px_-10px_var(--live)]",
      )}
    >
      <div className="flex h-5 items-center justify-between px-2 text-[10px] text-muted-foreground uppercase">
        <span>{match.format}</span>
        {live && <span className="font-bold text-live">● Шууд</span>}
      </div>
      <BracketSlot
        team={match.team1Id ? teams[match.team1Id] : undefined}
        score={match.team1Score}
        won={decided && match.winnerId === match.team1Id}
        decided={decided}
        showScore={showScore}
      />
      <BracketSlot
        team={match.team2Id ? teams[match.team2Id] : undefined}
        score={match.team2Score}
        won={decided && match.winnerId === match.team2Id}
        decided={decided}
        showScore={showScore}
      />
    </Link>
  );
}
