import type { Metadata } from "next";
import { Suspense } from "react";
import { CardGridSkeleton, PageTitle } from "@/components/site/section";
import { getSnapshot, matchContext, teamLookup } from "@/lib/data/public";
import { dayKey, formatDayLabel } from "@/lib/time";
import { ScheduleList, type ScheduleItem } from "./schedule-list";

export const metadata: Metadata = {
  title: "Хуваарь ба үр дүн",
  description: "Бүх тоглолтын хуваарь, шууд болон дууссан тоглолтын үр дүн.",
};

async function Schedule() {
  const s = await getSnapshot();
  const teams = teamLookup(s);

  // Dates are formatted on the server so client filtering never depends on the browser's locale data
  const items: ScheduleItem[] = s.matches.map((m) => ({
    match: m,
    team1: m.team1Id ? teams[m.team1Id] : undefined,
    team2: m.team2Id ? teams[m.team2Id] : undefined,
    context: matchContext(s, m),
    day: m.scheduledAt ? dayKey(m.scheduledAt) : "",
    dayLabel: m.scheduledAt ? formatDayLabel(m.scheduledAt) : "Цаг тодорхойгүй",
  }));

  return (
    <Suspense fallback={<CardGridSkeleton />}>
      <ScheduleList items={items} groups={s.groups.map((g) => ({ id: g.id, name: g.name }))} />
    </Suspense>
  );
}

export default function SchedulePage() {
  return (
    <>
      <PageTitle title="Хуваарь ба үр дүн" description="Цаг бүгд Улаанбаатарын цагаар." />
      <Suspense fallback={<CardGridSkeleton />}>
        <Schedule />
      </Suspense>
    </>
  );
}
