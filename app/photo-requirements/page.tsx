import type { Metadata } from "next";
import { activeRules, photoRules } from "@/lib/rules/dv-2027";
import { outputSpec } from "@/lib/rules/dv-2027";

export const metadata: Metadata = {
  title: "Photo requirements",
  description: "Diversity Visa photo checks used by DV Ready, with sources and verification dates.",
};

export default function RequirementsPage() {
  return (
    <div className="grid max-w-3xl gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Photo requirements</h1>
      <p>
        Active checks use the Department of State photo pages as verified on October 28, 2026. The DV entry section asks for a JPEG of {outputSpec.width}×{outputSpec.height} pixels, at most 240 kB. A separate DV-2027 photo instruction was not available that day, so these are current general DV rules, not a newly published DV-2027 specification.
      </p>
      <ul className="grid gap-4">
        {activeRules.map((rule) => (
          <li key={rule.id} className="border-b border-[var(--line)] py-4">
            <h2 className="font-semibold">{rule.title}</h2>
            <p className="mt-2 text-sm">{rule.description}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">How it is checked: {rule.howTested}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Limit: {rule.limitation}</p>
            <p className="mt-2 text-sm">
              <a href={rule.sourceUrl}>{rule.sourceLabel}</a> · verified {rule.verifiedOn} · {rule.verificationStatus.replaceAll("_", " ")}
            </p>
          </li>
        ))}
      </ul>
      <section>
        <h2 className="text-xl font-semibold">Not active</h2>
        <ul className="mt-2 grid gap-3">
          {photoRules.filter((rule) => !rule.active).map((rule) => (
            <li key={rule.id} className="text-sm">
              <strong>{rule.title}. </strong>
              {rule.limitation} <a href={rule.sourceUrl}>Source</a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
