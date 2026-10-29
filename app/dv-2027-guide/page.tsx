import type { Metadata } from "next";
import type { ReactNode } from "react";
import { registrationStatus } from "@/lib/rules/registration";
import { sources } from "@/lib/rules/sources";

export const metadata: Metadata = {
  title: "DV-2027 guide",
  description: "Independent notes on finding official Diversity Visa instructions. Not legal advice.",
};

export default function GuidePage() {
  return (
    <article className="grid max-w-3xl gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">DV-2027 preparation guide</h1>
      <p>
        This is educational preparation material from an independent tool. It is not legal advice, an application, or a government service. You submit an entry yourself on the official site.
      </p>
      <section className="border-l-2 border-[var(--accent)] pl-4">
        <h2 className="text-xl font-semibold">{registrationStatus.headline}</h2>
        <p className="mt-2 text-sm">{registrationStatus.summary}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">Last reviewed {registrationStatus.verifiedOn}. It may be outdated.</p>
      </section>
      <Section title="What the program is">
        The Diversity Visa program makes immigrant visas available to people from countries with lower rates of immigration to the United States. Selection is not a visa. Read the current instructions before you rely on any summary.
      </Section>
      <Section title="Where to read the rules">
        Start at the <a href={sources.dvInstructions.url}>Diversity Visa instructions</a>. Confirm the domain is travel.state.gov or dvprogram.state.gov before you type personal information.
      </Section>
      <Section title="Whether registration is open">
        Use the Department’s own notice, not a social-media post or a paid website. DV Ready does not invent an opening date. If the official page and this page disagree, trust the official page.
      </Section>
      <section>
        <h2 className="text-xl font-semibold">The day you submit</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-6">
          <li>Open the official instructions and confirm the entry period is open. If a social-media post disagrees with that page, use the official page.</li>
          <li>Have a separate JPEG for each person the instructions say must have a photo. Use DV Ready to check size, crop, and file size. It does not decide who is eligible or who must be listed.</li>
          <li>Go to <a href={sources.entryPortal.url}>dvprogram.state.gov</a> yourself. Check the address before you type anything. DV Ready cannot fill in or send the form.</li>
          <li>There is no fee to enter on the official site. A page that asks you to pay to submit, to “unlock” a win, or to raise your chance of selection is not the Department of State.</li>
          <li>When the official site finishes, save the confirmation information it shows. Store it somewhere you control. Do not send it to this tool.</li>
          <li>Later, check status only through <a href={sources.statusCheck.url}>Entrant Status Check</a>, using that confirmation information.</li>
        </ol>
      </section>
      <Section title="What people usually gather">
        The official instructions describe the information an entry asks for, including a qualifying photograph and information about family members who must be listed. Education and work rules are also on that page. This tool does not collect the application and does not tell you whether you qualify.
      </Section>
      <Section title="Photographs">
        Use the photo checker for technical limits and the checklist for things a program cannot see, such as whether the photo matches current appearance. Do not submit a photo that was edited to change how you look.
      </Section>
      <Section title="Family members">
        Inclusion rules come from the official instructions. A spouse or child who is already a U.S. citizen or lawful permanent resident was treated differently in the DV-2026 instructions. That DV-2026 text is historical until DV-2027 instructions confirm it.
      </Section>
      <Section title="The official entry site">
        Entries are made on <a href={sources.entryPortal.url}>dvprogram.state.gov</a> during an announced period. DV Ready does not open that form inside this site and cannot submit an entry for you. There is no fee to enter on the official site. Keep your own confirmation information. Do not email it to this tool.
      </Section>
      <Section title="After you submit">
        Status is checked on <a href={sources.statusCheck.url}>Entrant Status Check</a>, using the confirmation details the official site gave you. Ignore messages that say you won and must pay to continue.
      </Section>
      <Section title="Scams">
        A website that copies government seals, asks for payment to “unlock” a winning notice, or says it can raise your chance of selection is not the Department of State. Being selected is not something a photo tool can influence. Check the domain before you enter data.
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6">{children}</p>
    </section>
  );
}
