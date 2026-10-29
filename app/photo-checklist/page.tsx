import type { Metadata } from "next";
import { ChecklistLoader } from "@/components/checklist/checklist-loader";

export const metadata: Metadata = { title: "Photo checklist", description: "Review Diversity Visa photo steps before you submit an entry." };

export default function ChecklistPage() {
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">Photo checklist</h1>
      <p className="max-w-3xl text-[var(--muted)]">
        Use this list beside the official photo page. Checked items are reminders, not proof that a photograph or an entry will be accepted.
      </p>
      <ChecklistLoader />
    </div>
  );
}
