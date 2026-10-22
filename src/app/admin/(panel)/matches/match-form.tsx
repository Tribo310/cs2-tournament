"use client";

import { useState } from "react";
import { errorProps, Field, NativeSelect, SubmitButton, useFormAction } from "@/components/admin/form";
import { Section } from "@/components/admin/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/actions/shared";
import type { Group, Match, Settings, Team } from "@/lib/data/dto";
import { toLocalDateTimeInput } from "@/lib/time";

export function MatchForm({
  match,
  groups,
  teams,
  settings,
  action,
}: {
  match?: Match;
  groups: Group[];
  teams: Team[];
  settings: Pick<Settings, "defaultGroupFormat">;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const { state, onSubmit, pending, err } = useFormAction(action);
  const isPlayoff = match?.stage === "playoff";
  const [groupId, setGroupId] = useState(match?.groupId ?? groups[0]?.id ?? "");
  const [team1, setTeam1] = useState(match?.team1Id ?? "");
  const [team2, setTeam2] = useState(match?.team2Id ?? "");

  // Group matches only offer teams from the selected group
  const group = groups.find((g) => g.id === groupId);
  const options = isPlayoff ? teams : teams.filter((t) => group?.teams.some((g) => g.teamId === t.id));
  const started = match && match.status !== "scheduled";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Section title="Тоглолтын мэдээлэл">
        <div className="grid gap-4 sm:grid-cols-2">
          {!isPlayoff && (
            <Field label="Групп" htmlFor="groupId" error={err("groupId")} className="sm:col-span-2">
              <NativeSelect
                id="groupId"
                name="groupId"
                value={groupId}
                required
                onChange={(e) => {
                  setGroupId(e.target.value);
                  setTeam1("");
                  setTeam2("");
                }}
                {...errorProps(state, "groupId")}
              >
                {groups.length === 0 && <option value="">Эхлээд групп үүсгэнэ үү</option>}
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
          {(
            [
              ["team1Id", "Баг 1", team1, setTeam1, team2],
              ["team2Id", "Баг 2", team2, setTeam2, team1],
            ] as const
          ).map(([name, label, value, setValue, other]) => (
            <Field key={name} label={label} htmlFor={name} error={err(name)}>
              <NativeSelect
                id={name}
                name={name}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required={Boolean(started)}
                {...errorProps(state, name)}
              >
                <option value="">Тодорхойгүй (TBD)</option>
                {options.map((t) => (
                  <option key={t.id} value={t.id} disabled={t.id === other}>
                    {t.name} ({t.tag})
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ))}
          <Field label="Формат" htmlFor="format">
            <NativeSelect id="format" name="format" defaultValue={match?.format ?? settings.defaultGroupFormat}>
              <option value="bo1">BO1</option>
              <option value="bo3">BO3</option>
              <option value="bo5">BO5</option>
            </NativeSelect>
          </Field>
          <Field label="Огноо, цаг" htmlFor="scheduledAt" error={err("scheduledAt")} hint="Улаанбаатарын цагаар">
            <Input
              id="scheduledAt"
              name="scheduledAt"
              type="datetime-local"
              defaultValue={toLocalDateTimeInput(match?.scheduledAt)}
              {...errorProps(state, "scheduledAt")}
            />
          </Field>
          <Field label="Нэр (заавал биш)" htmlFor="label" error={err("label")} hint="Ж: Хагас шигшээ">
            <Input id="label" name="label" defaultValue={match?.label} maxLength={60} />
          </Field>
          <Field label="Шууд дамжуулалтын холбоос" htmlFor="streamUrl" error={err("streamUrl")}>
            <Input
              id="streamUrl"
              name="streamUrl"
              type="url"
              inputMode="url"
              placeholder="https://"
              defaultValue={match?.streamUrl}
              {...errorProps(state, "streamUrl")}
            />
          </Field>
          <Field label="Тэмдэглэл" htmlFor="notes" error={err("notes")} className="sm:col-span-2">
            <Textarea id="notes" name="notes" rows={2} defaultValue={match?.notes} maxLength={500} />
          </Field>
        </div>
      </Section>
      <div className="flex justify-end">
        <SubmitButton pending={pending}>{match ? "Хадгалах" : "Тоглолт үүсгэх"}</SubmitButton>
      </div>
    </form>
  );
}
