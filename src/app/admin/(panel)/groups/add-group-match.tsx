"use client";

import { PlusIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Field, NativeSelect, SubmitButton, useFormAction } from "@/components/admin/form";
import { Input } from "@/components/ui/input";
import { createMatch } from "@/lib/actions/matches";
import type { Group, Settings, Team } from "@/lib/data/dto";

/** The admin picks both teams and the time for each group match — nothing is generated. */
export function AddGroupMatch({
  group,
  teams,
  playedPairs,
  defaultFormat,
}: {
  group: Pick<Group, "id" | "name">;
  teams: Team[];
  playedPairs: [string, string][];
  defaultFormat: Settings["defaultGroupFormat"];
}) {
  const { state, onSubmit, pending, err } = useFormAction(createMatch);
  const formRef = useRef<HTMLFormElement>(null);
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");

  // Clear the form after a successful add so the next match can be entered
  const [clearedAt, setClearedAt] = useState<number>();
  if (state?.ok && state.at !== clearedAt) {
    setClearedAt(state.at);
    setTeam1("");
    setTeam2("");
  }
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  // Pairings without a match yet: shown as a hint only, the admin decides what to schedule
  const key = (a: string, b: string) => [a, b].sort().join(":");
  const scheduled = new Set(playedPairs.map(([a, b]) => key(a, b)));
  const open: [Team, Team][] = [];
  teams.forEach((a, i) =>
    teams.slice(i + 1).forEach((b) => {
      if (!scheduled.has(key(a.id, b.id))) open.push([a, b]);
    }),
  );

  if (teams.length < 2) return null;
  const id = (name: string) => `${name}-${group.id}`;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3 rounded-md border border-dashed p-3">
      <input type="hidden" name="groupId" value={group.id} />
      <input type="hidden" name="stay" value="1" />
      <p className="text-sm font-medium">Тоглолт нэмэх</p>

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <Field label="Баг 1" htmlFor={id("team1")} error={err("team1Id")}>
          <NativeSelect id={id("team1")} name="team1Id" required value={team1} onChange={(e) => setTeam1(e.target.value)}>
            <option value="">Сонгох…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === team2}>
                {t.tag}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <span className="pb-3 text-xs text-muted-foreground">vs</span>
        <Field label="Баг 2" htmlFor={id("team2")} error={err("team2Id")}>
          <NativeSelect id={id("team2")} name="team2Id" required value={team2} onChange={(e) => setTeam2(e.target.value)}>
            <option value="">Сонгох…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === team1}>
                {t.tag}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <div className="grid grid-cols-[1fr_6rem] gap-2">
        <Field label="Огноо, цаг" htmlFor={id("at")} error={err("scheduledAt")}>
          <Input id={id("at")} name="scheduledAt" type="datetime-local" />
        </Field>
        <Field label="Формат" htmlFor={id("format")}>
          <NativeSelect id={id("format")} name="format" defaultValue={defaultFormat}>
            <option value="bo1">BO1</option>
            <option value="bo3">BO3</option>
            <option value="bo5">BO5</option>
          </NativeSelect>
        </Field>
      </div>

      {open.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Хараахан товлоогүй хосууд (дарж сонгоно):</p>
          <div className="flex flex-wrap gap-1.5">
            {open.map(([a, b]) => (
              <button
                key={`${a.id}-${b.id}`}
                type="button"
                onClick={() => {
                  setTeam1(a.id);
                  setTeam2(b.id);
                }}
                className="h-8 rounded-full border px-3 text-xs transition-colors hover:border-primary/60 hover:text-primary"
              >
                {a.tag} – {b.tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <SubmitButton pending={pending} variant="secondary">
          <PlusIcon aria-hidden /> Тоглолт нэмэх
        </SubmitButton>
      </div>
    </form>
  );
}
