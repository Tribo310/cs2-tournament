import { MongoClient, type Db } from "mongodb";
import type {
  AdminDoc,
  GroupDoc,
  LogoDoc,
  MatchDoc,
  SettingsDoc,
  TeamDoc,
} from "./types";

const DEFAULT_DB_NAME = "cs2_tournament";

// Reuse one client per server instance (and across dev hot reloads).
const globalForMongo = globalThis as unknown as {
  mongoClientPromise?: Promise<MongoClient>;
};

function getClient(): Promise<MongoClient> {
  if (!globalForMongo.mongoClientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set");
    globalForMongo.mongoClientPromise = new MongoClient(uri, {
      appName: "cs2-tournament",
      maxPoolSize: 10,
      // Optional fields set to undefined are omitted instead of stored as null
      ignoreUndefined: true,
    }).connect();
  }
  return globalForMongo.mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB || DEFAULT_DB_NAME);
}

export async function collections() {
  const db = await getDb();
  return {
    settings: db.collection<SettingsDoc>("settings"),
    admins: db.collection<AdminDoc>("admins"),
    teams: db.collection<TeamDoc>("teams"),
    logos: db.collection<LogoDoc>("logos"),
    groups: db.collection<GroupDoc>("groups"),
    matches: db.collection<MatchDoc>("matches"),
  };
}

export async function closeDb() {
  if (globalForMongo.mongoClientPromise) {
    const client = await globalForMongo.mongoClientPromise;
    await client.close();
    globalForMongo.mongoClientPromise = undefined;
  }
}
