"use client";

import dynamic from "next/dynamic";

const ChecklistPanel = dynamic(
  () => import("@/components/checklist/checklist-panel").then((mod) => mod.ChecklistPanel),
  { ssr: false },
);

export function ChecklistLoader() {
  return <ChecklistPanel />;
}
