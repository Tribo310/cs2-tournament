/**
 * Creates collections with JSON-schema validators and indexes, and the settings document.
 * Idempotent: safe to run again after schema changes (validators are updated in place).
 *
 *   pnpm db:setup
 */
import type { Db, Document } from "mongodb";
import { USERNAME_PATTERN } from "../src/lib/auth/username";
import { closeDb, getDb } from "../src/lib/db/mongo";
import {
  BRACKET_SIDES,
  BRACKET_SIZES,
  BRACKET_TYPES,
  MAP_STATUSES,
  MATCH_FORMATS,
  MATCH_STATUSES,
  PLAYER_ROLES,
  SETTINGS_ID,
  type SettingsDoc,
} from "../src/lib/db/types";

const str = { bsonType: "string" };
const date = { bsonType: "date" };
const oid = { bsonType: "objectId" };
const int = { bsonType: ["int", "long"] };
const intMin0 = { bsonType: ["int", "long"], minimum: 0 };
const bool = { bsonType: "bool" };

const validators: Record<string, Document> = {
  settings: {
    bsonType: "object",
    required: ["_id", "name", "bracketType", "bracketSize", "teamsAdvancePerGroup", "pointsWin", "pointsLoss", "defaultGroupFormat", "updatedAt"],
    properties: {
      _id: { enum: [SETTINGS_ID] },
      name: { bsonType: "string", minLength: 1 },
      description: str,
      startsOn: date,
      endsOn: date,
      bracketType: { enum: [...BRACKET_TYPES] },
      bracketSize: { enum: [...BRACKET_SIZES] },
      teamsAdvancePerGroup: { bsonType: ["int", "long"], minimum: 1, maximum: 8 },
      pointsWin: intMin0,
      pointsLoss: intMin0,
      defaultGroupFormat: { enum: [...MATCH_FORMATS] },
      updatedAt: date,
    },
  },
  admins: {
    bsonType: "object",
    required: ["username", "passwordHash", "createdAt"],
    properties: {
      username: { bsonType: "string", pattern: USERNAME_PATTERN.source },
      passwordHash: { bsonType: "string", pattern: "^scrypt\\$" },
      name: str,
      createdAt: date,
      lastLoginAt: date,
    },
  },
  teams: {
    bsonType: "object",
    required: ["name", "tag", "players", "createdAt", "updatedAt"],
    properties: {
      name: { bsonType: "string", minLength: 1, maxLength: 64 },
      tag: { bsonType: "string", minLength: 1, maxLength: 8 },
      logoId: oid,
      country: str,
      city: str,
      players: {
        bsonType: "array",
        maxItems: 7,
        items: {
          bsonType: "object",
          required: ["_id", "nickname", "role", "sortOrder"],
          properties: {
            _id: oid,
            nickname: { bsonType: "string", minLength: 1, maxLength: 32 },
            fullName: str,
            role: { enum: [...PLAYER_ROLES] },
            country: str,
            sortOrder: int,
          },
        },
      },
      createdAt: date,
      updatedAt: date,
    },
  },
  logos: {
    bsonType: "object",
    required: ["contentType", "data", "size", "createdAt"],
    properties: {
      contentType: { enum: ["image/png", "image/jpeg", "image/webp"] },
      data: { bsonType: "binData" },
      size: { bsonType: ["int", "long"], minimum: 1, maximum: 1024 * 1024 },
      createdAt: date,
    },
  },
  groups: {
    bsonType: "object",
    required: ["name", "sortOrder", "teams", "createdAt"],
    properties: {
      name: { bsonType: "string", minLength: 1 },
      sortOrder: int,
      teams: {
        bsonType: "array",
        items: {
          bsonType: "object",
          required: ["teamId"],
          properties: { teamId: oid, tiebreakRank: int },
        },
      },
      createdAt: date,
    },
  },
  matches: {
    bsonType: "object",
    required: ["stage", "format", "status", "maps", "team1Score", "team2Score", "winnerManual", "createdAt", "updatedAt"],
    properties: {
      stage: { enum: ["group", "playoff"] },
      groupId: oid,
      bracket: { enum: [...BRACKET_SIDES] },
      round: { bsonType: ["int", "long"], minimum: 1 },
      position: { bsonType: ["int", "long"], minimum: 1 },
      label: str,
      team1Id: oid,
      team2Id: oid,
      format: { enum: [...MATCH_FORMATS] },
      status: { enum: [...MATCH_STATUSES] },
      scheduledAt: date,
      maps: {
        bsonType: "array",
        maxItems: 5,
        items: {
          bsonType: "object",
          required: ["order", "mapName", "team1Rounds", "team2Rounds", "status"],
          properties: {
            order: { bsonType: ["int", "long"], minimum: 1, maximum: 5 },
            mapName: { bsonType: "string", minLength: 1 },
            pickedBy: oid,
            team1Rounds: intMin0,
            team2Rounds: intMin0,
            status: { enum: [...MAP_STATUSES] },
          },
        },
      },
      team1Score: intMin0,
      team2Score: intMin0,
      winnerId: oid,
      winnerManual: bool,
      next: {
        bsonType: "object",
        required: ["matchId", "slot"],
        properties: { matchId: oid, slot: { enum: [1, 2] } },
      },
      loserNext: {
        bsonType: "object",
        required: ["matchId", "slot"],
        properties: { matchId: oid, slot: { enum: [1, 2] } },
      },
      streamUrl: str,
      notes: str,
      createdAt: date,
      updatedAt: date,
    },
    // Group matches need a group; playoff matches need a bracket position
    anyOf: [
      {
        properties: { stage: { enum: ["group"] } },
        required: ["groupId"],
        not: { required: ["bracket"] },
      },
      {
        properties: { stage: { enum: ["playoff"] } },
        required: ["bracket", "round", "position"],
      },
    ],
  },
};

const caseInsensitive = { locale: "en", strength: 2 };

async function ensureCollection(db: Db, name: string, schema: Document) {
  const existing = await db.listCollections({ name }).toArray();
  const validator = { $jsonSchema: schema };
  if (existing.length === 0) {
    await db.createCollection(name, { validator, validationLevel: "strict" });
    console.log(`created  ${name}`);
  } else {
    await db.command({ collMod: name, validator, validationLevel: "strict" });
    console.log(`updated  ${name}`);
  }
}

async function main() {
  const db = await getDb();
  console.log(`database ${db.databaseName}`);

  for (const [name, schema] of Object.entries(validators)) {
    await ensureCollection(db, name, schema);
  }

  // Admins log in by username (earlier versions used email)
  const adminIndexes = await db.collection("admins").indexes();
  if (adminIndexes.some((i) => i.name === "email_1")) await db.collection("admins").dropIndex("email_1");
  await db.collection("admins").createIndex({ username: 1 }, { unique: true });
  await db.collection("teams").createIndex({ name: 1 }, { unique: true, collation: caseInsensitive });
  await db.collection("teams").createIndex({ tag: 1 }, { unique: true, collation: caseInsensitive });
  await db.collection("groups").createIndex({ name: 1 }, { unique: true, collation: caseInsensitive });
  // A team can be in only one group
  await db.collection("groups").createIndex(
    { "teams.teamId": 1 },
    { unique: true, partialFilterExpression: { "teams.teamId": { $exists: true } } },
  );
  await db.collection("matches").createIndex({ status: 1, scheduledAt: 1 });
  await db.collection("matches").createIndex({ stage: 1, groupId: 1 });
  await db.collection("matches").createIndex({ team1Id: 1 });
  await db.collection("matches").createIndex({ team2Id: 1 });
  await db.collection("matches").createIndex(
    { bracket: 1, round: 1, position: 1 },
    { unique: true, partialFilterExpression: { stage: "playoff" } },
  );
  console.log("indexes  ok");

  const defaults: SettingsDoc = {
    _id: SETTINGS_ID,
    name: "CS2 Тэмцээн",
    bracketType: "single",
    bracketSize: 8,
    teamsAdvancePerGroup: 2,
    pointsWin: 1,
    pointsLoss: 0,
    defaultGroupFormat: "bo3",
    updatedAt: new Date(),
  };
  const res = await db
    .collection<SettingsDoc>("settings")
    .updateOne({ _id: SETTINGS_ID }, { $setOnInsert: defaults }, { upsert: true });
  console.log(res.upsertedCount ? "settings created" : "settings exists");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeDb);
