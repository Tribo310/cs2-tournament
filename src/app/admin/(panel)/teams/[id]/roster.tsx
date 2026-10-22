"use client";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { Field, NativeSelect, SubmitButton, useFormAction } from "@/components/admin/form";
import { Section } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deletePlayer, deleteTeam, savePlayer } from "@/lib/actions/teams";
import type { Player, Team } from "@/lib/data/dto";
import { ROLE_LABELS } from "@/lib/labels";

function PlayerForm({ teamId, player, onDone }: { teamId: string; player?: Player; onDone?: () => void }) {
  const { state, onSubmit, pending, err } = useFormAction(savePlayer.bind(null, teamId));
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    if (player) onDone?.();
    else formRef.current?.reset(); // ready for the next player
  }, [state, player, onDone]);

  const p = player?.id ?? "new";
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_10rem_auto] lg:items-end">
      {player && <input type="hidden" name="playerId" value={player.id} />}
      <Field label="Ник нэр" htmlFor={`nickname-${p}`} error={err("nickname")}>
        <Input id={`nickname-${p}`} name="nickname" defaultValue={player?.nickname} required maxLength={32} />
      </Field>
      <Field label="Бүтэн нэр" htmlFor={`fullName-${p}`} error={err("fullName")}>
        <Input id={`fullName-${p}`} name="fullName" defaultValue={player?.fullName} />
      </Field>
      <Field label="Үүрэг" htmlFor={`role-${p}`}>
        <NativeSelect id={`role-${p}`} name="role" defaultValue={player?.role ?? "player"}>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      {player && <input type="hidden" name="sortOrder" value={player.sortOrder} />}
      <SubmitButton pending={pending}>
        {player ? "Хадгалах" : (
          <>
            <PlusIcon aria-hidden /> Нэмэх
          </>
        )}
      </SubmitButton>
    </form>
  );
}

function EditPlayer({ teamId, player }: { teamId: string; player: Player }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`${player.nickname} засах`}>
          <PencilIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Тоглогч засах</DialogTitle>
        </DialogHeader>
        <PlayerForm teamId={teamId} player={player} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function Roster({ team }: { team: Team }) {
  const order: Player["role"][] = ["player", "sub", "coach"];
  const players = [...team.players].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role) || a.sortOrder - b.sortOrder);
  const starters = team.players.filter((p) => p.role === "player").length;

  return (
    <Section title={`Бүрэлдэхүүн · ${starters}/5 тоглогч`}>
      {players.length > 0 ? (
        <ul className="divide-y rounded-md border">
          {players.map((player) => (
            <li key={player.id} className="flex min-h-12 items-center gap-3 px-3 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{player.nickname}</p>
                {player.fullName && <p className="truncate text-xs text-muted-foreground">{player.fullName}</p>}
              </div>
              {player.role !== "player" && <Badge variant="outline">{ROLE_LABELS[player.role]}</Badge>}
              <EditPlayer teamId={team.id} player={player} />
              <ConfirmAction
                title={`${player.nickname}-г хасах уу?`}
                confirmLabel="Хасах"
                action={() => deletePlayer(team.id, player.id)}
                trigger={
                  <Button variant="ghost" size="icon" aria-label={`${player.nickname} хасах`}>
                    <Trash2Icon />
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Тоглогч нэмээгүй байна.</p>
      )}
      <div className="border-t pt-4">
        <PlayerForm teamId={team.id} />
      </div>
    </Section>
  );
}

export function DeleteTeamButton({ teamId, teamName }: { teamId: string; teamName: string }) {
  return (
    <ConfirmAction
      title={`"${teamName}" багийг устгах уу?`}
      description="Баг, тоглогчид болон лого бүрмөсөн устна. Тоглолтод оролцсон багийг устгах боломжгүй."
      action={() => deleteTeam(teamId)}
      trigger={
        <Button variant="outline" className="text-destructive">
          <Trash2Icon aria-hidden />
          Устгах
        </Button>
      }
    />
  );
}
