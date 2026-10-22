import { describe, expect, it } from "vitest";
import { layoutBracket, type LayoutMatch } from "./bracket-layout";

const opts = { boxWidth: 200, boxHeight: 80, rowGap: 20, colGap: 40 };

describe("layoutBracket", () => {
  // 8-team single elimination: QF (4) → SF (2) → F (1)
  const matches: LayoutMatch[] = [
    { id: "q1", round: 1, position: 1, nextId: "s1" },
    { id: "q2", round: 1, position: 2, nextId: "s1" },
    { id: "q3", round: 1, position: 3, nextId: "s2" },
    { id: "q4", round: 1, position: 4, nextId: "s2" },
    { id: "s1", round: 2, position: 1, nextId: "f" },
    { id: "s2", round: 2, position: 2, nextId: "f" },
    { id: "f", round: 3, position: 1 },
  ];
  const r = layoutBracket(matches, opts);
  const cy = (id: string) => r.boxes.get(id)!.y + opts.boxHeight / 2;

  it("centres each match between its feeders", () => {
    expect(cy("s1")).toBe((cy("q1") + cy("q2")) / 2);
    expect(cy("s2")).toBe((cy("q3") + cy("q4")) / 2);
    expect(cy("f")).toBe((cy("s1") + cy("s2")) / 2);
  });

  it("places rounds in columns and draws one link per advancing match", () => {
    expect(r.columns.map((c) => c.x)).toEqual([0, 240, 480]);
    expect(r.links).toHaveLength(6);
    expect(r.width).toBe(680);
    expect(r.height).toBe(4 * 100 - 20);
  });

  it("never overlaps boxes in a column", () => {
    // Drop-in style round: two matches each with a single feeder at the same height
    const lower: LayoutMatch[] = [
      { id: "a", round: 1, position: 1, nextId: "c" },
      { id: "b", round: 1, position: 2, nextId: "c" },
      { id: "c", round: 2, position: 1 },
      { id: "d", round: 2, position: 2 },
    ];
    const l = layoutBracket(lower, opts);
    const yc = l.boxes.get("c")!.y;
    const yd = l.boxes.get("d")!.y;
    expect(yd - yc).toBeGreaterThanOrEqual(100);
  });
});
