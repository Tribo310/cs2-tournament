import type { BracketType, MapStatus, MatchStatus, PlayerRole, StageKind } from "@/lib/db/types";

// Mongolian UI labels shared by admin and public pages.

export const ROLE_LABELS: Record<PlayerRole, string> = {
  player: "Тоглогч",
  sub: "Сэлгээ",
  coach: "Дасгалжуулагч",
};

export const STATUS_LABELS: Record<MatchStatus, string> = {
  scheduled: "Товлогдсон",
  live: "Шууд",
  finished: "Дууссан",
};

export const MAP_STATUS_LABELS: Record<MapStatus, string> = {
  upcoming: "Хүлээгдэж буй",
  live: "Явагдаж буй",
  finished: "Дууссан",
};

export const STAGE_LABELS = {
  group: "Групп",
  playoff: "Плей-офф",
} as const;

export const BRACKET_TYPE_LABELS: Record<BracketType, string> = {
  single: "Нэг хасагдалттай",
  double: "Хоёр хасагдалттай",
  knockout_rr: "Шигшээ + финалын тойрог",
  custom: "Чөлөөт",
};

export const STAGE_KIND_LABELS: Record<StageKind, string> = {
  knockout: "Шууд хасагдах",
  round_robin: "Тойргийн",
};

export const STAGE_KIND_HINTS: Record<StageKind, string> = {
  knockout: "Ялсан баг дараагийн шатанд гарч, ялагдсан баг хасагдана.",
  round_robin: "Баг бүр бусадтайгаа нэг удаа тоглож, хүснэгтээр эрэмбэлэгдэнэ.",
};
