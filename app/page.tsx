import Link from "next/link";
import { product } from "@/lib/product";
import { registrationStatus } from "@/lib/rules/registration";
import { outputSpec } from "@/lib/rules/dv-2027";
import { sources } from "@/lib/rules/sources";

export default function HomePage() {
  return (
    <div className="grid gap-8">
      <section>
        <p className="text-sm text-[var(--muted)]">{product.programYear}</p>
        <h1 className="mt-2 max-w-[18ch] text-4xl font-semibold tracking-tight">{product.tagline}</h1>
        <p className="mt-4 max-w-[62ch] text-lg leading-7 text-[var(--muted)]">{product.description}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link className="button-primary" href="/photo-checker">
            Check my photo
          </Link>
          <Link className="button-secondary" href="/photo-cropper">
            Crop my photo
          </Link>
        </div>
      </section>
      <section aria-labelledby="path-heading">
        <h2 id="path-heading" className="text-xl font-semibold">Before you enter</h2>
        <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-6">
          <li>Confirm on the Department of State site whether the entry period is open. This page does not start a countdown.</li>
          <li>Prepare one recent JPEG for yourself. If the official instructions require family photos, prepare each person’s file separately.</li>
          <li>Check the photo here, crop it to 600 × 600 if needed, and download that file. Do not retouch the face afterward.</li>
          <li>
            Submit the entry yourself at <a href={sources.entryPortal.url}>dvprogram.state.gov</a> and keep the confirmation number that site gives you.
          </li>
        </ol>
      </section>
      <dl className="grid border-y border-[var(--line)] text-sm sm:grid-cols-3">
        <div className="border-b border-[var(--line)] py-3 sm:border-b-0 sm:pr-3">
          <dt className="text-[var(--muted)]">Size</dt>
          <dd className="font-semibold">{outputSpec.width} × {outputSpec.height}</dd>
        </div>
        <div className="border-b border-[var(--line)] py-3 sm:border-b-0 sm:border-l sm:px-3">
          <dt className="text-[var(--muted)]">File</dt>
          <dd className="font-semibold">JPEG, 240 kB</dd>
        </div>
        <div className="py-3 sm:border-l sm:pl-3">
          <dt className="text-[var(--muted)]">Where it runs</dt>
          <dd className="font-semibold">This browser</dd>
        </div>
      </dl>
      <section aria-labelledby="status-heading">
        <h2 id="status-heading" className="text-xl font-semibold">
          {registrationStatus.headline}
        </h2>
        <p className="mt-2 max-w-[68ch] text-sm leading-6">{registrationStatus.summary}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">Verified {registrationStatus.verifiedOn}. This status may be outdated. There is no countdown because no official opening date was verified.</p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {registrationStatus.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url}>{source.label}</a>
            </li>
          ))}
        </ul>
      </section>
      <section className="grid gap-6 border-t border-[var(--line)] pt-6 sm:grid-cols-3">
        <div>
          <h2 className="font-semibold">What gets measured</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Format, exact pixel size, square crop, and the file’s real byte length. Color and sRGB are reported only when the file exposes them.
          </p>
        </div>
        <div>
          <h2 className="font-semibold">What stays manual</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            A pass here does not mean a consular officer or the entry system will accept the photo. The tool does not approve visas or raise selection odds.
          </p>
        </div>
        <div>
          <h2 className="font-semibold">What leaves the device</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Nothing photographic. Cropping, checks, and export stay in the browser. There is no account.
          </p>
        </div>
      </section>
      <p className="text-sm">
        <Link href="/photo-checklist">Open the checklist</Link>
        <span className="px-2 text-[var(--line)]">/</span>
        <a href={sources.photoRequirements.url}>Official photo requirements</a>
        <span className="px-2 text-[var(--line)]">/</span>
        <a href={sources.dvInstructions.url}>Official DV instructions</a>
      </p>
    </div>
  );
}
