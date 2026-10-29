import type { PhotoAgeResult } from "@/lib/dates/photo-age";
import type { CropTransform } from "@/lib/image/crop-math";
import { defaultCrop, fitZoom } from "@/lib/image/crop-math";
import type { ImageInspection } from "@/lib/image/inspect";
import type { MetadataRow, MetadataSnapshot } from "@/lib/image/metadata";
import { emptyMetadata } from "@/lib/image/metadata";
import type { CheckResult } from "@/lib/rules/types";

export type ProfileRole = "principal" | "spouse" | "child" | "other";
export type Workflow = "original" | "prepared";

export type ExportRecord = {
  bytes: Uint8Array;
  url: string;
  hash: string;
  checks: CheckResult[];
  metadata: MetadataSnapshot;
  rows: MetadataRow[];
  byteIdentical: boolean;
};

export type PhotoProfile = {
  id: string;
  role: ProfileRole;
  label: string;
  workflow: Workflow;
  original: Uint8Array;
  originalHash: string;
  bitmap: ImageBitmap;
  previewUrl: string;
  inspection: ImageInspection;
  metadata: MetadataSnapshot;
  age: PhotoAgeResult;
  crop: CropTransform;
  past: CropTransform[];
  future: CropTransform[];
  lightingEnabled: boolean;
  lightingIntensity: number;
  keepGps: boolean;
  visual: CheckResult[] | null;
  exportRecord: ExportRecord | null;
  completed: boolean;
  error: string | null;
};

export type PhotoState = {
  profiles: PhotoProfile[];
  activeId: string | null;
};

type Listener = () => void;

let state: PhotoState = { profiles: [], activeId: null };
const listeners = new Set<Listener>();

export function getPhotoState(): PhotoState {
  return state;
}

export function subscribePhoto(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(next: PhotoState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function activeProfile(): PhotoProfile | null {
  return state.profiles.find((profile) => profile.id === state.activeId) ?? null;
}

export function addProfile(partial: Omit<PhotoProfile, "crop" | "past" | "future" | "lightingEnabled" | "lightingIntensity" | "keepGps" | "visual" | "exportRecord" | "completed" | "error" | "metadata"> & {
  metadata?: MetadataSnapshot;
}): string {
  const profile: PhotoProfile = {
    ...partial,
    metadata: partial.metadata ?? emptyMetadata(),
    crop: {
      ...defaultCrop,
      zoom: 1 / fitZoom(partial.bitmap.width, partial.bitmap.height, 0),
    },
    past: [],
    future: [],
    lightingEnabled: false,
    lightingIntensity: 0.35,
    keepGps: false,
    visual: null,
    exportRecord: null,
    completed: false,
    error: null,
  };
  emit({ profiles: [...state.profiles, profile], activeId: profile.id });
  return profile.id;
}

export function updateProfile(id: string, patch: Partial<PhotoProfile>) {
  emit({
    activeId: state.activeId,
    profiles: state.profiles.map((profile) => (profile.id === id ? { ...profile, ...patch } : profile)),
  });
}

export function setActive(id: string) {
  emit({ ...state, activeId: id });
}

export function removeProfile(id: string) {
  const profile = state.profiles.find((item) => item.id === id);
  release(profile);
  const profiles = state.profiles.filter((item) => item.id !== id);
  emit({ profiles, activeId: state.activeId === id ? (profiles[0]?.id ?? null) : state.activeId });
}

export function clearAllPhotos() {
  state.profiles.forEach(release);
  emit({ profiles: [], activeId: null });
}

export function commitCrop(id: string, crop: CropTransform) {
  const profile = state.profiles.find((item) => item.id === id);
  if (!profile) return;
  updateProfile(id, {
    past: [...profile.past, profile.crop],
    future: [],
    crop,
    exportRecord: clearExport(profile.exportRecord),
  });
}

export function undoCrop(id: string) {
  const profile = state.profiles.find((item) => item.id === id);
  if (!profile || profile.past.length === 0) return;
  const previous = profile.past[profile.past.length - 1];
  updateProfile(id, {
    past: profile.past.slice(0, -1),
    future: [profile.crop, ...profile.future],
    crop: previous,
    exportRecord: clearExport(profile.exportRecord),
  });
}

export function redoCrop(id: string) {
  const profile = state.profiles.find((item) => item.id === id);
  if (!profile || profile.future.length === 0) return;
  const [next, ...future] = profile.future;
  updateProfile(id, {
    past: [...profile.past, profile.crop],
    future,
    crop: next,
    exportRecord: clearExport(profile.exportRecord),
  });
}

function clearExport(record: ExportRecord | null): null {
  if (record) URL.revokeObjectURL(record.url);
  return null;
}

function release(profile: PhotoProfile | undefined) {
  if (!profile) return;
  URL.revokeObjectURL(profile.previewUrl);
  profile.bitmap.close();
  if (profile.exportRecord) URL.revokeObjectURL(profile.exportRecord.url);
}
