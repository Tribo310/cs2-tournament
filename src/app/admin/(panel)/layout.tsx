import { ExternalLinkIcon, LogOutIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MobileNav, SidebarNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";
import { getCurrentAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "Админ", template: "%s · Админ" },
  robots: { index: false, follow: false },
};

async function AdminEmail() {
  const admin = await getCurrentAdmin();
  return admin ? <span className="truncate">{admin.username}</span> : null;
}

function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit" variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
        <LogOutIcon aria-hidden />
        Гарах
      </Button>
    </form>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-card p-4 lg:flex">
        <Link href="/admin" className="mb-6 px-3 font-heading text-lg font-extrabold">
          CS2 <span className="text-primary">Админ</span>
        </Link>
        <Suspense fallback={null}>
          <SidebarNav />
        </Suspense>
        <div className="mt-auto space-y-1 border-t pt-3 text-xs text-muted-foreground">
          <p className="px-3 pb-1">
            <Suspense fallback={null}>
              <AdminEmail />
            </Suspense>
          </p>
          <Button asChild variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
            <Link href="/" target="_blank">
              <ExternalLinkIcon aria-hidden />
              Сайт үзэх
            </Link>
          </Button>
          <LogoutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-2 backdrop-blur lg:hidden">
          <Suspense fallback={<div className="size-10" />}>
            <MobileNav />
          </Suspense>
          <Link href="/admin" className="font-heading font-extrabold">
            CS2 <span className="text-primary">Админ</span>
          </Link>
          <div className="ml-auto">
            <LogoutButton />
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
