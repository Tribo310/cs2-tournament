import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MatchRow } from "@/components/admin/match-row";
import { PageHeader, PageSkeleton, Section } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth/session";
import { matchContext } from "@/lib/tournament/context";
import type { Match } from "@/lib/data/dto";
import { getSettings, listGroups, listMatches, listTeams } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Хянах самбар" };

async function Content() {
  await requireAdmin();
  const [settings, teams, groups, matches] = await Promise.all([
    getSettings(),
    listTeams(),
    listGroups(),
    listMatches(),
  ]);
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const context = (m: Match) => matchContext({ settings, groups, matches }, m);

  const live = matches.filter((m) => m.status === "live");
  const upcoming = matches.filter((m) => m.status === "scheduled").slice(0, 6);
  const finished = matches.filter((m) => m.status === "finished").length;

  const steps = [
    { done: settings.name !== "CS2 Тэмцээн" || Boolean(settings.startsOn), label: "Тэмцээний тохиргоо", href: "/admin/settings" },
    { done: teams.length >= 2, label: `Багууд бүртгэх (${teams.length})`, href: "/admin/teams" },
    { done: groups.some((g) => g.teams.length >= 2), label: `Групп үүсгэж баг хуваарилах (${groups.length})`, href: "/admin/groups" },
    { done: matches.some((m) => m.stage === "group"), label: "Группийн тоглолтууд үүсгэх", href: "/admin/groups" },
    { done: matches.some((m) => m.stage === "playoff"), label: "Плей-оффын шат үүсгэх", href: "/admin/bracket" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Баг", teams.length],
          ["Групп", groups.length],
          ["Тоглолт", `${finished}/${matches.length}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border bg-card p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="tabular font-heading text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {steps.some((s) => !s.done) && (
        <Section
          title="Эхлэх алхмууд"
          actions={
            <Link href="/admin/guide" className="text-sm text-primary underline-offset-4 hover:underline">
              Гарын авлага
            </Link>
          }
        >
          <ol className="space-y-1">
            {steps.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className="flex h-10 items-center gap-2 rounded-md px-2 text-sm hover:bg-muted">
                  {s.done ? (
                    <CheckCircle2Icon className="size-4 text-win" aria-label="Хийгдсэн" />
                  ) : (
                    <CircleIcon className="size-4 text-muted-foreground" aria-label="Хийгдээгүй" />
                  )}
                  <span className={s.done ? "text-muted-foreground line-through" : ""}>{s.label}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Section>
      )}

      <Section title={`Шууд явагдаж буй · ${live.length}`}>
        {live.length === 0 ? (
          <p className="text-sm text-muted-foreground">Одоогоор шууд тоглолт алга.</p>
        ) : (
          <ul className="space-y-2">
            {live.map((m) => (
              <li key={m.id}>
                <MatchRow match={m} teams={teamMap} context={context(m)} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Дараагийн тоглолтууд"
        actions={
          <Link href="/admin/matches?status=scheduled" className="text-sm text-muted-foreground hover:text-foreground">
            Бүгдийг харах
          </Link>
        }
      >
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Товлогдсон тоглолт алга.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((m) => (
              <li key={m.id}>
                <MatchRow match={m} teams={teamMap} context={context(m)} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Хянах самбар" />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}
