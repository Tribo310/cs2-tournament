import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { createTeam } from "@/lib/actions/teams";
import { TeamForm } from "../team-form";

export const metadata: Metadata = { title: "Шинэ баг" };

// The form is static; createTeam verifies the admin session itself.
export default function NewTeamPage() {
  return (
    <>
      <PageHeader title="Шинэ баг" back={{ href: "/admin/teams", label: "Багууд" }} />
      <TeamForm action={createTeam} />
    </>
  );
}
