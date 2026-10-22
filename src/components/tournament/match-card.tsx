"use client";

import { PlayIcon } from "lucide-react";
import Link from "next/link";
import { useLiveMatch } from "@/components/live/live-provider";
import type { Match, Team } from "@/lib/data/dto";
import { formatShortDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { LiveBadge } from "./live-badge";
import { TeamLogo } from "./team-logo";

function TeamRow({
  team,
  score,
  state,
  showScore,
}: {
  team?: Team;
  score: number;
  state: "won" | "lost" | "neutral";
  showScore: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-11 items-center gap-3 border-l-2 px-3",
        state === "won" ? "border-primary" : "border-transparent",
        state === "lost" && "text-muted-foreground",
      )}
    >
      <TeamLogo team={team} size={28} />
      <span className={cn("min-w-0 flex-1 truncate font-medium", !team && "text-muted-foreground italic")}>
        {team?.name ?? "Тодорхойгүй"}
      </span>
      {state === "won" && <span className="sr-only">(ялсан)</span>}
      <span
        className={cn(
          "tabular w-6 text-right font-heading text-xl",
          state === "won" && "font-extrabold text-foreground",
          !showScore && "text-muted-foreground",
        )}
      >
        {showScore ? score : "–"}
      </span>
    </div>
  );
}

export function MatchCard({
  match: initial,
  team1,
  team2,
  context,
  className,
}: {
  match: Match;
  team1?: Team;
  team2?: Team;
  context: string;
  className?: string;
}) {
  const match = useLiveMatch(initial);
  const live = match.status === "live";
  const showScore = match.status !== "scheduled";
  const state = (teamId?: string) =>
    !match.winnerId ? "neutral" : match.winnerId === teamId ? "won" : "lost";

  return (
    <Link
      href={`/matches/${match.id}`}
      className={cn(
        "group block overflow-hidden rounded-md border bg-card transition-colors hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-ring",
        live && "cut-corner border-live/50 shadow-[0_0_24px_-14px_var(--live)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
        <span className="min-w-0 truncate">{context}</span>
        <span className="shrink-0 uppercase">· {match.format}</span>
        <span className="ml-auto flex shrink-0 items-center gap-2">
          {live ? (
            <>
              {match.streamUrl && <PlayIcon className="size-3.5 text-live" aria-label="Шууд дамжуулалттай" />}
              <LiveBadge />
            </>
          ) : match.status === "finished" ? (
            "Дууссан"
          ) : match.scheduledAt ? (
            <span className="tabular">{formatShortDateTime(match.scheduledAt)}</span>
          ) : (
            "Цаг тодорхойгүй"
          )}
        </span>
      </div>
      <div className="py-1">
        <TeamRow team={team1} score={match.team1Score} state={state(match.team1Id)} showScore={showScore} />
        <TeamRow team={team2} score={match.team2Score} state={state(match.team2Id)} showScore={showScore} />
      </div>
    </Link>
  );
}
