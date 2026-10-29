import type { Metadata } from "next";
import { sources } from "@/lib/rules/sources";

export const metadata: Metadata = { title: "Official resources", description: "Links to U.S. Department of State Diversity Visa and photo pages." };

const links = [
  sources.dvInstructions,
  sources.dvSubmit,
  sources.dv2027Notice,
  sources.photoRequirements,
  sources.digitalImage,
  sources.photoExamples,
  sources.entryPortal,
  sources.statusCheck,
];

export default function ResourcesPage() {
  return (
    <div className="grid max-w-3xl gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">Official resources</h1>
      <p>
        Confirm the address before you enter personal information. Official Diversity Visa pages use travel.state.gov or dvprogram.state.gov. DV Ready is not one of those sites.
      </p>
      <ul className="grid gap-3">
        {links.map((link) => (
          <li key={link.url} className="link-row">
            <a href={link.url}>{link.label}</a>
            <p className="mt-1 text-sm text-[var(--muted)]">Link checked {link.verifiedOn}. The page itself can change after that date.</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
