"use client";

import { errorProps, Field, NativeSelect, SubmitButton, useFormAction } from "@/components/admin/form";
import { Section } from "@/components/admin/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateSettings } from "@/lib/actions/settings";
import type { Settings } from "@/lib/data/dto";
import { toLocalDateInput } from "@/lib/time";

export function SettingsForm({ settings }: { settings: Settings }) {
  const { state, onSubmit, pending, err } = useFormAction(updateSettings);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Section title="Ерөнхий">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Тэмцээний нэр" htmlFor="name" error={err("name")} className="md:col-span-2">
            <Input id="name" name="name" defaultValue={settings.name} required {...errorProps(state, "name")} />
          </Field>
          <Field label="Тайлбар" htmlFor="description" error={err("description")} className="md:col-span-2">
            <Textarea id="description" name="description" rows={3} defaultValue={settings.description} />
          </Field>
          <Field label="Эхлэх огноо" htmlFor="startsOn" error={err("startsOn")}>
            <Input id="startsOn" name="startsOn" type="date" defaultValue={toLocalDateInput(settings.startsOn)} />
          </Field>
          <Field label="Дуусах огноо" htmlFor="endsOn" error={err("endsOn")}>
            <Input
              id="endsOn"
              name="endsOn"
              type="date"
              defaultValue={toLocalDateInput(settings.endsOn)}
              {...errorProps(state, "endsOn")}
            />
          </Field>
        </div>
      </Section>

      <Section title="Группийн шат">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Field label="Тоглолтын формат" htmlFor="defaultGroupFormat" hint="Шинэ тоглолтод хэрэглэнэ">
            <NativeSelect id="defaultGroupFormat" name="defaultGroupFormat" defaultValue={settings.defaultGroupFormat}>
              <option value="bo1">BO1</option>
              <option value="bo3">BO3</option>
              <option value="bo5">BO5</option>
            </NativeSelect>
          </Field>
          <Field label="Ялалтын оноо" htmlFor="pointsWin" error={err("pointsWin")}>
            <Input id="pointsWin" name="pointsWin" type="number" inputMode="numeric" min={0} max={10} defaultValue={settings.pointsWin} />
          </Field>
          <Field label="Ялагдлын оноо" htmlFor="pointsLoss" error={err("pointsLoss")}>
            <Input id="pointsLoss" name="pointsLoss" type="number" inputMode="numeric" min={0} max={10} defaultValue={settings.pointsLoss} />
          </Field>
          <Field label="Группээс шалгарах" htmlFor="teamsAdvancePerGroup" error={err("teamsAdvancePerGroup")} hint="Баг / групп">
            <Input
              id="teamsAdvancePerGroup"
              name="teamsAdvancePerGroup"
              type="number"
              inputMode="numeric"
              min={1}
              max={8}
              defaultValue={settings.teamsAdvancePerGroup}
            />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          Байрлал: оноо → картын зөрүү → раундын зөрүү → хоорондын тоглолт → админы тогтоосон дараалал.
        </p>
      </Section>

      <Section title="Плей-офф">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Шатны төрөл" htmlFor="bracketType">
            <NativeSelect id="bracketType" name="bracketType" defaultValue={settings.bracketType}>
              <option value="single">Нэг хасагдалттай (single elimination)</option>
              <option value="double">Хоёр хасагдалттай (double elimination)</option>
              <option value="knockout_rr">Шигшээ + финалын тойрог (ялагчид хоорондоо тойргоор)</option>
              <option value="custom">Чөлөөт — шат, тоглолт бүрийг админ өөрөө бүтээнэ</option>
            </NativeSelect>
          </Field>
          <Field
            label="Багийн тоо"
            htmlFor="bracketSize"
            error={err("bracketSize")}
            hint="Шигшээ + финалын тойрог: 4, 6, 8 баг. Бусад: 4, 8, 16 баг. Чөлөөт төрөлд хамаарахгүй."
          >
            <NativeSelect id="bracketSize" name="bracketSize" defaultValue={String(settings.bracketSize)}>
              <option value="4">4 баг</option>
              <option value="6">6 баг</option>
              <option value="8">8 баг</option>
              <option value="16">16 баг</option>
            </NativeSelect>
          </Field>
        </div>
      </Section>

      <div className="flex justify-end">
        <SubmitButton pending={pending}>Хадгалах</SubmitButton>
      </div>
    </form>
  );
}
