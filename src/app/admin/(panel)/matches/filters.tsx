"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/admin/form";
import type { Group } from "@/lib/data/dto";

export function MatchFilters({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    // A group implies the group stage
    if (key === "group" && value) next.delete("stage");
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <NativeSelect aria-label="Төлөв" value={params.get("status") ?? ""} onChange={(e) => set("status", e.target.value)}>
        <option value="">Бүх төлөв</option>
        <option value="live">Шууд</option>
        <option value="scheduled">Товлогдсон</option>
        <option value="finished">Дууссан</option>
      </NativeSelect>
      <NativeSelect aria-label="Үе шат" value={params.get("stage") ?? ""} onChange={(e) => set("stage", e.target.value)}>
        <option value="">Бүх үе шат</option>
        <option value="group">Групп</option>
        <option value="playoff">Плей-офф</option>
      </NativeSelect>
      <NativeSelect
        aria-label="Групп"
        className="col-span-2 sm:col-span-1"
        value={params.get("group") ?? ""}
        onChange={(e) => set("group", e.target.value)}
      >
        <option value="">Бүх групп</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
