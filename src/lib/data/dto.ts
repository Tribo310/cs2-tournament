import type {
  BracketLink,
  GroupDoc,
  MatchDoc,
  SettingsDoc,
  TeamDoc,
} from "@/lib/db/types";

// Plain, serializable shapes passed to components (ObjectIds become hex strings).

export type Settings = Omit<SettingsDoc, "_id">;

export interface Player {
  id: string;
  nickname: string;
  fullName?: string;
  role: TeamDoc["players"][number]["role"];
  country?: string;
  sortOrder: number;
}

export interface Team {
  id: string;
  name: string;
  tag: string;
  logoUrl?: string;
  country?: string;
  city?: string;
  players: Player[];
}

export interface Group {
  id: string;
  name: string;
  sortOrder: number;
  teams: { teamId: string; tiebreakRank?: number }[];
}

export interface MatchMap {
  order: number;
  mapName: string;
  pickedBy?: string;
  team1Rounds: number;
  team2Rounds: number;
  status: MatchDoc["maps"][number]["status"];
}

export interface Link {
  matchId: string;
  slot: 1 | 2;
}

export interface Match {
  id: string;
  stage: MatchDoc["stage"];
  groupId?: string;
  bracket?: MatchDoc["bracket"];
  round?: number;
  position?: number;
  label?: string;
  team1Id?: string;
  team2Id?: string;
  format: MatchDoc["format"];
  status: MatchDoc["status"];
  scheduledAt?: Date;
  maps: MatchMap[];
  team1Score: number;
  team2Score: number;
  winnerId?: string;
  winnerManual: boolean;
  next?: Link;
  loserNext?: Link;
  streamUrl?: string;
  notes?: string;
  updatedAt: Date;
}

export function logoUrl(logoId: TeamDoc["logoId"]): string | undefined {
  // Logo ids change on every upload, so the URL is safe to cache forever
  return logoId ? `/api/logos/${logoId.toHexString()}` : undefined;
}

export function toSettings(doc: SettingsDoc): Settings {
  const { _id, ...rest } = doc;
  void _id;
  return rest;
}

export function toTeam(doc: TeamDoc): Team {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    tag: doc.tag,
    logoUrl: logoUrl(doc.logoId),
    country: doc.country,
    city: doc.city,
    players: [...doc.players]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ({
        id: p._id.toHexString(),
        nickname: p.nickname,
        fullName: p.fullName,
        role: p.role,
        country: p.country,
        sortOrder: p.sortOrder,
      })),
  };
}

export function toGroup(doc: GroupDoc): Group {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    sortOrder: doc.sortOrder,
    teams: doc.teams.map((t) => ({ teamId: t.teamId.toHexString(), tiebreakRank: t.tiebreakRank })),
  };
}

function toLink(link: BracketLink | undefined): Link | undefined {
  return link ? { matchId: link.matchId.toHexString(), slot: link.slot } : undefined;
}

export function toMatch(doc: MatchDoc): Match {
  return {
    id: doc._id.toHexString(),
    stage: doc.stage,
    groupId: doc.groupId?.toHexString(),
    bracket: doc.bracket,
    round: doc.round,
    position: doc.position,
    label: doc.label,
    team1Id: doc.team1Id?.toHexString(),
    team2Id: doc.team2Id?.toHexString(),
    format: doc.format,
    status: doc.status,
    scheduledAt: doc.scheduledAt,
    maps: [...doc.maps]
      .sort((a, b) => a.order - b.order)
      .map((m) => ({
        order: m.order,
        mapName: m.mapName,
        pickedBy: m.pickedBy?.toHexString(),
        team1Rounds: m.team1Rounds,
        team2Rounds: m.team2Rounds,
        status: m.status,
      })),
    team1Score: doc.team1Score,
    team2Score: doc.team2Score,
    winnerId: doc.winnerId?.toHexString(),
    winnerManual: doc.winnerManual,
    next: toLink(doc.next),
    loserNext: toLink(doc.loserNext),
    streamUrl: doc.streamUrl,
    notes: doc.notes,
    updatedAt: doc.updatedAt,
  };
}
