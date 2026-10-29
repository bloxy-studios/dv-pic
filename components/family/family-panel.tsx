"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { sources } from "@/lib/rules/sources";
import {
  clearAllPhotos,
  getPhotoState,
  removeProfile,
  setActive,
  subscribePhoto,
  updateProfile,
  type ProfileRole,
} from "@/lib/session/store";
import { profileRoleLabel } from "@/components/photo/workspace";

const roles: ProfileRole[] = ["principal", "spouse", "child", "other"];

export function FamilyPanel() {
  const state = useSyncExternalStore(subscribePhoto, getPhotoState, getPhotoState);
  const prepared = state.profiles.filter((profile) => profile.completed).length;
  return (
    <div className="grid gap-4">
      <p className="text-sm text-[var(--muted)]">
        {state.profiles.length === 0
          ? "No photos yet."
          : `${prepared} of ${state.profiles.length} photos prepared.`}{" "}
        Each person keeps a separate photo. This page does not decide who must be included on an entry.{" "}
        <a href={sources.dvInstructions.url}>Read the official instructions</a>. DV-2027 family rules were not confirmed in a year-specific instruction file on October 28, 2026. The DV-2026 instructions, kept only as history, asked for photos of the entrant and included derivative family members.
      </p>
      <ul className="grid gap-3">
        {state.profiles.map((profile) => (
          <li key={profile.id} className="border-b border-[var(--line)] py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{profile.label}</p>
                <p className="text-sm text-[var(--muted)]">{profile.completed ? "Marked prepared" : "Still open"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="button-secondary" onClick={() => setActive(profile.id)}>
                  Work on this photo
                </button>
                <Link className="button-secondary" href="/photo-checker">
                  Check
                </Link>
                <Link className="button-secondary" href="/photo-cropper">
                  Crop
                </Link>
                <button type="button" className="button-secondary" onClick={() => removeProfile(profile.id)}>
                  Remove
                </button>
              </div>
            </div>
            <label className="mt-3 block text-sm">
              Display label
              <input
                className="mt-1 w-full rounded-md border border-[var(--line)] px-2 py-1"
                value={profile.label}
                maxLength={40}
                onChange={(event) => updateProfile(profile.id, { label: event.target.value.slice(0, 40) })}
              />
            </label>
            <label className="mt-2 block text-sm">
              Role
              <select
                className="mt-1 w-full rounded-md border border-[var(--line)] px-2 py-1"
                value={profile.role}
                onChange={(event) => updateProfile(profile.id, { role: event.target.value as ProfileRole })}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {profileRoleLabel(role)}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ul>
      <AddPerson />
      {state.profiles.length > 0 ? (
        <button type="button" className="button-secondary justify-self-start" onClick={() => clearAllPhotos()}>
          Clear all photos from this browser session
        </button>
      ) : null}
    </div>
  );
}

function readQueuedLabel(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("dv-ready-next-label");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { label?: string };
    return parsed.label ?? null;
  } catch {
    return null;
  }
}

function subscribeQueue(listener: () => void) {
  window.addEventListener("dv-ready-queue", listener);
  return () => window.removeEventListener("dv-ready-queue", listener);
}

function AddPerson() {
  const state = useSyncExternalStore(subscribePhoto, getPhotoState, getPhotoState);
  const queuedLabel = useSyncExternalStore(subscribeQueue, readQueuedLabel, () => null);
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const role = String(data.get("role")) as ProfileRole;
        const label = String(data.get("label") || profileRoleLabel(role)).slice(0, 40);
        const id = `placeholder-${crypto.randomUUID()}`;
        sessionStorage.setItem("dv-ready-next-label", JSON.stringify({ id, role, label }));
        window.dispatchEvent(new Event("dv-ready-queue"));
        event.currentTarget.reset();
      }}
    >
      <label className="text-sm">
        Add a person
        <input name="label" className="mt-1 block rounded-md border border-[var(--line)] px-2 py-1" placeholder="Label, not a legal name" maxLength={40} />
      </label>
      <label className="text-sm">
        Role
        <select name="role" className="mt-1 block rounded-md border border-[var(--line)] px-2 py-1" defaultValue="child">
          {roles.map((role) => (
            <option key={role} value={role}>
              {profileRoleLabel(role)}
            </option>
          ))}
        </select>
      </label>
      <button className="button-primary" type="submit">
        Use this label on the next photo
      </button>
      <p className="basis-full text-sm text-[var(--muted)]">
        {state.profiles.length} photo {state.profiles.length === 1 ? "profile" : "profiles"} in this session. Each download gets its own file name so the photos are not mixed.
      </p>
      {queuedLabel ? (
        <p className="basis-full text-sm" role="status">
          The next photo you add will be labeled {queuedLabel}.{" "}
          <Link href="/photo-checker">Add that photo</Link>
        </p>
      ) : null}
    </form>
  );
}
