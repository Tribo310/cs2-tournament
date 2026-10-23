import type { Group, Match, Settings } from "@/lib/data/dto";

export const ROUND_NAMES: Record<number, string> = { 1: "Финал", 2: "Хагас шигшээ", 4: "Шөвгийн 8", 8: "1/8 финал" };

/** Human label for where a match sits: "Групп A", "Хагас шигшээ", "Доод шат · 2-р тойрог"… */
export function matchContext(
  s: {
    settings: Pick<Settings, "bracketType" | "playoffStages">;
    groups: Pick<Group, "id" | "name">[];
    matches: Pick<Match, "stage" | "bracket" | "round">[];
  },
  m: Match,
): string {
  if (m.label) return m.label;
  if (m.stage === "group") return s.groups.find((g) => g.id === m.groupId)?.name ?? "Групп";
  if (m.stageKey) return s.settings.playoffStages?.find((x) => x.key === m.stageKey)?.name ?? "Плей-офф";
  if (s.settings.bracketType === "knockout_rr") {
    return m.bracket === "final" ? "Финалын тойрог" : "Шигшээ тойрог";
  }
  if (m.bracket === "final") return "Гранд финал";
  if (m.bracket === "lower") return `Доод шат · ${m.round}-р тойрог`;

  // Upper / single elimination: name rounds by how many matches remain
  const upperRounds = s.matches.filter((x) => x.stage === "playoff" && x.bracket === "upper").map((x) => x.round ?? 1);
  const last = Math.max(...upperRounds, m.round ?? 1);
  const matchesInRound = 2 ** (last - (m.round ?? 1));
  const name = ROUND_NAMES[matchesInRound] ?? `${m.round}-р тойрог`;
  return s.settings.bracketType === "double" ? `Дээд шат · ${name}` : name;
}
