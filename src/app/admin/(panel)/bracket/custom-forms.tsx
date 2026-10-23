"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ExternalLinkIcon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { Field, NativeSelect, SubmitButton, useFormAction } from "@/components/admin/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addStage,
  addStageMatch,
  createRoundRobin,
  deleteStage,
  deleteStageMatch,
  moveStage,
  saveStageMatch,
  updateStage,
} from "@/lib/actions/playoff-stages";
import type { ActionState } from "@/lib/actions/shared";
import type { Match } from "@/lib/data/dto";
import type { PlayoffStage } from "@/lib/db/types";
import { STAGE_KIND_HINTS, STAGE_KIND_LABELS, STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

export interface SourceOption {
  value: string; // see encodeSource()
  label: string;
}

export interface SourceGroups {
  teams: SourceOption[];
  matches: SourceOption[]; // winners and losers of other matches
}

function SourceSelect({
  name,
  label,
  groups,
  value,
  onChange,
  invalid,
}: {
  name: string;
  label: string;
  groups: SourceGroups;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  return (
    <NativeSelect
      name={name}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={invalid || undefined}
      className="h-10"
    >
      <option value="">Тодорхойгүй (TBD)</option>
      {groups.matches.length > 0 && (
        <optgroup label="Өмнөх тоглолтоос">
          {groups.matches.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </optgroup>
      )}
      <optgroup label="Баг">
        {groups.teams.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </optgroup>
    </NativeSelect>
  );
}

function FormatSelect({ value, onChange, name = "format" }: { value?: string; onChange?: (v: string) => void; name?: string }) {
  return (
    <NativeSelect
      name={name}
      aria-label="Формат"
      className="h-10"
      {...(onChange ? { value, onChange: (e) => onChange(e.target.value) } : { defaultValue: value ?? "bo3" })}
    >
      <option value="bo1">BO1</option>
      <option value="bo3">BO3</option>
      <option value="bo5">BO5</option>
    </NativeSelect>
  );
}

function StageFields({ stage }: { stage?: PlayoffStage }) {
  const [kind, setKind] = useState<PlayoffStage["kind"]>(stage?.kind ?? "knockout");
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_8rem]">
      <Field label="Шатны нэр" htmlFor={`name-${stage?.key ?? "new"}`}>
        <Input
          id={`name-${stage?.key ?? "new"}`}
          name="name"
          required
          maxLength={40}
          placeholder="Жишээ: Хагас шигшээ"
          defaultValue={stage?.name}
        />
      </Field>
      <Field label="Төрөл" htmlFor={`kind-${stage?.key ?? "new"}`} hint={STAGE_KIND_HINTS[kind]}>
        <NativeSelect
          id={`kind-${stage?.key ?? "new"}`}
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as PlayoffStage["kind"])}
        >
          <option value="knockout">{STAGE_KIND_LABELS.knockout}</option>
          <option value="round_robin">{STAGE_KIND_LABELS.round_robin}</option>
        </NativeSelect>
      </Field>
      <Field label="Тодруулах байр" htmlFor={`qualify-${stage?.key ?? "new"}`} hint="Тойргийн хүснэгтэд">
        <Input
          id={`qualify-${stage?.key ?? "new"}`}
          name="qualify"
          type="number"
          inputMode="numeric"
          min={0}
          max={16}
          defaultValue={stage?.qualify ?? 1}
        />
      </Field>
    </div>
  );
}

export function AddStageForm() {
  const { onSubmit, pending } = useFormAction(addStage);
  return (
    <form
      onSubmit={(e) => {
        onSubmit(e);
        e.currentTarget.reset();
      }}
      className="space-y-3"
    >
      <StageFields />
      <div className="flex justify-end">
        <SubmitButton pending={pending}>
          <PlusIcon aria-hidden /> Шат нэмэх
        </SubmitButton>
      </div>
    </form>
  );
}

function useAction() {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionState>) =>
    start(async () => {
      const res = await fn();
      if (res?.message) (res.ok ? toast.success : toast.error)(res.message);
    });
  return { pending, run };
}

export function StageHeader({
  stage,
  index,
  total,
  matchCount,
}: {
  stage: PlayoffStage;
  index: number;
  total: number;
  matchCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const { onSubmit, pending } = useFormAction(updateStage.bind(null, stage.key));
  const move = useAction();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid size-7 place-items-center rounded-sm bg-primary/15 font-heading text-sm font-bold text-primary">
          {index + 1}
        </span>
        <h2 className="font-heading text-lg font-extrabold">{stage.name}</h2>
        <Badge variant="outline">{STAGE_KIND_LABELS[stage.kind]}</Badge>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Дээш зөөх"
            disabled={index === 0 || move.pending}
            onClick={() => move.run(() => moveStage(stage.key, -1))}
          >
            <ArrowUpIcon aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Доош зөөх"
            disabled={index === total - 1 || move.pending}
            onClick={() => move.run(() => moveStage(stage.key, 1))}
          >
            <ArrowDownIcon aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={editing ? "Засварыг хаах" : "Шатыг засах"}
            aria-expanded={editing}
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? <XIcon aria-hidden /> : <PencilIcon aria-hidden />}
          </Button>
          <ConfirmAction
            title={`"${stage.name}" шатыг устгах уу?`}
            description={
              matchCount
                ? `Шатны ${matchCount} тоглолт хамт устна. Эхэлсэн тоглолттой бол устгах боломжгүй.`
                : "Хоосон шат устна."
            }
            action={() => deleteStage(stage.key)}
            trigger={
              <Button variant="ghost" size="icon" aria-label="Шатыг устгах" className="text-destructive">
                <Trash2Icon aria-hidden />
              </Button>
            }
          />
        </div>
      </div>
      {editing && (
        <form
          onSubmit={(e) => {
            onSubmit(e);
            setEditing(false);
          }}
          className="space-y-3 rounded-md border border-dashed p-3"
        >
          <StageFields stage={stage} />
          <div className="flex justify-end">
            <SubmitButton pending={pending}>
              <SaveIcon aria-hidden /> Хадгалах
            </SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}

export interface BuilderRow {
  id: string;
  code: string; // M1, M2…
  stageKey: string; // "" for matches without a stage
  status: Match["status"];
  score?: string;
  teams: string; // "STP vs UB5"
  format: Match["format"];
  label: string;
  source1: string;
  source2: string;
  options: SourceGroups; // this match excluded, along with anything it already feeds
}

export function StageMatchRow({ row, stages }: { row: BuilderRow; stages: PlayoffStage[] }) {
  const { onSubmit, pending, err } = useFormAction(saveStageMatch.bind(null, row.id));
  const initial = { stageKey: row.stageKey, s1: row.source1, s2: row.source2, format: row.format, label: row.label };
  const [values, setValues] = useState(initial);

  // Take the server's values after a save (or a change made elsewhere)
  const [prev, setPrev] = useState(initial);
  if (JSON.stringify(prev) !== JSON.stringify(initial)) {
    setPrev(initial);
    setValues(initial);
  }
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const locked = row.status !== "scheduled";
  const set = (key: keyof typeof values) => (value: string) => setValues((v) => ({ ...v, [key]: value }));

  return (
    <li className={cn("rounded-md border p-3", dirty && "border-primary/50 bg-primary/5")}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-sm bg-muted px-1.5 py-0.5 font-heading text-xs font-bold">{row.code}</span>
          <span className="min-w-0 truncate font-medium">{row.teams}</span>
          {row.status !== "scheduled" && (
            <Badge variant={row.status === "live" ? "destructive" : "outline"}>{STATUS_LABELS[row.status]}</Badge>
          )}
          {row.score && <span className="tabular font-heading">{row.score}</span>}
        </div>

        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
          {locked ? (
            <p className="text-sm text-muted-foreground md:col-span-3">
              Тоглолт эхэлсэн тул багийг солих боломжгүй.
              <input type="hidden" name="source1" value={values.s1} />
              <input type="hidden" name="source2" value={values.s2} />
            </p>
          ) : (
            <>
              <SourceSelect name="source1" label={`${row.code}, 1-р баг`} groups={row.options} value={values.s1} onChange={set("s1")} />
              <span className="text-center text-xs text-muted-foreground">vs</span>
              <SourceSelect name="source2" label={`${row.code}, 2-р баг`} groups={row.options} value={values.s2} onChange={set("s2")} />
            </>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem_auto] sm:items-center">
          <NativeSelect
            name="stageKey"
            aria-label="Шат"
            value={values.stageKey}
            onChange={(e) => set("stageKey")(e.target.value)}
            aria-invalid={Boolean(err("stageKey")) || undefined}
            className="h-10"
          >
            {!values.stageKey && <option value="">Шат сонгох…</option>}
            {stages.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
          <Input
            name="label"
            aria-label="Нэр (заавал биш)"
            placeholder="Нэр (заавал биш), ж: Финал"
            maxLength={60}
            value={values.label}
            onChange={(e) => set("label")(e.target.value)}
            className="h-10"
          />
          <FormatSelect value={values.format} onChange={set("format")} />
          <div className="flex items-center justify-end gap-1">
            <Link
              href={`/admin/matches/${row.id}`}
              aria-label="Оноо, төлөв удирдах"
              className="grid size-10 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ExternalLinkIcon className="size-4" />
            </Link>
            {!locked && (
              <ConfirmAction
                title={`${row.code} тоглолтыг устгах уу?`}
                description="Энэ тоглолт руу баг илгээдэг холбоосууд ч хамт арилна."
                action={() => deleteStageMatch(row.id)}
                trigger={
                  <Button type="button" variant="ghost" size="icon" aria-label="Тоглолтыг устгах" className="size-10 text-destructive">
                    <Trash2Icon aria-hidden />
                  </Button>
                }
              />
            )}
            <SubmitButton pending={pending} disabled={pending || !dirty || !values.stageKey} className="h-10 min-w-0 px-3">
              <SaveIcon aria-hidden /> Хадгалах
            </SubmitButton>
          </div>
        </div>
      </form>
    </li>
  );
}

export function AddMatchButton({ stageKey }: { stageKey: string }) {
  const { pending, run } = useAction();
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => addStageMatch(stageKey))}>
      <PlusIcon aria-hidden /> Тоглолт нэмэх
    </Button>
  );
}

/** Fills an empty round-robin stage with every pairing of the chosen participants. */
export function RoundRobinForm({ stageKey, options }: { stageKey: string; options: SourceGroups }) {
  const { onSubmit, pending, err } = useFormAction(createRoundRobin.bind(null, stageKey));
  const [count, setCount] = useState(3);
  const [sources, setSources] = useState<string[]>(Array(8).fill(""));
  const picked = sources.slice(0, count).filter(Boolean);
  const duplicate = picked.some((v, i) => picked.indexOf(v) !== i);

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-md border border-dashed p-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        <UsersIcon className="size-4 text-primary" aria-hidden /> Тойргийн тоглолтууд үүсгэх
      </p>
      <p className="text-xs text-muted-foreground">
        Оролцогч бүрийг баг эсвэл өмнөх тоглолтын ялагч/ялагдагчаар сонгоно. Оролцогч бүр бусадтайгаа нэг удаа тоглоно ({(count * (count - 1)) / 2}{" "}
        тоглолт).
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Оролцогчийн тоо" htmlFor={`count-${stageKey}`}>
          <NativeSelect id={`count-${stageKey}`} name="count" value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Формат" htmlFor={`rrformat-${stageKey}`}>
          <NativeSelect id={`rrformat-${stageKey}`} name="format" defaultValue="bo3">
            <option value="bo1">BO1</option>
            <option value="bo3">BO3</option>
            <option value="bo5">BO5</option>
          </NativeSelect>
        </Field>
      </div>
      <ol className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-2">
            <span className="text-right font-heading text-sm font-bold text-muted-foreground">{i + 1}.</span>
            <SourceSelect
              name={`p_${i + 1}`}
              label={`${i + 1}-р оролцогч`}
              groups={options}
              value={sources[i]}
              invalid={Boolean(err(`p_${i + 1}`))}
              onChange={(v) => setSources((all) => all.map((x, j) => (j === i ? v : x)))}
            />
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {duplicate && (
          <span role="alert" className="text-sm text-destructive">
            Нэг оролцогч хоёр удаа сонгогдсон байна.
          </span>
        )}
        <SubmitButton pending={pending} disabled={pending || duplicate}>
          <UsersIcon aria-hidden /> Тойрог үүсгэх
        </SubmitButton>
      </div>
    </form>
  );
}
