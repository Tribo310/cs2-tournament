"use client";

import { ImageIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { errorProps, Field, SubmitButton, useFormAction } from "@/components/admin/form";
import { Section } from "@/components/admin/page-header";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/actions/shared";
import type { Team } from "@/lib/data/dto";

const MAX_LOGO_BYTES = 1024 * 1024;

export function TeamForm({
  team,
  action,
}: {
  team?: Team;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const { state, onSubmit, pending, err } = useFormAction(action);
  const [preview, setPreview] = useState<string | undefined>(team?.logoUrl);
  const [fileError, setFileError] = useState<string>();
  const [removeLogo, setRemoveLogo] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Don't re-upload the same file on the next save
  useEffect(() => {
    if (state?.ok && fileInput.current) fileInput.current.value = "";
  }, [state]);

  // Show the saved logo again after a successful save
  const [savedLogo, setSavedLogo] = useState(team?.logoUrl);
  if (team?.logoUrl !== savedLogo) {
    setSavedLogo(team?.logoUrl);
    setPreview(team?.logoUrl);
    setRemoveLogo(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" encType="multipart/form-data">
      <Section title="Багийн мэдээлэл">
        <div className="grid gap-4 md:grid-cols-[1fr_9rem]">
          <Field label="Багийн нэр" htmlFor="name" error={err("name")}>
            <Input id="name" name="name" defaultValue={team?.name} required maxLength={64} {...errorProps(state, "name")} />
          </Field>
          <Field label="Товчлол" htmlFor="tag" error={err("tag")} hint="Ж: NAVI">
            <Input
              id="tag"
              name="tag"
              defaultValue={team?.tag}
              required
              maxLength={8}
              className="uppercase"
              {...errorProps(state, "tag")}
            />
          </Field>
          <Field label="Улс" htmlFor="country" error={err("country")}>
            <Input id="country" name="country" defaultValue={team?.country ?? "Монгол"} />
          </Field>
          <Field label="Хот" htmlFor="city" error={err("city")}>
            <Input id="city" name="city" defaultValue={team?.city} />
          </Field>
        </div>
      </Section>

      <Section title="Лого">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted">
            {preview && !removeLogo ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
              <img src={preview} alt="Логоны урьдчилсан харагдац" className="size-full object-contain" />
            ) : (
              <ImageIcon className="size-6 text-muted-foreground" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <Field label="Зураг сонгох" htmlFor="logo" error={fileError} hint="PNG, JPEG эсвэл WebP · 1 MB хүртэл · дөрвөлжин зураг тохиромжтой">
              <Input
                ref={fileInput}
                id="logo"
                name="logo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setFileError(undefined);
                  if (!file) return setPreview(team?.logoUrl);
                  if (file.size > MAX_LOGO_BYTES) {
                    setFileError("Лого 1 MB-аас ихгүй байх ёстой.");
                    e.target.value = "";
                    return;
                  }
                  setRemoveLogo(false);
                  setPreview(URL.createObjectURL(file));
                }}
              />
            </Field>
            {team?.logoUrl && (
              <div className="flex items-center gap-2">
                <Switch id="removeLogo" name="removeLogo" checked={removeLogo} onCheckedChange={setRemoveLogo} />
                <Label htmlFor="removeLogo" className="text-muted-foreground">
                  Логог устгах
                </Label>
              </div>
            )}
          </div>
        </div>
      </Section>

      <div className="flex justify-end">
        <SubmitButton pending={pending}>{team ? "Хадгалах" : "Баг үүсгэх"}</SubmitButton>
      </div>
    </form>
  );
}
