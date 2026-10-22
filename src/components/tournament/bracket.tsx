import type { Match, Team } from "@/lib/data/dto";
import { layoutBracket } from "@/lib/tournament/bracket-layout";
import { BracketMatch, type TeamBrief } from "./bracket-match";

const BOX_W = 208;
const BOX_H = 84;
const ROW_GAP = 16;
const COL_GAP = 40;

/** One bracket section (upper, lower or final) drawn as columns with connecting lines. */
export function BracketSection({
  matches,
  teams,
  roundLabel,
  matchTitle,
  hrefBase = "/matches/",
}: {
  matches: Match[];
  teams: Record<string, Team>;
  roundLabel: (round: number) => string;
  matchTitle: (m: Match) => string;
  hrefBase?: string;
}) {
  const ids = new Set(matches.map((m) => m.id));
  const layout = layoutBracket(
    matches.map((m) => ({
      id: m.id,
      round: m.round ?? 1,
      position: m.position ?? 1,
      nextId: m.next && ids.has(m.next.matchId) ? m.next.matchId : undefined,
    })),
    { boxWidth: BOX_W, boxHeight: BOX_H, rowGap: ROW_GAP, colGap: COL_GAP },
  );
  const byId = new Map(matches.map((m) => [m.id, m]));
  // One slim lookup shared by every box keeps rosters out of the client payload
  const brief: Record<string, TeamBrief> = Object.fromEntries(
    Object.values(teams).map((t) => [t.id, { id: t.id, name: t.name, tag: t.tag, logoUrl: t.logoUrl }]),
  );

  return (
    // The bracket scrolls inside its own container; the page itself never scrolls sideways
    <div className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0" tabIndex={0} aria-label="Шатны диаграм (хажуу тийш гүйлгэнэ)">
      <div style={{ width: layout.width }} className="space-y-2">
        <div className="relative h-5">
          {layout.columns.map((c) => (
            <span
              key={c.round}
              style={{ left: c.x, width: BOX_W }}
              className="absolute truncate text-xs font-semibold tracking-wide text-muted-foreground uppercase"
            >
              {roundLabel(c.round)}
            </span>
          ))}
        </div>
        <div className="relative" style={{ height: layout.height }}>
          <svg aria-hidden className="pointer-events-none absolute inset-0" width={layout.width} height={layout.height}>
            {layout.links.map((l) => {
              const from = byId.get(l.from);
              // Highlight the path the winner actually took
              const advanced = Boolean(from?.winnerId);
              return (
                <path
                  key={`${l.from}-${l.to}`}
                  d={l.d}
                  fill="none"
                  strokeWidth={advanced ? 2 : 1.5}
                  className={advanced ? "stroke-primary" : "stroke-border"}
                />
              );
            })}
          </svg>
          {matches.map((m) => {
            const box = layout.boxes.get(m.id);
            if (!box) return null;
            return (
              <div key={m.id} className="absolute" style={{ left: box.x, top: box.y, width: BOX_W, height: BOX_H }}>
                <BracketMatch match={m} teams={brief} title={matchTitle(m)} hrefBase={hrefBase} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
