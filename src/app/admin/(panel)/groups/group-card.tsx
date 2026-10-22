"use client";

import { PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { Field, NativeSelect, SubmitButton, useFormAction } from "@/components/admin/form";
import { TeamLogo } from "@/components/tournament/team-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addTeamToGroup,
  createGroup,
  deleteGroup,
  removeTeamFromGroup,
  setTiebreakRank,
  updateGroup,
} from "@/lib/actions/groups";
import type { Group, Match, Settings, Team } from "@/lib/data/dto";
import { AddGroupMatch } from "./add-group-match";

export function CreateGroupForm({ suggestedName }: { suggestedName: string }) {
  const { state, onSubmit, pending, err } = useFormAction(createGroup);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-4">
      <Field label="Шинэ группийн нэр" htmlFor="new-group" error={err("name")} className="min-w-48 flex-1">
        <Input id="new-group" name="name" defaultValue={suggestedName} key={suggestedName} required maxLength={40} />
      </Field>
      <SubmitButton pending={pending}>
        <PlusIcon aria-hidden /> Групп нэмэх
      </SubmitButton>
    </form>
  );
}

function RenameGroup({ group, onDone }: { group: Group; onDone: () => void }) {
  const { state, onSubmit, pending, err } = useFormAction(updateGroup.bind(null, group.id));
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <Field label="Нэр" htmlFor={`name-${group.id}`} error={err("name")} className="min-w-32 flex-1">
        <Input id={`name-${group.id}`} name="name" defaultValue={group.name} required autoFocus />
      </Field>
      <Field label="Дараалал" htmlFor={`order-${group.id}`} className="w-24">
        <Input id={`order-${group.id}`} name="sortOrder" type="number" inputMode="numeric" min={0} defaultValue={group.sortOrder} />
      </Field>
      <SubmitButton pending={pending}>Хадгалах</SubmitButton>
      <Button type="button" variant="ghost" className="h-11" onClick={onDone}>
        Болих
      </Button>
    </form>
  );
}

function TiebreakInput({ groupId, teamId, value }: { groupId: string; teamId: string; value?: number }) {
  const [pending, start] = useTransition();
  return (
    <Input
      aria-label="Тэнцсэн үеийн дараалал"
      title="Бүх үзүүлэлт тэнцсэн үед ашиглах дараалал (1 = дээд)"
      type="number"
      inputMode="numeric"
      min={1}
      max={99}
      placeholder="—"
      defaultValue={value ?? ""}
      disabled={pending}
      className="h-9 w-16 text-center"
      onBlur={(e) => {
        const raw = e.currentTarget.value.trim();
        const next = raw === "" ? null : Number(raw);
        if (next === (value ?? null)) return;
        start(async () => {
          const res = await setTiebreakRank(groupId, teamId, next);
          if (!res?.ok) toast.error(res?.message ?? "Алдаа гарлаа.");
        });
      }}
    />
  );
}

export function GroupCard({
  group,
  teams,
  available,
  matches,
  defaultFormat,
}: {
  group: Group;
  teams: Team[];
  available: Team[];
  matches: Pick<Match, "team1Id" | "team2Id" | "status">[];
  defaultFormat: Settings["defaultGroupFormat"];
}) {
  const [renaming, setRenaming] = useState(false);
  const add = useFormAction(addTeamToGroup.bind(null, group.id));
  const finishedCount = matches.filter((m) => m.status === "finished").length;
  const playedPairs = matches
    .filter((m) => m.team1Id && m.team2Id)
    .map((m) => [m.team1Id!, m.team2Id!] as [string, string]);

  return (
    <section className="space-y-4 rounded-md border bg-card p-4">
      {renaming ? (
        <RenameGroup group={group} onDone={() => setRenaming(false)} />
      ) : (
        <div className="flex items-center gap-2">
          <h2 className="flex-1 font-heading text-lg font-bold">{group.name}</h2>
          <Button variant="ghost" size="icon" aria-label="Нэр засах" onClick={() => setRenaming(true)}>
            <PencilIcon />
          </Button>
          <ConfirmAction
            title={`"${group.name}" устгах уу?`}
            description="Группийн товлогдсон тоглолтууд мөн устна. Эхэлсэн тоглолттой группийг устгах боломжгүй."
            action={() => deleteGroup(group.id)}
            trigger={
              <Button variant="ghost" size="icon" aria-label="Групп устгах" className="text-destructive">
                <Trash2Icon />
              </Button>
            }
          />
        </div>
      )}

      {teams.length > 0 ? (
        <ul className="divide-y rounded-md border">
          {group.teams.map(({ teamId, tiebreakRank }) => {
            const team = teams.find((t) => t.id === teamId);
            if (!team) return null;
            return (
              <li key={teamId} className="flex min-h-12 items-center gap-3 px-3 py-1.5">
                <TeamLogo team={team} size={28} />
                <span className="min-w-0 flex-1 truncate font-medium">{team.name}</span>
                <TiebreakInput groupId={group.id} teamId={teamId} value={tiebreakRank} />
                <ConfirmAction
                  title={`${team.name}-г группээс хасах уу?`}
                  description="Энэ багийн группийн товлогдсон тоглолтууд устна."
                  confirmLabel="Хасах"
                  action={() => removeTeamFromGroup(group.id, teamId)}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label={`${team.name} хасах`}>
                      <XIcon />
                    </Button>
                  }
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Баг нэмээгүй байна.</p>
      )}

      {available.length > 0 && (
        <form onSubmit={add.onSubmit} className="flex items-end gap-2">
          <Field label="Баг нэмэх" htmlFor={`add-${group.id}`} className="flex-1">
            <NativeSelect id={`add-${group.id}`} name="teamId" required defaultValue="">
              <option value="" disabled>
                Баг сонгох…
              </option>
              {available.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.tag})
                </option>
              ))}
            </NativeSelect>
          </Field>
          <SubmitButton pending={add.pending} variant="secondary" className="h-11 min-w-0">
            <PlusIcon aria-hidden /> Нэмэх
          </SubmitButton>
        </form>
      )}

      <AddGroupMatch group={group} teams={teams} playedPairs={playedPairs} defaultFormat={defaultFormat} />

      <div className="border-t pt-3 text-sm">
        <Link href={`/admin/matches?group=${group.id}`} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Тоглолт: <span className="tabular">{finishedCount}/{matches.length}</span> дууссан — бүгдийг харах
        </Link>
      </div>
    </section>
  );
}
