"use client";

import { EraserIcon, ListOrderedIcon, Trash2Icon, WandSparklesIcon } from "lucide-react";
import { useState } from "react";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { Field, NativeSelect, SubmitButton, useFormAction } from "@/components/admin/form";
import { Section } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { deleteBracket, generateBracket } from "@/lib/actions/bracket";

export interface SeedOption {
  id: string;
  label: string;
  place?: string; // e.g. "A1"
}

type Pair = [string, string];

export function BracketControls({
  options,
  current,
  suggestion,
  hasBracket,
  started,
}: {
  options: SeedOption[];
  current: Pair[];
  suggestion: Pair[];
  hasBracket: boolean;
  started: boolean;
}) {
  const { onSubmit, pending, err } = useFormAction(generateBracket);
  const [pairs, setPairs] = useState<Pair[]>(current);
  const [confirming, setConfirming] = useState(false);

  // Show the new first round after the server re-renders (e.g. after generating)
  const [prevCurrent, setPrevCurrent] = useState(current);
  if (current.flat().join() !== prevCurrent.flat().join()) {
    setPrevCurrent(current);
    setPairs(current);
  }

  const picked = pairs.flat().filter(Boolean);
  const duplicates = new Set(picked.filter((id, i) => picked.indexOf(id) !== i));
  const empty = pairs.flat().filter((id) => !id).length;
  const hasSuggestion = suggestion.flat().some(Boolean);

  const setSlot = (p: number, slot: 0 | 1, value: string) =>
    setPairs((all) => all.map((pair, i) => (i === p ? ((slot === 0 ? [value, pair[1]] : [pair[0], value]) as Pair) : pair)));

  const select = (p: number, slot: 0 | 1) => {
    const name = `r1_${p + 1}_${slot + 1}`;
    const value = pairs[p][slot];
    return (
      <NativeSelect
        name={name}
        aria-label={`${p + 1}-р тоглолт, ${slot + 1}-р баг`}
        value={value}
        aria-invalid={(value && duplicates.has(value)) || Boolean(err(name)) || undefined}
        onChange={(e) => setSlot(p, slot, e.target.value)}
      >
        <option value="">Баг сонгох…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.place ? `${o.place} · ` : ""}
            {o.label}
          </option>
        ))}
      </NativeSelect>
    );
  };

  return (
    <Section
      title="1-р тойргийн тоглолтууд"
      actions={
        hasBracket && (
          <ConfirmAction
            title="Плей-оффын шатыг устгах уу?"
            description="Бүх плей-оффын тоглолт, оноо бүрмөсөн устна. Энэ үйлдлийг буцаах боломжгүй."
            action={deleteBracket}
            trigger={
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2Icon aria-hidden /> Шатыг устгах
              </Button>
            }
          />
        )
      }
    >
      {started ? (
        <p className="text-sm text-muted-foreground">
          Плей-офф эхэлсэн тул шатыг дахин үүсгэх боломжгүй. Баг солих бол тоглолт бүрийг тус тусад нь засна уу.
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            // Regenerating replaces the existing bracket: ask once
            if (hasBracket && !confirming) {
              e.preventDefault();
              setConfirming(true);
              return;
            }
            setConfirming(false);
            onSubmit(e);
          }}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Тоглолт бүрийн хоёр багийг сонгоно уу.</p>
            <div className="flex gap-2">
              {hasSuggestion && (
                <Button type="button" variant="outline" size="sm" onClick={() => setPairs(suggestion)}>
                  <ListOrderedIcon aria-hidden /> Группийн байраар бөглөх
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPairs(pairs.map(() => ["", ""] as Pair))}
                disabled={picked.length === 0}
              >
                <EraserIcon aria-hidden /> Цэвэрлэх
              </Button>
            </div>
          </div>

          <ol className="grid gap-3 lg:grid-cols-2">
            {pairs.map((_, p) => (
              <li key={p} className="space-y-1.5 rounded-md border p-3">
                <p className="font-heading text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  {p + 1}-р тоглолт
                </p>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  {select(p, 0)}
                  <span className="text-xs text-muted-foreground">vs</span>
                  {select(p, 1)}
                </div>
              </li>
            ))}
          </ol>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Тоглолтын формат" htmlFor="format">
              <NativeSelect id="format" name="format" defaultValue="bo3">
                <option value="bo1">BO1</option>
                <option value="bo3">BO3</option>
                <option value="bo5">BO5</option>
              </NativeSelect>
            </Field>
            <Field label="Финалын формат" htmlFor="finalFormat">
              <NativeSelect id="finalFormat" name="finalFormat" defaultValue="bo5">
                <option value="bo1">BO1</option>
                <option value="bo3">BO3</option>
                <option value="bo5">BO5</option>
              </NativeSelect>
            </Field>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {duplicates.size > 0 ? (
              <span role="alert" className="text-sm text-destructive">
                Нэг баг хоёр удаа сонгогдсон байна.
              </span>
            ) : confirming ? (
              <span role="alert" className="text-sm text-side-t">
                Одоогийн шат устаж, шинээр үүснэ. Дахин дарж баталгаажуулна уу.
              </span>
            ) : (
              empty > 0 &&
              picked.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {empty} байр хоосон — дараа нь тоглолтын хуудаснаас бөглөж болно.
                </span>
              )
            )}
            <SubmitButton pending={pending} disabled={pending || duplicates.size > 0 || picked.length === 0}>
              <WandSparklesIcon aria-hidden />
              {hasBracket ? (confirming ? "Тийм, дахин үүсгэх" : "Шатыг дахин үүсгэх") : "Шат үүсгэх"}
            </SubmitButton>
          </div>
        </form>
      )}
    </Section>
  );
}
