// Cache tags for public "use cache" reads; admin Server Actions expire them after writes.
export const TAGS = {
  settings: "settings",
  teams: "teams",
  groups: "groups",
  matches: "matches",
} as const;

export type Tag = (typeof TAGS)[keyof typeof TAGS];
