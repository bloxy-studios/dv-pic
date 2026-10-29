import type { Metadata } from "next";
import { FamilyPanel } from "@/components/family/family-panel";

export const metadata: Metadata = { title: "Family photos", description: "Prepare separate Diversity Visa photos for each person." };

export default function FamilyPage() {
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">Family photos</h1>
      <p className="max-w-3xl text-[var(--muted)]">
        Labels are only for keeping files apart. Do not enter passport numbers, birth dates, or addresses. Who must be included is an official-instruction question, not something this tool decides.
      </p>
      <FamilyPanel />
    </div>
  );
}
