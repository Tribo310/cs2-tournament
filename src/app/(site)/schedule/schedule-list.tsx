"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/site/section";
import { MatchCard } from "@/components/tournament/match-card";
import type { Match, Team } from "@/lib/data/dto";
import { cn } from "@/lib/utils";

export interface ScheduleItem {
  match: Match;
  team1?: Team;
  team2?: Team;
  context: string;
  day: string; // "" when unscheduled
  dayLabel: string;
}

const STATUS_CHIPS = [
  ["", "Бүгд"],
  ["live", "Шууд"],
  ["scheduled", "Удахгүй"],
  ["finished", "Дууссан"],
] as const;

const selectClass =
  "h-11 w-full cursor-pointer rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>option]:bg-popover";

export function ScheduleList({ items, groups }: { items: ScheduleItem[]; groups: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const status = params.get("status") ?? "";
  const stage = params.get("stage") ?? "";
  const group = params.get("group") ?? "";
  const day = params.get("day") ?? "";

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "stage" && value !== "group") next.delete("group");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const days = [...new Map(items.filter((i) => i.day).map((i) => [i.day, i.dayLabel])).entries()].sort();

  const filtered = items.filter(
    ({ match: m, day: d }) =>
      (!status || m.status === status) &&
      (!stage || m.stage === stage) &&
      (!group || m.groupId === group) &&
      (!day || d === day),
  );

  // Group by day, keeping the server's chronological order
  const byDay = new Map<string, { label: string; items: ScheduleItem[] }>();
  for (const item of filtered) {
    const entry = byDay.get(item.day) ?? { label: item.dayLabel, items: [] };
    entry.items.push(item);
    byDay.set(item.day, entry);
  }
  // Finished-only view reads newest first
  const sections = [...byDay.entries()];
  if (status === "finished") sections.reverse();

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div role="radiogroup" aria-label="Төлөв" className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {STATUS_CHIPS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={status === value}
              onClick={() => set("status", value)}
              className={cn(
                "h-9 shrink-0 rounded-full border px-4 text-sm transition-colors",
                status === value ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/60",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <select aria-label="Үе шат" className={selectClass} value={stage} onChange={(e) => set("stage", e.target.value)}>
            <option value="">Бүх үе шат</option>
            <option value="group">Групп</option>
            <option value="playoff">Плей-офф</option>
          </select>
          <select aria-label="Өдөр" className={selectClass} value={day} onChange={(e) => set("day", e.target.value)}>
            <option value="">Бүх өдөр</option>
            {days.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          {stage !== "playoff" && groups.length > 0 && (
            <select
              aria-label="Групп"
              className={cn(selectClass, "col-span-2 md:col-span-1")}
              value={group}
              onChange={(e) => set("group", e.target.value)}
            >
              <option value="">Бүх групп</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <p className="sr-only" role="status">
        {filtered.length} тоглолт олдлоо
      </p>

      {sections.length === 0 ? (
        <EmptyState>Шүүлтүүрт тохирох тоглолт алга.</EmptyState>
      ) : (
        sections.map(([key, { label, items: dayItems }]) => (
          <section key={key || "tbd"} aria-label={label} className="space-y-3">
            <h2 className="sticky top-14 z-10 -mx-4 bg-background/95 px-4 py-2 font-heading text-sm font-bold tracking-wide backdrop-blur md:mx-0 md:px-0">
              {label}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dayItems.map((i) => (
                <li key={i.match.id}>
                  <MatchCard match={i.match} team1={i.team1} team2={i.team2} context={i.context} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
