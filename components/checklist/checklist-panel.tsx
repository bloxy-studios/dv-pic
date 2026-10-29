"use client";

import { useState } from "react";
import { CHECKLIST_STORAGE_KEY, checklistItems, checklistSections } from "@/lib/content/checklist";

function readSaved(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function ChecklistPanel() {
  const [checked, setChecked] = useState(readSaved);
  const [stored, setStored] = useState(() => window.localStorage.getItem(CHECKLIST_STORAGE_KEY) ?? "");

  function toggle(id: string) {
    setChecked((current) => ({ ...current, [id]: !current[id] }));
    setStored("");
  }

  function save() {
    const next = JSON.stringify(checked);
    window.localStorage.setItem(CHECKLIST_STORAGE_KEY, next);
    setStored(next);
  }

  function clear() {
    window.localStorage.removeItem(CHECKLIST_STORAGE_KEY);
    setChecked({});
    setStored("");
  }

  const done = checklistItems.filter((item) => checked[item.id]).length;

  const ratio = checklistItems.length === 0 ? 0 : (done / checklistItems.length) * 100;

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm">
          {done} of {checklistItems.length} checked
        </p>
        <div className="progress-track mt-2" aria-hidden="true">
          <span style={{ width: `${ratio}%` }} />
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Saving is optional and stays on this device. The list does not store your name, photo, or application. Completing it does not establish eligibility.
        </p>
      </div>
      {checklistSections.map((section) => (
        <section key={section}>
          <h2 className="text-sm font-semibold">{section}</h2>
          <ul>
            {checklistItems
              .filter((item) => item.section === section)
              .map((item) => (
                <li key={item.id}>
                  <label className="task-row">
                    <input type="checkbox" checked={Boolean(checked[item.id])} onChange={() => toggle(item.id)} />
                    <span>{item.label}</span>
                  </label>
                </li>
              ))}
          </ul>
        </section>
      ))}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="button-primary" onClick={save}>
          Save progress on this device
        </button>
        <button type="button" className="button-secondary" onClick={clear}>
          Clear saved progress
        </button>
      </div>
      <p className="text-sm" role="status">
        {stored ? "A copy of the checked items is stored in this browser." : "Progress is not stored until you choose to save it."}
      </p>
    </div>
  );
}
