import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Админ нэвтрэх",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">CS2 Тэмцээн</p>
          <h1 className="text-2xl font-extrabold">Админ нэвтрэх</h1>
        </div>
        <div className="cut-corner rounded-md border bg-card p-5">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
