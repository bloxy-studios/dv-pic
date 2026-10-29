import type { Metadata } from "next";
import { product } from "@/lib/product";

export const metadata: Metadata = { title: "About", description: "What DV Ready is, and what it is not." };

export default function AboutPage() {
  return (
    <article className="grid max-w-3xl gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">About {product.name}</h1>
      <p>{product.disclaimer}</p>
      <p>
        The name is configured in one place so it can be changed later. The tool is free. It does not sell a higher chance of selection, and it does not file an entry.
      </p>
      <p>
        Rules live in <code>lib/rules</code>. A rule stays inactive until its source and status say it should run. Update the verification date when you re-read the official pages. Do not copy an older program year’s instructions into the active set and label them as DV-2027.
      </p>
    </article>
  );
}
