import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState, PageTitle } from "@/components/site/section";
import { BracketSection } from "@/components/tournament/bracket";
import { Skeleton } from "@/components/ui/skeleton";
import type { Match } from "@/lib/data/dto";
import { getSnapshot, matchContext, teamLookup } from "@/lib/data/public";
import { ROUND_NAMES } from "@/lib/tournament/context";

export const metadata: Metadata = {
  title: "Плей-оффын шат",
  description: "Плей-оффын шигшээ тоглолтуудын шат.",
};

async function Bracket() {
  const s = await getSnapshot();
  const teams = teamLookup(s);
  const playoff = s.matches.filter((m) => m.stage === "playoff");
  const double = s.settings.bracketType === "double";

  if (playoff.length === 0) {
    return (
      <EmptyState>
        Плей-оффын шат хараахан гараагүй байна.
        <br />
        {double ? "Хоёр хасагдалттай" : "Нэг хасагдалттай"} · {s.settings.bracketSize} баг
      </EmptyState>
    );
  }

  const upper = playoff.filter((m) => m.bracket === "upper");
  const lower = playoff.filter((m) => m.bracket === "lower");
  const final = playoff.filter((m) => m.bracket === "final");
  const lastUpper = Math.max(...upper.map((m) => m.round ?? 1));
  const title = (m: Match) => {
    const t1 = m.team1Id ? teams[m.team1Id]?.name : "TBD";
    const t2 = m.team2Id ? teams[m.team2Id]?.name : "TBD";
    return `${matchContext(s, m)}: ${t1} – ${t2}`;
  };

  return (
    <div className="space-y-10">
      {upper.length > 0 && (
        <section aria-labelledby="upper" className="space-y-3">
          {double && (
            <h2 id="upper" className="text-lg font-extrabold">
              Дээд шат
            </h2>
          )}
          <BracketSection
            matches={upper}
            teams={teams}
            matchTitle={title}
            roundLabel={(r) => {
              const name = ROUND_NAMES[2 ** (lastUpper - r)] ?? `${r}-р тойрог`;
              return double && r === lastUpper ? "Дээд шатны финал" : name;
            }}
          />
        </section>
      )}

      {lower.length > 0 && (
        <section aria-labelledby="lower" className="space-y-3">
          <h2 id="lower" className="text-lg font-extrabold">
            Доод шат
          </h2>
          <BracketSection matches={lower} teams={teams} matchTitle={title} roundLabel={(r) => `${r}-р тойрог`} />
        </section>
      )}

      {final.length > 0 && (
        <section aria-labelledby="final" className="space-y-3">
          <h2 id="final" className="text-lg font-extrabold text-primary">
            Гранд финал
          </h2>
          <BracketSection matches={final} teams={teams} matchTitle={title} roundLabel={() => "Гранд финал"} />
        </section>
      )}
    </div>
  );
}

export default function BracketPage() {
  return (
    <>
      <PageTitle title="Плей-оффын шат" description="Тоглолт дээр дарж дэлгэрэнгүйг харна. Утсан дээр хажуу тийш гүйлгэнэ." />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Bracket />
      </Suspense>
    </>
  );
}
