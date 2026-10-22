"use client";

import { ChevronLeftIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useLiveMatch } from "@/components/live/live-provider";
import { EmptyState } from "@/components/site/section";
import { LiveBadge } from "@/components/tournament/live-badge";
import { TeamLogo } from "@/components/tournament/team-logo";
import { Button } from "@/components/ui/button";
import type { Match, MatchMap, Team } from "@/lib/data/dto";
import { STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

function TeamSide({ team, won, align }: { team?: Team; won: boolean; align: "left" | "right" }) {
  const body = (
    <>
      <TeamLogo team={team} size={64} className="size-14 md:size-16" />
      <span className="min-w-0">
        <span className={cn("block truncate font-heading text-lg font-extrabold md:text-2xl", !won && "text-foreground/90")}>
          {team?.tag ?? "TBD"}
        </span>
        <span className="hidden truncate text-sm text-muted-foreground sm:block">{team?.name}</span>
      </span>
    </>
  );
  const cls = cn(
    "flex min-w-0 flex-col items-center gap-2 text-center md:flex-row md:gap-4",
    align === "right" ? "md:flex-row-reverse md:text-right" : "md:text-left",
  );
  return team ? (
    <Link href={`/teams/${team.id}`} className={cn(cls, "transition-colors hover:text-primary")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function MapRow({ map, match, teams }: { map: MatchMap; match: Match; teams: Record<string, Team> }) {
  const finished = map.status === "finished";
  const t1Won = finished && map.team1Rounds > map.team2Rounds;
  const t2Won = finished && map.team2Rounds > map.team1Rounds;
  const picker = map.pickedBy ? teams[map.pickedBy] : undefined;
  const live = map.status === "live";
  return (
    <li
      className={cn(
        "grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border bg-card px-4 py-3 md:grid-cols-[2rem_1fr_auto_8rem]",
        live && "border-live/50",
        map.status === "upcoming" && "opacity-70",
      )}
    >
      <span className="hidden font-heading text-sm text-muted-foreground md:block">#{map.order}</span>
      <div className="min-w-0">
        <p className="font-heading text-base font-bold">{map.mapName}</p>
        <p className="text-xs text-muted-foreground">
          {picker ? `${picker.tag} сонгосон` : "Шийдвэрлэх карт"}
          {live && <span className="ml-2 font-semibold text-live">● Явагдаж байна</span>}
        </p>
      </div>
      <p className="tabular font-heading text-2xl font-extrabold" aria-label={`${map.team1Rounds} : ${map.team2Rounds}`}>
        {map.status === "upcoming" ? (
          <span className="text-muted-foreground">– : –</span>
        ) : (
          <>
            <span className={cn(t1Won && "text-primary", t2Won && "text-muted-foreground")}>{map.team1Rounds}</span>
            <span className="mx-1 text-muted-foreground">:</span>
            <span className={cn(t2Won && "text-primary", t1Won && "text-muted-foreground")}>{map.team2Rounds}</span>
          </>
        )}
      </p>
      <p className="col-span-2 text-xs text-muted-foreground md:col-span-1 md:text-right">
        {t1Won || t2Won ? (
          <>
            Ялагч: <span className="font-semibold text-foreground">{(t1Won ? teams[match.team1Id ?? ""] : teams[match.team2Id ?? ""])?.tag}</span>
          </>
        ) : live ? null : map.status === "upcoming" ? (
          "Тоглогдоогүй"
        ) : null}
      </p>
    </li>
  );
}

/** Scoreboard and maps; follows live updates for this match. */
export function MatchView({
  match: initial,
  teams,
  context,
  when,
}: {
  match: Match;
  teams: Record<string, Team>;
  context: string;
  when?: string;
}) {
  const match = useLiveMatch(initial);
  const team1 = match.team1Id ? teams[match.team1Id] : undefined;
  const team2 = match.team2Id ? teams[match.team2Id] : undefined;
  const winner1 = Boolean(match.winnerId) && match.winnerId === match.team1Id;
  const winner2 = Boolean(match.winnerId) && match.winnerId === match.team2Id;
  const live = match.status === "live";

  return (
    <article className="space-y-6">
      <Link href="/schedule" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeftIcon className="size-4" aria-hidden />
        Хуваарь
      </Link>

      <header
        className={cn(
          "cut-corner space-y-5 rounded-md border bg-card px-4 py-5 md:px-8 md:py-8",
          live && "border-live/50 shadow-[0_0_32px_-14px_var(--live)]",
        )}
      >
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{context}</span>
          <span className="uppercase">· {match.format}</span>
          {when && <span className="tabular">· {when}</span>}
        </div>

        <h1 className="sr-only">
          {team1?.name ?? "TBD"} – {team2?.name ?? "TBD"}
        </h1>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-8">
          <TeamSide team={team1} won={winner1} align="left" />
          <div className="flex flex-col items-center gap-2">
            {match.status === "scheduled" ? (
              <span className="font-heading text-3xl font-extrabold text-muted-foreground md:text-5xl">VS</span>
            ) : (
              <p className="tabular font-heading text-5xl font-extrabold md:text-6xl" aria-label={`Оноо ${match.team1Score} : ${match.team2Score}`}>
                <span className={cn(winner1 && "text-primary", winner2 && "text-muted-foreground")}>{match.team1Score}</span>
                <span className="mx-1 text-muted-foreground">:</span>
                <span className={cn(winner2 && "text-primary", winner1 && "text-muted-foreground")}>{match.team2Score}</span>
              </p>
            )}
            {live ? <LiveBadge /> : <span className="text-xs text-muted-foreground">{STATUS_LABELS[match.status]}</span>}
          </div>
          <TeamSide team={team2} won={winner2} align="right" />
        </div>

        {match.winnerManual && match.winnerId && (
          <p className="text-center text-sm text-side-t">Техникийн ялалт: {teams[match.winnerId]?.name}</p>
        )}

        {match.streamUrl && (
          <div className="flex justify-center">
            <Button asChild variant={live ? "default" : "outline"} size="lg">
              <a href={match.streamUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon aria-hidden />
                {live ? "Шууд үзэх" : "Дамжуулалт"}
              </a>
            </Button>
          </div>
        )}
      </header>

      <section aria-labelledby="maps" className="space-y-3">
        <h2 id="maps" className="font-heading text-sm font-bold tracking-widest text-muted-foreground uppercase">
          Картууд
        </h2>
        {match.maps.length ? (
          <ol className="space-y-2">
            {match.maps.map((map) => (
              <MapRow key={map.order} map={map} match={match} teams={teams} />
            ))}
          </ol>
        ) : (
          <EmptyState>Картын мэдээлэл хараахан ороогүй байна.</EmptyState>
        )}
      </section>

      {match.notes && (
        <p className="rounded-md border bg-card px-4 py-3 text-sm whitespace-pre-line text-muted-foreground">{match.notes}</p>
      )}
    </article>
  );
}
