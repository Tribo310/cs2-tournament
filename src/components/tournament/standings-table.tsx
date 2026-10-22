import Link from "next/link";
import type { Team } from "@/lib/data/dto";
import type { StandingRow } from "@/lib/tournament/standings";
import { cn } from "@/lib/utils";
import { TeamLogo } from "./team-logo";

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export function StandingsTable({
  rows,
  teams,
  qualify,
  caption,
}: {
  rows: StandingRow[];
  teams: Record<string, Team>;
  qualify: number;
  caption: string;
}) {
  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b bg-muted/60 text-xs text-muted-foreground">
            <th scope="col" className="sticky left-0 z-10 bg-muted px-3 py-2 text-left font-medium">
              # Баг
            </th>
            <th scope="col" className="w-10 px-2 py-2 font-medium">
              <abbr title="Тоглосон" className="no-underline">Т</abbr>
            </th>
            <th scope="col" className="w-10 px-2 py-2 font-medium">
              <abbr title="Хожил" className="no-underline">Х</abbr>
            </th>
            <th scope="col" className="w-10 px-2 py-2 font-medium">
              <abbr title="Хожигдол" className="no-underline">Хж</abbr>
            </th>
            <th scope="col" className="w-16 px-2 py-2 font-medium">
              Карт
            </th>
            <th scope="col" className="w-16 px-2 py-2 font-medium">
              Раунд
            </th>
            <th scope="col" className="w-12 px-3 py-2 font-medium text-foreground">
              <abbr title="Оноо" className="no-underline">О</abbr>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const team = teams[row.teamId];
            const qualified = i < qualify;
            return (
              <tr key={row.teamId} className="border-b last:border-b-0">
                <th
                  scope="row"
                  className={cn(
                    "sticky left-0 z-10 border-l-2 bg-card px-3 py-2 text-left font-medium",
                    qualified ? "border-primary" : "border-transparent",
                  )}
                >
                  <Link href={`/teams/${row.teamId}`} className="flex min-h-7 items-center gap-2 hover:text-primary">
                    <span className="tabular w-4 text-xs text-muted-foreground">{i + 1}</span>
                    <TeamLogo team={team} size={24} />
                    <span className="max-w-[9rem] truncate sm:max-w-none">{team?.name ?? "—"}</span>
                    {qualified && <span className="sr-only">(шалгарах байр)</span>}
                  </Link>
                </th>
                <td className="tabular px-2 py-2 text-center">{row.played}</td>
                <td className="tabular px-2 py-2 text-center">{row.wins}</td>
                <td className="tabular px-2 py-2 text-center">{row.losses}</td>
                <td className={cn("tabular px-2 py-2 text-center", row.mapDiff > 0 && "text-win", row.mapDiff < 0 && "text-destructive")}>
                  {signed(row.mapDiff)}
                </td>
                <td className={cn("tabular px-2 py-2 text-center", row.roundDiff > 0 && "text-win", row.roundDiff < 0 && "text-destructive")}>
                  {signed(row.roundDiff)}
                </td>
                <td className="tabular px-3 py-2 text-center font-heading text-base font-bold">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function StandingsLegend({ qualify }: { qualify: number }) {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      <span className="mr-1 inline-block h-3 w-0.5 translate-y-0.5 bg-primary" aria-hidden />
      Эхний {qualify} байр плей-оффт шалгарна. Т — тоглосон, Х — хожил, Хж — хожигдол, Карт / Раунд — зөрүү, О — оноо.
    </p>
  );
}
