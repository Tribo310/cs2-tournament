// Pure layout math for the bracket view: x/y for each match and connector paths.

export interface LayoutMatch {
  id: string;
  round: number;
  position: number;
  nextId?: string; // winner's next match, if in the same section
}

export interface LayoutResult {
  boxes: Map<string, { x: number; y: number }>; // top-left corner
  links: { from: string; to: string; d: string }[];
  width: number;
  height: number;
  columns: { round: number; x: number }[];
}

export interface LayoutOptions {
  boxWidth: number;
  boxHeight: number;
  rowGap: number;
  colGap: number;
}

/**
 * Columns are rounds. A match is vertically centred on the matches that feed into it
 * (via nextId); matches without feeders fall back to their position. Overlaps are
 * pushed down so boxes never collide.
 */
export function layoutBracket(matches: LayoutMatch[], o: LayoutOptions): LayoutResult {
  const slot = o.boxHeight + o.rowGap;
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
  const centers = new Map<string, number>();
  const boxes = new Map<string, { x: number; y: number }>();
  const columns: LayoutResult["columns"] = [];

  rounds.forEach((round, col) => {
    const x = col * (o.boxWidth + o.colGap);
    columns.push({ round, x });
    const inRound = matches.filter((m) => m.round === round).sort((a, b) => a.position - b.position);

    const wanted = inRound.map((m) => {
      const feeders = matches.filter((f) => f.nextId === m.id && centers.has(f.id)).map((f) => centers.get(f.id)!);
      if (feeders.length) return feeders.reduce((a, b) => a + b, 0) / feeders.length;
      // No feeders drawn: where it would sit if fed by positions 2p-1 and 2p each round
      const spread = 2 ** Math.min(col, 4);
      return ((m.position - 1) * spread + (spread - 1) / 2) * slot + o.boxHeight / 2;
    });

    let prev = -Infinity;
    inRound.forEach((m, i) => {
      const cy = Math.max(wanted[i], prev + slot, o.boxHeight / 2);
      prev = cy;
      centers.set(m.id, cy);
      boxes.set(m.id, { x, y: cy - o.boxHeight / 2 });
    });
  });

  const links: LayoutResult["links"] = [];
  for (const m of matches) {
    if (!m.nextId || !boxes.has(m.nextId)) continue;
    const a = boxes.get(m.id)!;
    const b = boxes.get(m.nextId)!;
    const x1 = a.x + o.boxWidth;
    const y1 = a.y + o.boxHeight / 2;
    const x2 = b.x;
    const y2 = b.y + o.boxHeight / 2;
    const xm = x1 + (x2 - x1) / 2;
    links.push({ from: m.id, to: m.nextId, d: `M${x1} ${y1}H${xm}V${y2}H${x2}` });
  }

  const ys = [...boxes.values()].map((b) => b.y + o.boxHeight);
  return {
    boxes,
    links,
    columns,
    width: rounds.length ? (rounds.length - 1) * (o.boxWidth + o.colGap) + o.boxWidth : 0,
    height: ys.length ? Math.max(...ys) : 0,
  };
}
