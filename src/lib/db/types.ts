import type { Binary, ObjectId } from "mongodb";

// Document shapes for every MongoDB collection.
// Validators in scripts/db-setup.ts must stay in sync with these types.

export const MATCH_FORMATS = ["bo1", "bo3", "bo5"] as const;
export type MatchFormat = (typeof MATCH_FORMATS)[number];

export const MATCH_STATUSES = ["scheduled", "live", "finished"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const MAP_STATUSES = ["upcoming", "live", "finished"] as const;
export type MapStatus = (typeof MAP_STATUSES)[number];

export const BRACKET_TYPES = ["single", "double"] as const;
export type BracketType = (typeof BRACKET_TYPES)[number];

export const BRACKET_SIZES = [4, 8, 16] as const;
export type BracketSize = (typeof BRACKET_SIZES)[number];

export const BRACKET_SIDES = ["upper", "lower", "final"] as const;
export type BracketSide = (typeof BRACKET_SIDES)[number];

export const PLAYER_ROLES = ["player", "sub", "coach"] as const;
export type PlayerRole = (typeof PLAYER_ROLES)[number];

// Max players per role on one roster
export const ROSTER_LIMITS: Record<PlayerRole, number> = {
  player: 5,
  sub: 1,
  coach: 1,
};

// Active Duty + common extras; the admin form offers these but any name is allowed
export const CS2_MAPS = [
  "Mirage",
  "Inferno",
  "Nuke",
  "Ancient",
  "Anubis",
  "Dust2",
  "Train",
  "Overpass",
  "Vertigo",
] as const;

export const SETTINGS_ID = "tournament";

export interface SettingsDoc {
  _id: typeof SETTINGS_ID;
  name: string;
  description?: string;
  startsOn?: Date;
  endsOn?: Date;
  bracketType: BracketType;
  bracketSize: BracketSize;
  teamsAdvancePerGroup: number;
  pointsWin: number;
  pointsLoss: number;
  defaultGroupFormat: MatchFormat;
  updatedAt: Date;
}

export interface AdminDoc {
  _id: ObjectId;
  username: string; // stored lowercased, see lib/auth/username.ts
  passwordHash: string;
  name?: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface Player {
  _id: ObjectId;
  nickname: string;
  fullName?: string;
  role: PlayerRole;
  country?: string;
  sortOrder: number;
}

export interface TeamDoc {
  _id: ObjectId;
  name: string;
  tag: string;
  logoId?: ObjectId;
  country?: string;
  city?: string;
  players: Player[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LogoDoc {
  _id: ObjectId;
  contentType: string;
  data: Binary;
  size: number;
  createdAt: Date;
}

export interface GroupTeam {
  teamId: ObjectId;
  // Last-resort tiebreaker set by the admin when everything else is equal (lower = higher rank)
  tiebreakRank?: number;
}

export interface GroupDoc {
  _id: ObjectId;
  name: string;
  sortOrder: number;
  teams: GroupTeam[];
  createdAt: Date;
}

export interface MatchMap {
  order: number; // 1..5
  mapName: string;
  pickedBy?: ObjectId; // undefined = decider
  team1Rounds: number;
  team2Rounds: number;
  status: MapStatus;
}

export interface BracketLink {
  matchId: ObjectId;
  slot: 1 | 2; // 1 = team1, 2 = team2
}

export interface MatchDoc {
  _id: ObjectId;
  stage: "group" | "playoff";
  groupId?: ObjectId;

  // Playoff position: bracket side, round (1 = first) and slot within the round
  bracket?: BracketSide;
  round?: number;
  position?: number;
  label?: string;

  team1Id?: ObjectId;
  team2Id?: ObjectId;
  format: MatchFormat;
  status: MatchStatus;
  scheduledAt?: Date;

  maps: MatchMap[];

  // Derived from maps by deriveMatchResult() on every write
  team1Score: number;
  team2Score: number;
  winnerId?: ObjectId;
  // true when the admin set the winner by hand (forfeit, technical win)
  winnerManual: boolean;

  // Bracket wiring: where the winner / loser goes next
  next?: BracketLink;
  loserNext?: BracketLink;

  streamUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
