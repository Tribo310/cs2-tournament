"use client";

import { useSearchParams } from "next/navigation";
import { Field, SubmitButton, useFormAction } from "@/components/admin/form";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/actions/auth";

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "";
  const { onSubmit, pending } = useFormAction(login);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Нэвтрэх нэр" htmlFor="username">
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          autoFocus
        />
      </Field>
      <Field label="Нууц үг" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton pending={pending} className="h-11 w-full">Нэвтрэх</SubmitButton>
    </form>
  );
}
