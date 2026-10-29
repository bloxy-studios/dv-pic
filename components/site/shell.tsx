"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { product } from "@/lib/product";

const links = [
  ["/", "Home"],
  ["/photo-checker", "Check"],
  ["/photo-cropper", "Crop"],
  ["/photo-checklist", "Checklist"],
  ["/family-photos", "Family"],
  ["/dv-2027-guide", "Guide"],
  ["/official-resources", "Sources"],
  ["/privacy", "Privacy"],
] as const;

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wide = pathname === "/photo-checker" || pathname === "/photo-cropper" || pathname === "/family-photos";
  return (
    <>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="shrink-0 py-3 text-[var(--ink)] no-underline">
            <span className="block text-sm font-semibold">{product.name}</span>
          </Link>
          <nav className="ml-auto hidden items-center lg:flex" aria-label="Main">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="nav-link" aria-current={pathname === href ? "page" : undefined}>
                {label}
              </Link>
            ))}
          </nav>
          <button type="button" className="button-secondary my-2 ml-auto lg:hidden" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(true)}>
            Menu
          </button>
        </div>
      </header>
      {open ? (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)}>
          <nav
            id="mobile-nav"
            aria-label="Main"
            className="ml-auto flex h-full w-[min(100%,18rem)] flex-col bg-white p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="button-secondary self-end" onClick={() => setOpen(false)}>
              Close
            </button>
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="nav-link" aria-current={pathname === href ? "page" : undefined} onClick={() => setOpen(false)}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
      <main id="content" className={`mx-auto w-full flex-1 px-4 ${wide ? "max-w-6xl py-4" : "max-w-3xl py-8"}`}>
        {children}
      </main>
      <footer className="border-t border-[var(--line)] px-4 py-5 text-sm text-[var(--muted)]">
        <p className="mx-auto max-w-6xl">{product.disclaimer}</p>
      </footer>
    </>
  );
}
