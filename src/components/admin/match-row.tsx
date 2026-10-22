import Link from "next/link";
import { LiveBadge } from "@/components/tournament/live-badge";
import { TeamLogo } from "@/components/tournament/team-logo";
import type { Match, Team } from "@/lib/data/dto";
import { STATUS_LABELS } from "@/lib/labels";
import { formatShortDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

function Side({ team, score, won, align }: { team?: Team; score: number; won: boolean; align: "left" | "right" }) {
  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2", align === "right" && "flex-row-reverse text-right")}>
      <TeamLogo team={team} size={24} />
      <span className={cn("truncate text-sm", won ? "font-bold" : "text-muted-foreground", !team && "italic")}>
        {team ? team.tag : "TBD"}
        <span className="hidden sm:inline">{team && ` · ${team.name}`}</span>
      </span>
      <span className={cn("tabular ml-auto font-heading text-lg", align === "right" && "mr-auto ml-0", won && "text-primary")}>
        {score}
      </span>
    </div>
  );
}

/** Compact admin list row linking to the match control page. */
export function MatchRow({ match, teams, context }: { match: Match; teams: Map<string, Team>; context?: string }) {
  const t1 = match.team1Id ? teams.get(match.team1Id) : undefined;
  const t2 = match.team2Id ? teams.get(match.team2Id) : undefined;
  return (
    <Link
      href={`/admin/matches/${match.id}`}
      className={cn(
        "block rounded-md border bg-card px-3 py-2 transition-colors hover:border-primary/60",
        match.status === "live" && "border-live/50",
      )}
    >
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="tabular">{match.scheduledAt ? formatShortDateTime(match.scheduledAt) : "Цаг тогтоогоогүй"}</span>
        {context && <span className="truncate">· {context}</span>}
        <span className="uppercase">· {match.format}</span>
        <span className="ml-auto">
          {match.status === "live" ? <LiveBadge /> : STATUS_LABELS[match.status]}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Side team={t1} score={match.team1Score} won={!!match.winnerId && match.winnerId === match.team1Id} align="left" />
        <span className="text-xs text-muted-foreground">vs</span>
        <Side team={t2} score={match.team2Score} won={!!match.winnerId && match.winnerId === match.team2Id} align="right" />
      </div>
    </Link>
  );
}
