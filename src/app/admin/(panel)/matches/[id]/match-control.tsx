"use client";

import {
  CheckIcon,
  CircleAlertIcon,
  FlagIcon,
  Loader2Icon,
  MinusIcon,
  PlayIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
  TrophyIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { NativeSelect } from "@/components/admin/form";
import { Section } from "@/components/admin/page-header";
import { LiveBadge } from "@/components/tournament/live-badge";
import { TeamLogo } from "@/components/tournament/team-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveMaps, setManualWinner, setMatchStatus, type MatchActionResult } from "@/lib/actions/matches";
import type { Match, MatchMap, Team } from "@/lib/data/dto";
import { CS2_MAPS } from "@/lib/db/types";
import { MAP_STATUS_LABELS, STATUS_LABELS } from "@/lib/labels";
import { isMapDecided, mapsToWin, maxMaps } from "@/lib/tournament/match";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "pending" | "saving" | "saved" | "error";
const SAVE_DELAY_MS = 600;

export function MatchControl({ initial, team1, team2 }: { initial: Match; team1?: Team; team2?: Team }) {
  const [match, setMatch] = useState(initial);
  const [maps, setMaps] = useState(initial.maps);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [busy, startBusy] = useTransition();

  // Refs drive the save queue so rapid clicks collapse into one request
  const mapsRef = useRef(initial.maps);
  const versionRef = useRef(initial.updatedAt.toISOString());
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inFlightRef = useRef<Promise<boolean> | null>(null);

  const applyServer = useCallback((m: Match) => {
    versionRef.current = m.updatedAt.toISOString();
    setMatch(m);
    if (!dirtyRef.current) {
      mapsRef.current = m.maps;
      setMaps(m.maps);
    }
  }, []);

  // Pick up changes made elsewhere (page refresh after other actions)
  useEffect(() => {
    if (initial.updatedAt.toISOString() !== versionRef.current && !dirtyRef.current && !inFlightRef.current) {
      applyServer(initial);
    }
  }, [initial, applyServer]);

  const flush = useCallback(async (): Promise<boolean> => {
    clearTimeout(timerRef.current);
    if (inFlightRef.current) await inFlightRef.current;

    // Keep saving until no edits arrived while a request was in flight
    while (dirtyRef.current) {
      dirtyRef.current = false;
      setSaveState("saving");
      const request = saveMaps(match.id, mapsRef.current, versionRef.current).then((res) => {
        if (res.ok && res.match) {
          applyServer(res.match);
          if (!dirtyRef.current) setSaveState("saved");
          return true;
        }
        dirtyRef.current = true;
        setSaveState("error");
        toast.error(res.message ?? "Хадгалж чадсангүй.");
        return false;
      });
      inFlightRef.current = request;
      const ok = await request;
      inFlightRef.current = null;
      if (!ok) return false;
    }
    return true;
  }, [match.id, applyServer]);

  // Save before leaving the page
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current || inFlightRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);

  const updateMaps = (next: MatchMap[]) => {
    mapsRef.current = next;
    setMaps(next);
    dirtyRef.current = true;
    setSaveState("pending");
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
  };

  const updateMap = (order: number, patch: Partial<MatchMap>) => {
    let next = maps.map((m) => (m.order === order ? { ...m, ...patch } : m));
    // Finishing a map during a live match starts the next one
    if (patch.status === "finished" && match.status === "live" && !next.some((m) => m.status === "live")) {
      const upcoming = next.find((m) => m.status === "upcoming");
      if (upcoming) next = next.map((m) => (m === upcoming ? { ...m, status: "live" } : m));
    }
    updateMaps(next);
  };

  const addMap = () => {
    const used = new Set(maps.map((m) => m.mapName));
    updateMaps([
      ...maps,
      {
        order: maps.length + 1,
        mapName: CS2_MAPS.find((n) => !used.has(n)) ?? CS2_MAPS[0],
        team1Rounds: 0,
        team2Rounds: 0,
        status: match.status === "live" && !maps.some((m) => m.status === "live") ? "live" : "upcoming",
      },
    ]);
  };

  const removeLastMap = () => updateMaps(maps.slice(0, -1));

  const run = (fn: () => Promise<MatchActionResult>, successMessage?: string) =>
    startBusy(async () => {
      if (!(await flush())) return;
      const res = await fn();
      if (res.ok && res.match) {
        applyServer(res.match);
        mapsRef.current = res.match.maps;
        setMaps(res.match.maps);
        if (successMessage) toast.success(successMessage);
      } else {
        toast.error(res.message ?? "Алдаа гарлаа.");
      }
    });

  const changeStatus = (status: Match["status"], message: string) =>
    run(() => setMatchStatus(match.id, status, versionRef.current), message);

  const forfeit = (team: Team | null) =>
    run(
      () => setManualWinner(match.id, team?.id ?? null, versionRef.current),
      team ? `${team.name} ялагчаар тогтлоо.` : "Цуцаллаа.",
    );

  // Score from local maps so the header reacts instantly while typing
  const local = maps.reduce(
    (acc, m) => {
      if (m.status !== "finished" || m.team1Rounds === m.team2Rounds) return acc;
      return m.team1Rounds > m.team2Rounds ? { ...acc, t1: acc.t1 + 1 } : { ...acc, t2: acc.t2 + 1 };
    },
    { t1: 0, t2: 0 },
  );
  const need = mapsToWin(match.format);
  const clinched = local.t1 >= need ? team1 : local.t2 >= need ? team2 : undefined;
  const bothTeams = Boolean(match.team1Id && match.team2Id);
  const winner = !match.winnerId
    ? undefined
    : match.winnerId === match.team1Id
      ? team1
      : match.winnerId === match.team2Id
        ? team2
        : undefined;

  return (
    <div className="space-y-4">
      {/* Scoreboard */}
      <section
        className={cn(
          "cut-corner rounded-md border bg-card p-4",
          match.status === "live" && "border-live/50 shadow-[0_0_24px_-12px_var(--live)]",
        )}
      >
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="uppercase">{match.format}</span>
          {match.status === "live" ? <LiveBadge /> : <span>{STATUS_LABELS[match.status]}</span>}
          <SaveIndicator state={saveState} />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamHead team={team1} won={!!winner && winner === team1} />
          <div className="tabular flex items-center gap-2 font-heading text-4xl font-extrabold md:text-5xl" aria-live="polite">
            <span className={cn(winner === team1 && "text-primary")}>{local.t1}</span>
            <span className="text-muted-foreground">:</span>
            <span className={cn(winner === team2 && "text-primary")}>{local.t2}</span>
          </div>
          <TeamHead team={team2} won={!!winner && winner === team2} align="right" />
        </div>
        {match.winnerManual && winner && (
          <p className="mt-3 text-center text-sm text-side-t">Техникийн ялалт: {winner.name}</p>
        )}
      </section>

      {/* Status */}
      <Section title="Төлөв">
        <div className="flex flex-wrap gap-2">
          {match.status === "scheduled" && (
            <Button size="lg" disabled={busy || !bothTeams} onClick={() => changeStatus("live", "Тоглолт эхэллээ.")}>
              <PlayIcon aria-hidden /> Тоглолт эхлүүлэх
            </Button>
          )}
          {match.status === "live" && (
            <>
              <Button size="lg" disabled={busy} onClick={() => changeStatus("finished", "Тоглолт дууслаа.")}>
                <FlagIcon aria-hidden /> Тоглолт дуусгах
              </Button>
              <Button size="lg" variant="outline" disabled={busy} onClick={() => changeStatus("scheduled", "Товлогдсон төлөвт буцлаа.")}>
                <RotateCcwIcon aria-hidden /> Товлогдсон руу буцаах
              </Button>
            </>
          )}
          {match.status === "finished" && (
            <Button size="lg" variant="outline" disabled={busy} onClick={() => changeStatus("live", "Тоглолт дахин нээгдлээ.")}>
              <RotateCcwIcon aria-hidden /> Дахин нээх
            </Button>
          )}
          {busy && <Loader2Icon className="size-5 animate-spin self-center text-muted-foreground" aria-label="Хадгалж байна" />}
        </div>
        {!bothTeams && <p className="text-sm text-muted-foreground">Хоёр баг тодорхой болсны дараа эхлүүлнэ.</p>}
        {clinched && match.status !== "finished" && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-primary/50 bg-primary/10 p-3 text-sm">
            <TrophyIcon className="size-4 text-primary" aria-hidden />
            <span className="flex-1">
              <b>{clinched.name}</b> {need} карт хожлоо.
            </span>
            <Button disabled={busy} onClick={() => changeStatus("finished", "Тоглолт дууслаа.")}>
              Тоглолт дуусгах
            </Button>
          </div>
        )}
      </Section>

      {/* Maps */}
      <Section
        title={`Картууд · ${maps.length}/${maxMaps(match.format)}`}
        actions={
          <div className="flex gap-2">
            {maps.length > 0 && (
              <Button variant="ghost" size="sm" onClick={removeLastMap} aria-label="Сүүлийн картыг хасах">
                <Trash2Icon aria-hidden /> Хасах
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={addMap} disabled={maps.length >= maxMaps(match.format)}>
              <PlusIcon aria-hidden /> Карт нэмэх
            </Button>
          </div>
        }
      >
        {maps.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Карт нэмээгүй байна. Pick/ban дууссаны дараа картуудаа дарааллаар нь нэмнэ үү.
          </p>
        )}
        <ol className="space-y-3">
          {maps.map((map) => (
            <MapEditor
              key={map.order}
              map={map}
              team1={team1}
              team2={team2}
              team1Id={match.team1Id}
              team2Id={match.team2Id}
              usedMaps={maps.filter((m) => m.order !== map.order).map((m) => m.mapName)}
              onChange={(patch) => updateMap(map.order, patch)}
            />
          ))}
        </ol>
      </Section>

      {/* Forfeit */}
      {bothTeams && (
        <Section title="Техникийн ялалт">
          <p className="text-sm text-muted-foreground">
            Баг ирээгүй эсвэл хасагдсан үед ялагчийг гараар тогтооно. Тоглолт шууд дуусна.
          </p>
          <div className="flex flex-wrap gap-2">
            {match.winnerManual ? (
              <Button variant="outline" disabled={busy} onClick={() => forfeit(null)}>
                <RotateCcwIcon aria-hidden /> Техникийн ялалтыг цуцлах
              </Button>
            ) : (
              <>
                {team1 && (
                  <Button variant="outline" disabled={busy} onClick={() => forfeit(team1)}>
                    <TrophyIcon aria-hidden /> {team1.tag} ялагч
                  </Button>
                )}
                {team2 && (
                  <Button variant="outline" disabled={busy} onClick={() => forfeit(team2)}>
                    <TrophyIcon aria-hidden /> {team2.tag} ялагч
                  </Button>
                )}
              </>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

function TeamHead({ team, won, align = "left" }: { team?: Team; won: boolean; align?: "left" | "right" }) {
  return (
    <div className={cn("flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row", align === "right" && "sm:flex-row-reverse sm:text-right", align === "left" && "sm:text-left")}>
      <TeamLogo team={team} size={48} />
      <div className="min-w-0">
        <p className={cn("truncate font-heading text-lg font-bold", !won && "text-foreground/90")}>{team?.tag ?? "TBD"}</p>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">{team?.name}</p>
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return <span className="w-24" />;
  return (
    <span role="status" className={cn("flex w-24 items-center justify-end gap-1", state === "error" && "text-destructive")}>
      {state === "saving" || state === "pending" ? (
        <>
          <Loader2Icon className="size-3 animate-spin" aria-hidden /> Хадгалж байна
        </>
      ) : state === "saved" ? (
        <>
          <CheckIcon className="size-3 text-win" aria-hidden /> Хадгалсан
        </>
      ) : (
        <>
          <CircleAlertIcon className="size-3" aria-hidden /> Хадгалаагүй
        </>
      )}
    </span>
  );
}

function RoundStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="outline" size="icon" className="size-11" aria-label={`${label}: раунд хасах`} onClick={() => onChange(Math.max(0, value - 1))}>
        <MinusIcon />
      </Button>
      <Input
        aria-label={`${label} раунд`}
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, ""));
          if (Number.isFinite(n) && n <= 99) onChange(n);
        }}
        className="tabular h-11 w-14 text-center font-heading text-xl font-bold"
      />
      <Button type="button" variant="outline" size="icon" className="size-11" aria-label={`${label}: раунд нэмэх`} onClick={() => onChange(Math.min(99, value + 1))}>
        <PlusIcon />
      </Button>
    </div>
  );
}

function MapEditor({
  map,
  team1,
  team2,
  team1Id,
  team2Id,
  usedMaps,
  onChange,
}: {
  map: MatchMap;
  team1?: Team;
  team2?: Team;
  team1Id?: string;
  team2Id?: string;
  usedMaps: string[];
  onChange: (patch: Partial<MatchMap>) => void;
}) {
  const decided = isMapDecided(map.team1Rounds, map.team2Rounds);
  const mapOptions = CS2_MAPS.includes(map.mapName as (typeof CS2_MAPS)[number]) ? CS2_MAPS : [map.mapName, ...CS2_MAPS];
  const id = `map-${map.order}`;

  return (
    <li
      className={cn(
        "space-y-3 rounded-md border p-3",
        map.status === "live" && "border-live/50 bg-live/5",
        map.status === "finished" && "bg-muted/30",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-heading text-sm font-bold text-muted-foreground">#{map.order}</span>
        <NativeSelect
          aria-label="Карт"
          id={`${id}-name`}
          value={map.mapName}
          onChange={(e) => onChange({ mapName: e.target.value })}
          className="w-36 flex-1 sm:flex-none"
        >
          {mapOptions.map((name) => (
            <option key={name} value={name} disabled={usedMaps.includes(name)}>
              {name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Сонгосон баг"
          value={map.pickedBy ?? ""}
          onChange={(e) => onChange({ pickedBy: e.target.value || undefined })}
          className="w-40 flex-1 sm:flex-none"
        >
          <option value="">Decider</option>
          {team1Id && <option value={team1Id}>{team1?.tag ?? "Баг 1"} pick</option>}
          {team2Id && <option value={team2Id}>{team2?.tag ?? "Баг 2"} pick</option>}
        </NativeSelect>
      </div>

      {/* Phones: one row per team, label first. Wider screens: "T1 [−n+] : [−n+] T2" */}
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
        <div className="flex items-center gap-2">
          <span className="w-12 truncate text-right text-sm font-semibold">{team1?.tag ?? "Баг 1"}</span>
          <RoundStepper label={team1?.tag ?? "Баг 1"} value={map.team1Rounds} onChange={(v) => onChange({ team1Rounds: v })} />
        </div>
        <span className="hidden text-muted-foreground sm:inline">:</span>
        <div className="flex flex-row-reverse items-center gap-2 sm:flex-row">
          <RoundStepper label={team2?.tag ?? "Баг 2"} value={map.team2Rounds} onChange={(v) => onChange({ team2Rounds: v })} />
          <span className="w-12 truncate text-right text-sm font-semibold sm:text-left">{team2?.tag ?? "Баг 2"}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Картын төлөв" className="flex rounded-md border p-0.5">
          {(["upcoming", "live", "finished"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={map.status === s}
              onClick={() => onChange({ status: s })}
              className={cn(
                "h-9 rounded-sm px-3 text-xs font-medium transition-colors",
                map.status === s
                  ? s === "live"
                    ? "bg-live text-white"
                    : s === "finished"
                      ? "bg-foreground text-background"
                      : "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {MAP_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        {decided && map.status !== "finished" && (
          <Button size="sm" className="h-9" onClick={() => onChange({ status: "finished" })}>
            <CheckIcon aria-hidden /> Карт дуусгах
          </Button>
        )}
      </div>
    </li>
  );
}
