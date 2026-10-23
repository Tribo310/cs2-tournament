/**
 * Fills the database with a realistic demo tournament: 9 teams in 3 groups, the top 2 of
 * each group play a knockout round and the 3 winners play a round-robin final.
 * Admins are kept. Settings: the playoff format is set to match the demo; name, description
 * and dates are only filled when still empty/default.
 *
 *   pnpm db:seed-demo           # refuses if demo teams or a playoff already exist
 *   pnpm db:seed-demo --reset   # remove previous demo data first (your own teams are kept)
 *   pnpm db:clear               # wipe ALL teams, logos, groups and matches (before the real event)
 */
import { deflateSync } from "node:zlib";
import { Binary, ObjectId } from "mongodb";
import { closeDb, collections } from "../src/lib/db/mongo";
import { SETTINGS_ID, type GroupDoc, type MatchDoc, type MatchMap, type TeamDoc } from "../src/lib/db/types";
import { planBracket, suggestFirstRound } from "../src/lib/tournament/bracket-plan";
import { deriveMatchResult } from "../src/lib/tournament/match";
import { computeStandings } from "../src/lib/tournament/standings";

// --- Demo content ------------------------------------------------------------------

const TEAMS = [
  { name: "Steppe Wolves", tag: "STP", city: "Улаанбаатар", colors: ["#1f2937", "#ff8a1f"], shape: "circle" },
  { name: "Gobi Snipers", tag: "GOBI", city: "Даланзадгад", colors: ["#e8b341", "#3b2f12"], shape: "diagonal" },
  { name: "Altai Eagles", tag: "ALT", city: "Өлгий", colors: ["#0f3d5c", "#5aa9f2"], shape: "chevron" },
  { name: "Khangai Kings", tag: "KHG", city: "Цэцэрлэг", colors: ["#3d1d5c", "#f05252"], shape: "diamond" },
  { name: "Ulaanbaatar Five", tag: "UB5", city: "Улаанбаатар", colors: ["#7f1d1d", "#f8fafc"], shape: "stripes" },
  { name: "Orkhon Riders", tag: "ORK", city: "Хархорин", colors: ["#064e3b", "#3ddc84"], shape: "circle" },
  { name: "Tuul Tigers", tag: "TUUL", city: "Улаанбаатар", colors: ["#f97316", "#111827"], shape: "stripes" },
  { name: "Darkhan Dragons", tag: "DRK", city: "Дархан", colors: ["#111827", "#e11d48"], shape: "chevron" },
  { name: "Selenge Sharks", tag: "SEL", city: "Сүхбаатар", colors: ["#0c4a6e", "#e8b341"], shape: "diamond" },
] as const;

// Teams per group, in TEAMS order: A = STP GOBI ALT, B = KHG UB5 ORK, C = TUUL DRK SEL
const GROUP_SIZE = 3;
const GROUP_NAMES = ["Групп A", "Групп B", "Групп C"];

const NICKS = [
  "Temka", "Bataa", "zorigoo", "Khuslen", "Nomio", "Ganzo", "Tulga", "erdene", "Saruul", "Munkh",
  "Bilguun", "Anar", "Dulguun", "Enkhee", "Gerelt", "itgel", "Javkhaa", "Khatan", "Lkhagva", "Mandakh",
  "Naraa", "Orgil", "Purev", "Sukh", "Temuulen", "Uuganaa", "Usukh", "Zolboo", "Altan", "Bayar",
  "Chinzo", "Delger", "Enkhjin", "Gantulga", "Khongor", "Jargal", "Nyam", "Otgon", "Sodoo", "Tsogt",
  "Erkhes", "Mergen", "Tengis", "Uyanga", "Zayaa",
];
const SUBS = ["Ariun", "Boldoo", "Nasaa", "Tergel", "Bilegt"];
const COACHES = [
  "coach Ganbold", "coach Erka", "coach Tuvshin", "coach Bayaraa", "coach Sukhee",
  "coach Oyuka", "coach Battulga", "coach Zaya", "coach Sergelen",
];
const GIVEN = [
  "Тэмүүжин", "Батбаяр", "Зоригт", "Хүслэн", "Номин", "Ганзориг", "Тулга", "Эрдэнэ", "Саруул", "Мөнх",
  "Билгүүн", "Анар", "Дөлгөөн", "Энхжаргал", "Гэрэлт", "Итгэл", "Жавхлан", "Хатанбаатар", "Лхагва", "Мандах",
  "Наран", "Оргил", "Пүрэв", "Сүх", "Тэмүүлэн", "Ууганбаяр", "Өсөх", "Золбоо", "Алтан", "Баяр",
  "Чинзориг", "Дэлгэр", "Энхжин", "Гантулга", "Хонгор", "Жаргал", "Ням", "Отгон", "Содбаяр", "Цогт",
  "Эрхэс", "Мэргэн", "Тэнгис", "Уянга", "Заяа",
];
const INITIALS = "БГДЭЖЗМНОСТЦ";

// Group results (3 teams each: 0v1, 0v2, 1v2): [team1, team2, maps as [map, team1 rounds, team2 rounds, picked by 1|2|0]]
type Result = [number, number, [string, number, number, 0 | 1 | 2][]];
const GROUP_RESULTS: Result[][] = [
  // A: STP 2-0, GOBI 1-1, ALT 0-2
  [
    [0, 1, [["Mirage", 13, 10, 1], ["Nuke", 9, 13, 2], ["Inferno", 16, 14, 0]]],
    [0, 2, [["Dust2", 13, 4, 1], ["Mirage", 13, 9, 2]]],
    [1, 2, [["Anubis", 11, 13, 1], ["Mirage", 13, 5, 2], ["Dust2", 19, 17, 0]]],
  ],
  // B: ORK 2-0, UB5 1-1, KHG 0-2
  [
    [0, 1, [["Ancient", 7, 13, 1], ["Train", 9, 13, 2]]],
    [0, 2, [["Nuke", 13, 9, 1], ["Mirage", 12, 16, 2], ["Inferno", 10, 13, 0]]],
    [1, 2, [["Anubis", 11, 13, 1], ["Train", 7, 13, 2]]],
  ],
  // C: DRK 2-0, SEL 1-1, TUUL 0-2
  [
    [0, 1, [["Mirage", 13, 11, 1], ["Inferno", 8, 13, 2], ["Nuke", 10, 13, 0]]],
    [0, 2, [["Dust2", 3, 13, 1], ["Anubis", 8, 13, 2]]],
    [1, 2, [["Ancient", 13, 6, 1], ["Train", 13, 10, 2]]],
  ],
];

// --- Helpers ---------------------------------------------------------------------------

const HOUR = 3_600_000;

/** A time in Ulaanbaatar (UTC+8) relative to today's date there. */
function ubTime(dayOffset: number, hour: number, minute = 0): Date {
  const ubNow = new Date(Date.now() + 8 * HOUR);
  return new Date(Date.UTC(ubNow.getUTCFullYear(), ubNow.getUTCMonth(), ubNow.getUTCDate() + dayOffset, hour - 8, minute));
}

function roundTo(date: Date, minutes: number): Date {
  const step = minutes * 60_000;
  return new Date(Math.round(date.getTime() / step) * step);
}

/** Tiny dependency-free PNG encoder for the generated team logos. */
function png(size: number, pixel: (x: number, y: number) => [number, number, number]): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const hex = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];

function logo(colors: readonly [string, string], shape: string): Buffer {
  const [bg, fg] = [hex(colors[0]), hex(colors[1])];
  const S = 128;
  const c = S / 2;
  return png(S, (x, y) => {
    const dx = x - c + 0.5;
    const dy = y - c + 0.5;
    const inside = {
      circle: dx * dx + dy * dy < 34 * 34 && dx * dx + dy * dy > 20 * 20,
      diagonal: Math.abs(x - y) < 22,
      chevron: y > 30 && y < 104 && Math.abs(Math.abs(dx) - (y - 30) * 0.8) < 14,
      diamond: Math.abs(dx) + Math.abs(dy) < 40 && Math.abs(dx) + Math.abs(dy) > 22,
      stripes: Math.floor((x + y) / 16) % 2 === 0 && dx * dx + dy * dy < 50 * 50,
    }[shape];
    return inside ? fg : bg;
  });
}

// --- Main ------------------------------------------------------------------------------

async function clear() {
  const { teams, logos, groups, matches } = await collections();
  const [t, l, g, m] = await Promise.all([
    teams.deleteMany({}),
    logos.deleteMany({}),
    groups.deleteMany({}),
    matches.deleteMany({}),
  ]);
  console.log(`cleared: ${t.deletedCount} teams, ${l.deletedCount} logos, ${g.deletedCount} groups, ${m.deletedCount} matches`);
}

const DEMO_TAGS = TEAMS.map((t) => t.tag as string);

/** Removes demo teams (by tag), demo groups, their matches and any playoff; keeps everything else. */
async function resetDemo() {
  const { teams, logos, groups, matches } = await collections();
  const demoTeams = await teams.find({ tag: { $in: DEMO_TAGS } }, { projection: { logoId: 1 } }).toArray();
  const teamIds = demoTeams.map((t) => t._id);
  const demoGroups = await groups.find({ name: { $in: GROUP_NAMES } }, { projection: { _id: 1 } }).toArray();
  const groupIds = demoGroups.map((g) => g._id);
  const m = await matches.deleteMany({
    $or: [
      { stage: "playoff" },
      { groupId: { $in: groupIds } },
      { team1Id: { $in: teamIds } },
      { team2Id: { $in: teamIds } },
    ],
  });
  const l = await logos.deleteMany({ _id: { $in: demoTeams.flatMap((t) => (t.logoId ? [t.logoId] : [])) } });
  const g = await groups.deleteMany({ _id: { $in: groupIds } });
  const t = await teams.deleteMany({ _id: { $in: teamIds } });
  console.log(`removed demo data: ${t.deletedCount} teams, ${l.deletedCount} logos, ${g.deletedCount} groups, ${m.deletedCount} matches`);
}

async function seed() {
  const c = await collections();
  if ((await c.teams.countDocuments({ tag: { $in: DEMO_TAGS } })) || (await c.matches.countDocuments({ stage: "playoff" }))) {
    console.error("Demo teams or a playoff already exist. Run `pnpm db:seed-demo --reset` to replace the demo data.");
    process.exitCode = 1;
    return;
  }
  const settings = await c.settings.findOne({ _id: SETTINGS_ID });
  if (!settings) throw new Error("Settings document missing — run `pnpm db:setup` first");

  // Playoff format must match the demo; text fields are only filled while still default
  await c.settings.updateOne(
    { _id: SETTINGS_ID },
    {
      $set: {
        bracketType: "knockout_rr",
        bracketSize: 6,
        teamsAdvancePerGroup: 2,
        ...(settings.name === "CS2 Тэмцээн" ? { name: "Монгол CS2 Лиг 2026" } : {}),
        ...(settings.description ? {} : { description: "Улаанбаатар хотын нээлттэй CS2 тэмцээн · 9 баг · 3 групп · шигшээ + финалын тойрог" }),
        ...(settings.startsOn ? {} : { startsOn: ubTime(-2, 0), endsOn: ubTime(1, 0) }),
        updatedAt: new Date(),
      },
    },
  );

  // Teams with generated logos and full rosters
  const now = new Date();
  const teamDocs: TeamDoc[] = TEAMS.map((t, i) => {
    const logoId = new ObjectId();
    return {
      _id: new ObjectId(),
      name: t.name,
      tag: t.tag,
      logoId,
      country: "Монгол",
      city: t.city,
      players: [
        ...Array.from({ length: 5 }, (_, j) => ({
          _id: new ObjectId(),
          nickname: NICKS[i * 5 + j],
          fullName: `${INITIALS[(i * 5 + j) % INITIALS.length]}. ${GIVEN[i * 5 + j]}`,
          role: "player" as const,
          country: "Монгол",
          sortOrder: j,
        })),
        ...(i % 2 === 0 ? [{ _id: new ObjectId(), nickname: SUBS[i / 2], role: "sub" as const, sortOrder: 5 }] : []),
        { _id: new ObjectId(), nickname: COACHES[i], role: "coach" as const, sortOrder: 6 },
      ],
      createdAt: now,
      updatedAt: now,
    };
  });
  await c.logos.insertMany(
    teamDocs.map((t, i) => {
      const data = logo(TEAMS[i].colors, TEAMS[i].shape);
      return { _id: t.logoId!, contentType: "image/png" as const, data: new Binary(data), size: data.length, createdAt: now };
    }),
  );
  await c.teams.insertMany(teamDocs);

  // Groups: reuse an existing empty group with the same name instead of failing on it
  const groupDocs: GroupDoc[] = [];
  for (const [gi, name] of GROUP_NAMES.entries()) {
    const teams = teamDocs.slice(gi * GROUP_SIZE, (gi + 1) * GROUP_SIZE).map((t) => ({ teamId: t._id }));
    const doc = await c.groups.findOneAndUpdate(
      { name },
      { $set: { teams, sortOrder: gi }, $setOnInsert: { name, createdAt: now } },
      { upsert: true, returnDocument: "after" },
    );
    groupDocs.push(doc!);
  }

  // Group stage: played over the last two days, all finished
  const matchDocs: MatchDoc[] = [];
  const finished = (base: Omit<MatchDoc, "team1Score" | "team2Score" | "winnerManual" | "createdAt" | "updatedAt">, at: Date) => {
    const m = { ...base, team1Score: 0, team2Score: 0, winnerManual: false, createdAt: at, updatedAt: new Date(at.getTime() + 2 * HOUR) } as MatchDoc;
    return { ...m, ...deriveMatchResult(m) };
  };
  const toMaps = (team1: ObjectId, team2: ObjectId, maps: Result[2]): MatchMap[] =>
    maps.map(([mapName, a, b, pick], i) => ({
      order: i + 1,
      mapName,
      team1Rounds: a,
      team2Rounds: b,
      status: "finished",
      pickedBy: pick === 1 ? team1 : pick === 2 ? team2 : undefined,
    }));
  GROUP_RESULTS.forEach((results, gi) => {
    const group = groupDocs[gi];
    const ids = group.teams.map((t) => t.teamId);
    results.forEach(([a, b, maps], i) => {
      const at = ubTime(i < 2 ? -2 : -1, 12 + gi * 3 + (i === 1 ? 1 : 0));
      matchDocs.push(
        finished(
          {
            _id: new ObjectId(),
            stage: "group",
            groupId: group._id,
            team1Id: ids[a],
            team2Id: ids[b],
            format: "bo3",
            status: "finished",
            scheduledAt: at,
            maps: toMaps(ids[a], ids[b], maps),
          },
          at,
        ),
      );
    });
  });

  // Playoff: knockout round paired like the admin's suggestion (A1–B2, B1–C2, C1–A2),
  // then the 3 winners play each other once
  const points = { pointsWin: settings.pointsWin, pointsLoss: settings.pointsLoss };
  const ordered = groupDocs.map((g) =>
    computeStandings(g, matchDocs.filter((m) => m.groupId?.equals(g._id)), points).map((r) => r.teamId),
  );
  const pairs = suggestFirstRound(ordered, 2, 6).map(([a, b]) => [new ObjectId(a), new ObjectId(b)] as const);
  const plan = planBracket("knockout_rr", 6);
  const ids = new Map(plan.map((m) => [m.key, new ObjectId()]));
  const liveStart = roundTo(new Date(Date.now() - 50 * 60_000), 15);
  const playoffDocs: MatchDoc[] = plan.map((p) => {
    const pair = p.bracket === "upper" ? pairs[p.position - 1] : undefined;
    const base = {
      _id: ids.get(p.key)!,
      stage: "playoff" as const,
      bracket: p.bracket,
      round: p.round,
      position: p.position,
      team1Id: pair?.[0],
      team2Id: pair?.[1],
      format: "bo3" as const,
      next: p.next ? { matchId: ids.get(p.next.key)!, slot: p.next.slot } : undefined,
      nextExtra: p.nextExtra?.map((l) => ({ matchId: ids.get(l.key)!, slot: l.slot })),
      team1Score: 0,
      team2Score: 0,
      winnerManual: false,
      createdAt: now,
      updatedAt: now,
    };
    let doc: MatchDoc;
    if (p.bracket === "upper" && p.position === 1) {
      // Played earlier today
      const at = new Date(liveStart.getTime() - 3 * HOUR);
      doc = {
        ...base,
        status: "finished",
        scheduledAt: at,
        updatedAt: new Date(at.getTime() + 2 * HOUR),
        maps: [
          { order: 1, mapName: "Mirage", team1Rounds: 13, team2Rounds: 8, status: "finished", pickedBy: pair![0] },
          { order: 2, mapName: "Nuke", team1Rounds: 11, team2Rounds: 13, status: "finished", pickedBy: pair![1] },
          { order: 3, mapName: "Inferno", team1Rounds: 13, team2Rounds: 10, status: "finished" },
        ],
      };
    } else if (p.bracket === "upper" && p.position === 2) {
      // Live right now: first map done, second in progress
      doc = {
        ...base,
        status: "live",
        scheduledAt: liveStart,
        streamUrl: "https://www.twitch.tv/",
        maps: [
          { order: 1, mapName: "Ancient", team1Rounds: 13, team2Rounds: 9, status: "finished", pickedBy: pair![0] },
          { order: 2, mapName: "Anubis", team1Rounds: 7, team2Rounds: 9, status: "live", pickedBy: pair![1] },
          { order: 3, mapName: "Dust2", team1Rounds: 0, team2Rounds: 0, status: "upcoming" },
        ],
      };
    } else {
      doc = {
        ...base,
        status: "scheduled",
        scheduledAt:
          p.bracket === "upper"
            ? roundTo(new Date(liveStart.getTime() + 2.5 * HOUR), 30)
            : ubTime(1, 15 + (p.position - 1) * 3),
        maps: [],
      };
    }
    return { ...doc, ...deriveMatchResult(doc) };
  });

  // The finished knockout match already sent its winner into the round-robin final
  const byId = new Map(playoffDocs.map((m) => [m._id.toHexString(), m]));
  for (const m of playoffDocs) {
    if (m.bracket !== "upper" || !m.winnerId) continue;
    for (const link of [m.next, ...(m.nextExtra ?? [])]) {
      const target = link && byId.get(link.matchId.toHexString());
      if (target) target[link.slot === 1 ? "team1Id" : "team2Id"] = m.winnerId;
    }
  }
  matchDocs.push(...playoffDocs);

  await c.matches.insertMany(matchDocs);
  console.log(`seeded: ${teamDocs.length} teams (with logos and rosters), ${groupDocs.length} groups, ${matchDocs.length} matches`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--clear")) return clear();
  if (args.includes("--reset")) await resetDemo();
  await seed();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeDb);
