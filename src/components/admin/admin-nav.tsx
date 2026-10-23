"use client";

import {
  CalendarClockIcon,
  CalendarDaysIcon,
  GaugeIcon,
  LayersIcon,
  MenuIcon,
  SettingsIcon,
  ShieldIcon,
  TrophyIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const items: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Хянах самбар", icon: GaugeIcon },
  { href: "/admin/matches", label: "Тоглолтууд", icon: CalendarClockIcon },
  { href: "/admin/schedule", label: "Хуваарь", icon: CalendarDaysIcon },
  { href: "/admin/teams", label: "Багууд", icon: ShieldIcon },
  { href: "/admin/groups", label: "Группүүд", icon: LayersIcon },
  { href: "/admin/bracket", label: "Плей-офф", icon: TrophyIcon },
  { href: "/admin/settings", label: "Тохиргоо", icon: SettingsIcon },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Админ цэс" className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-11 items-center gap-3 rounded-md border-l-2 px-3 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-muted text-foreground"
                : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarNav() {
  return <NavLinks />;
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Цэс нээх">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-4">
        <SheetHeader className="px-0">
          <SheetTitle className="font-heading">Админ</SheetTitle>
        </SheetHeader>
        <NavLinks onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
