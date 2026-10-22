"use client";

import { Loader2Icon } from "lucide-react";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/actions/shared";
import { cn } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-11 w-full cursor-pointer rounded-md border border-input bg-transparent px-3 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm [&>option]:bg-popover",
        className,
      )}
      {...props}
    />
  );
}

export function SubmitButton({
  children,
  pending,
  ...props
}: ComponentProps<typeof Button> & { pending: boolean }) {
  return (
    <Button type="submit" disabled={pending} className="h-11 min-w-28" {...props}>
      {pending && <Loader2Icon className="animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}

/** Shows a toast whenever a new action result arrives. */
export function useActionToast(state: ActionState) {
  const last = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!state || state.at === last.current) return;
    last.current = state.at;
    if (state.ok && state.message) toast.success(state.message);
    else if (!state.ok && state.message) toast.error(state.message);
  }, [state]);
}

/**
 * Submits via onSubmit + transition instead of <form action>, because React resets
 * uncontrolled fields after a form action — even when validation fails.
 */
export function useFormAction(action: (prev: ActionState, formData: FormData) => Promise<ActionState>) {
  const [state, dispatch, pending] = useActionState(action, null);
  useActionToast(state);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => dispatch(formData));
  };
  const err = (name: string) => state?.fieldErrors?.[name];
  return { state, onSubmit, pending, err };
}

/** Props for an input wired to an action's field error. */
export function errorProps(state: ActionState, name: string) {
  const error = state?.fieldErrors?.[name];
  return error ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {};
}
