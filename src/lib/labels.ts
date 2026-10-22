import type { MapStatus, MatchStatus, PlayerRole } from "@/lib/db/types";

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
