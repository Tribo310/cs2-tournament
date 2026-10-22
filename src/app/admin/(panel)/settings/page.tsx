import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth/session";
import { getSettings } from "@/lib/data/queries";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Тохиргоо" };

async function Content() {
  await requireAdmin();
  const settings = await getSettings();
  return <SettingsForm settings={settings} />;
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Тохиргоо" description="Тэмцээний ерөнхий мэдээлэл, оноо, плей-оффын бүтэц." />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}
