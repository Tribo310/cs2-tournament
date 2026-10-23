"use client";

import { ExternalLinkIcon, SaveIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { NativeSelect, SubmitButton, useFormAction } from "@/components/admin/form";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { updateSchedule } from "@/lib/actions/matches";
import type { Match } from "@/lib/data/dto";
import { STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

export interface TeamOption {
  id: string;
  label: string;
  tag: string;
}

export interface ScheduleRowData {
  id: string;
  context: string;
  status: Match["status"];
  format: Match["format"];
  scheduledAt: string; // datetime-local value in tournament time
  team1Id: string;
  team2Id: string;
  team1Tag: string;
  team2Tag: string;
  score?: string;
  options: TeamOption[];
}

export function ScheduleRow({ row }: { row: ScheduleRowData }) {
  const { onSubmit, pending, err } = useFormAction(updateSchedule.bind(null, row.id));
  const editableTeams = row.status === "scheduled";
  const initial = { at: row.scheduledAt, format: row.format, t1: row.team1Id, t2: row.team2Id };
  const [values, setValues] = useState(initial);

  // Take the server's values after a save (or a change made elsewhere)
  const [prev, setPrev] = useState(initial);
  if (JSON.stringify(prev) !== JSON.stringify(initial)) {
    setPrev(initial);
    setValues(initial);
  }
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const teamSelect = (name: "team1Id" | "team2Id", key: "t1" | "t2", other: string) => (
    <NativeSelect
      name={name}
      aria-label={name === "team1Id" ? "Баг 1" : "Баг 2"}
      value={values[key]}
      onChange={set(key)}
      aria-invalid={Boolean(err(name)) || undefined}
      className="h-10"
    >
      <option value="">TBD</option>
      {row.options.map((t) => (
        <option key={t.id} value={t.id} disabled={t.id === other}>
          {t.label}
        </option>
      ))}
    </NativeSelect>
  );

  return (
    <li className={cn("px-3 py-3", dirty && "bg-primary/5")}>
      <form onSubmit={onSubmit} className="grid gap-2 lg:grid-cols-[10rem_minmax(0,1fr)_13rem_6rem_auto] lg:items-center">
        <div className="flex items-center gap-2 text-xs text-muted-foreground lg:flex-col lg:items-start lg:gap-1">
          <span className="truncate font-medium text-foreground">{row.context}</span>
          <span className="flex items-center gap-1.5">
            {row.status !== "scheduled" && (
              <Badge variant={row.status === "live" ? "destructive" : "outline"}>{STATUS_LABELS[row.status]}</Badge>
            )}
            {row.score && <span className="tabular font-heading text-sm text-foreground">{row.score}</span>}
          </span>
        </div>

        {editableTeams ? (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            {teamSelect("team1Id", "t1", values.t2)}
            <span className="text-xs text-muted-foreground">vs</span>
            {teamSelect("team2Id", "t2", values.t1)}
          </div>
        ) : (
          <p className="font-heading font-bold">
            {row.team1Tag} <span className="text-xs font-normal text-muted-foreground">vs</span> {row.team2Tag}
          </p>
        )}

        <Input
          name="scheduledAt"
          type="datetime-local"
          aria-label="Огноо, цаг"
          value={values.at}
          onChange={set("at")}
          aria-invalid={Boolean(err("scheduledAt")) || undefined}
          className="h-10"
        />
        <NativeSelect name="format" aria-label="Формат" value={values.format} onChange={set("format")} className="h-10">
          <option value="bo1">BO1</option>
          <option value="bo3">BO3</option>
          <option value="bo5">BO5</option>
        </NativeSelect>

        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/admin/matches/${row.id}`}
            aria-label="Тоглолтыг удирдах"
            className="grid size-10 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLinkIcon className="size-4" />
          </Link>
          <SubmitButton pending={pending} disabled={pending || !dirty} className="h-10 min-w-0 px-3" aria-label="Хадгалах">
            <SaveIcon aria-hidden />
            <span className="lg:sr-only xl:not-sr-only">Хадгалах</span>
          </SubmitButton>
        </div>
      </form>
    </li>
  );
}
