import "server-only";
import type { ObjectId } from "mongodb";
import { UserError } from "@/lib/actions/shared";
import { collections } from "@/lib/db/mongo";
import type { MatchDoc } from "@/lib/db/types";
import { resolveSlot, slotChanges } from "@/lib/tournament/advance";
import { deriveMatchResult, maxMaps } from "@/lib/tournament/match";

type Patch = Partial<Omit<MatchDoc, "_id" | "createdAt" | "updatedAt" | "team1Score" | "team2Score">>;

/**
 * The single write path for an existing match: applies the patch, re-derives
 * scores/winner (replaces DB triggers), saves with optimistic concurrency and
 * advances the winner/loser through the bracket.
 */
export async function writeMatch(
  id: ObjectId,
  patch: Patch | ((current: MatchDoc) => Patch),
  opts: { expectedUpdatedAt?: Date } = {},
): Promise<MatchDoc> {
  const { matches } = await collections();
  const current = await matches.findOne({ _id: id });
  if (!current) throw new UserError("Тоглолт олдсонгүй.");

  if (opts.expectedUpdatedAt && current.updatedAt.getTime() !== opts.expectedUpdatedAt.getTime()) {
    throw new UserError("Энэ тоглолтыг өөр газраас өөрчилсөн байна. Хуудсаа шинэчилнэ үү.");
  }

  const changes = typeof patch === "function" ? patch(current) : patch;
  const next: MatchDoc = { ...current, ...changes, updatedAt: new Date() };

  // Drop "picked by" references to teams no longer in the match
  const inMatch = (teamId: ObjectId) =>
    Boolean(next.team1Id?.equals(teamId) || next.team2Id?.equals(teamId));
  next.maps = next.maps.map((m) =>
    m.pickedBy && !inMatch(m.pickedBy) ? { ...m, pickedBy: undefined } : m,
  );
  validate(next);
  Object.assign(next, deriveMatchResult(next));

  if (next.status === "finished" && !next.winnerId) {
    throw new UserError(
      "Ялагч тодорхойгүй байна. Картын оноог дуусгах эсвэл ялагчийг гараар сонгоно уу.",
    );
  }

  // Check every bracket slot this change touches before saving anything
  const moves = await planMoves(current, next);

  const res = await matches.replaceOne({ _id: id, updatedAt: current.updatedAt }, next);
  if (res.matchedCount === 0) {
    throw new UserError("Энэ тоглолтыг өөр газраас өөрчилсөн байна. Хуудсаа шинэчилнэ үү.");
  }

  for (const move of moves) {
    await writeMatch(move.matchId, { [move.field]: move.value });
  }
  return next;
}

interface Move {
  matchId: ObjectId;
  field: "team1Id" | "team2Id";
  value: ObjectId | undefined;
}

async function planMoves(current: MatchDoc, next: MatchDoc): Promise<Move[]> {
  const { matches } = await collections();
  const moves: Move[] = [];
  for (const change of slotChanges(current, next)) {
    const target = await matches.findOne({ _id: change.link.matchId });
    if (!target) continue;
    const field = change.link.slot === 1 ? "team1Id" : "team2Id";
    const resolved = resolveSlot(target[field], change);
    if (!resolved) continue;

    if (target.status !== "scheduled") {
      throw new UserError(
        "Дараагийн шатны тоглолт эхэлсэн тул энэ үр дүнг өөрчлөх боломжгүй. Эхлээд тэр тоглолтыг \"Товлогдсон\" төлөвт буцаана уу.",
      );
    }
    const other = field === "team1Id" ? target.team2Id : target.team1Id;
    if (resolved.value && other?.equals(resolved.value)) {
      throw new UserError("Энэ баг дараагийн тоглолтын нөгөө талд аль хэдийн байна. Шатыг шалгана уу.");
    }
    moves.push({ matchId: target._id, field, value: resolved.value });
  }
  return moves;
}

export function validate(m: Pick<MatchDoc, "team1Id" | "team2Id" | "maps" | "format" | "status">) {
  if (m.team1Id && m.team2Id && m.team1Id.equals(m.team2Id)) {
    throw new UserError("Нэг баг өөртэйгөө тоглох боломжгүй.");
  }
  if (m.maps.length > maxMaps(m.format)) {
    throw new UserError(`${m.format.toUpperCase()} тоглолтод хамгийн ихдээ ${maxMaps(m.format)} карт байна.`);
  }
  const orders = new Set(m.maps.map((x) => x.order));
  if (orders.size !== m.maps.length) throw new UserError("Картын дараалал давхцаж байна.");
  if (m.status !== "scheduled" && (!m.team1Id || !m.team2Id)) {
    throw new UserError("Хоёр баг тодорхой болсны дараа тоглолтыг эхлүүлнэ.");
  }
}
