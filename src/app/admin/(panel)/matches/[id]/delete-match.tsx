"use client";

import { Trash2Icon } from "lucide-react";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { Button } from "@/components/ui/button";
import { deleteMatch } from "@/lib/actions/matches";

export function DeleteMatchButton({ matchId }: { matchId: string }) {
  return (
    <ConfirmAction
      title="Тоглолтыг устгах уу?"
      description="Тоглолт болон картын оноо бүрмөсөн устна."
      action={() => deleteMatch(matchId)}
      trigger={
        <Button variant="outline" className="text-destructive">
          <Trash2Icon aria-hidden />
          Устгах
        </Button>
      }
    />
  );
}
