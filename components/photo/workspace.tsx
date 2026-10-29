"use client";

import type { PointerEvent, RefObject } from "react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { product } from "@/lib/product";
import { cropCoversSource, defaultCrop, fitZoom, type CropTransform } from "@/lib/image/crop-math";
import { inspectImageBytes } from "@/lib/image/inspect";
import {
  ageFor,
  exportPreparedPhoto,
  paintCrop,
  readFileBytes,
  unchangedDownloadAllowed,
  uprightBitmap,
} from "@/lib/image/prepare";
import { sha256Hex } from "@/lib/image/encode";
import { readMetadata } from "@/lib/image/exif-io";
import { activeRules, photoDownloadName } from "@/lib/rules/dv-2027";
import { tipsFor } from "@/lib/content/troubleshooting";
import { validateTechnical } from "@/lib/validation/technical";
import {
  activeProfile,
  addProfile,
  commitCrop,
  getPhotoState,
  redoCrop,
  subscribePhoto,
  undoCrop,
  updateProfile,
  type PhotoProfile,
  type ProfileRole,
  type Workflow,
} from "@/lib/session/store";
import { analyzeLuminance } from "@/lib/image/lighting";
import { applyGentleLighting } from "@/lib/image/lighting";
import { assessBackground, assessFaces, assessSharpness } from "@/lib/vision/assess";
import { detectFaces } from "@/lib/vision/detect";
import type { CheckResult } from "@/lib/rules/types";
import type { MetadataRow } from "@/lib/image/metadata";

export function PhotoWorkspace({ view }: { view: "check" | "crop" }) {
  const state = useSyncExternalStore(subscribePhoto, getPhotoState, getPhotoState);
  const profile = state.profiles.find((item) => item.id === state.activeId) ?? null;
  const [workflow, setWorkflow] = useState<Workflow>("original");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const bytes = await readFileBytes(file);
      const inspection = inspectImageBytes(bytes);
      if (inspection.kind === "raw" || inspection.kind === "tiff" || inspection.kind === "unknown" || inspection.kind === "gif") {
        setMessage(
          inspection.kind === "raw" || inspection.kind === "tiff"
            ? "This looks like a RAW or TIFF camera file. Export a high-quality JPEG from your camera software, then upload that JPEG. The file was not uploaded anywhere."
            : "Use a JPEG, PNG, or WebP photo. This file was not uploaded anywhere.",
        );
        return;
      }
      const metadata = await readMetadata(bytes);
      const mime = inspection.kind === "png" ? "image/png" : inspection.kind === "webp" ? "image/webp" : "image/jpeg";
      const bitmap = await uprightBitmap(bytes, mime, metadata.orientation);
      const previewUrl = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: mime }));
      const queued = readQueuedPerson();
      const existing = queued ? null : activeProfile();
      const label = queued?.label ?? existing?.label ?? "Principal entrant";
      const role = queued?.role ?? existing?.role ?? "principal";
      if (existing && !existing.completed) {
        if (existing.exportRecord) URL.revokeObjectURL(existing.exportRecord.url);
        updateProfile(existing.id, {
          workflow,
          original: bytes,
          originalHash: await sha256Hex(bytes),
          bitmap,
          previewUrl,
          inspection: { ...inspection, width: bitmap.width, height: bitmap.height, decoded: true },
          metadata,
          age: ageFor(metadata),
          crop: { ...defaultCrop, zoom: 1 / fitZoom(bitmap.width, bitmap.height, 0) },
          past: [],
          future: [],
          visual: null,
          exportRecord: null,
          error: null,
        });
        URL.revokeObjectURL(existing.previewUrl);
        existing.bitmap.close();
      } else {
        addProfile({
          id: crypto.randomUUID(),
          role,
          label,
          workflow,
          original: bytes,
          originalHash: await sha256Hex(bytes),
          bitmap,
          previewUrl,
          inspection: { ...inspection, width: bitmap.width, height: bitmap.height, decoded: true },
          metadata,
          age: ageFor(metadata),
        });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The photo could not be opened.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">{view === "check" ? "Photo checker" : "Crop photo"}</h1>
        <p className="mt-2 text-[var(--muted)]">
          Photos stay in this browser. Nothing is uploaded. {product.disclaimer}
        </p>
      </header>
      {!profile ? <WorkflowChoice workflow={workflow} onChange={setWorkflow} /> : null}
      <Uploader busy={busy} compact={Boolean(profile)} onFile={onFile} />
      {message ? <p className="status-warn" role="alert">{message}</p> : null}
      {profile ? (
        view === "check" ? (
          <Checker profile={profile} />
        ) : (
          <Cropper profile={profile} />
        )
      ) : (
        <p className="text-sm text-[var(--muted)]">Choose a workflow, then add a photo. No account is required.</p>
      )}
    </div>
  );
}

function WorkflowChoice({ workflow, onChange }: { workflow: Workflow; onChange: (workflow: Workflow) => void }) {
  const original = workflow === "original";
  return (
    <div>
      <div className="flex border border-[var(--line)] bg-white" role="group" aria-label="Photo workflow">
        <button type="button" aria-pressed={original} className={segmentClass(original)} onClick={() => onChange("original")}>
          Original camera photo
        </button>
        <button type="button" aria-pressed={!original} className={segmentClass(!original)} onClick={() => onChange("prepared")}>
          Already cropped photo
        </button>
      </div>
      <p className="mt-3 max-w-[68ch] text-sm text-[var(--muted)]">
        {original
          ? "Upload your original camera photo. We’ll help you crop it to the required dimensions, check its composition, and review its lighting."
          : "Already have a photo? Check its dimensions, file size, capture-date information, and visible requirements before submitting it."}
      </p>
    </div>
  );
}

function segmentClass(selected: boolean) {
  return selected
    ? "min-h-10 flex-1 bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white"
    : "min-h-10 flex-1 px-3 py-2 text-sm font-semibold text-[var(--ink)]";
}

function Uploader({ busy, compact, onFile }: { busy: boolean; compact?: boolean; onFile: (file: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    inputRef.current?.click();
  }

  function takeFile(file: File | null) {
    onFile(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={busy}
      className={compact ? "flex cursor-pointer flex-wrap items-center gap-3 text-sm" : "dropzone cursor-pointer"}
      onClick={() => {
        if (!busy) openPicker();
      }}
      onKeyDown={(event) => {
        if (busy) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPicker();
        }
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        takeFile(event.dataTransfer.files[0] ?? null);
      }}
    >
      <input
        ref={inputRef}
        className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
        type="file"
        tabIndex={-1}
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        aria-hidden="true"
        disabled={busy}
        onChange={(event) => takeFile(event.target.files?.[0] ?? null)}
      />
      <span className="button-primary">{busy ? "Opening…" : compact ? "Replace photo" : "Choose a photo"}</span>
      <span className="text-sm text-[var(--muted)]">
        {compact
          ? "Or drop a JPEG, PNG, or WebP here."
          : "Click anywhere in this box, or drop a photo here. JPEG, PNG, and WebP can be opened. On a phone, you can take a picture or choose one you already have. RAW files cannot."}
      </span>
    </div>
  );
}

function Checker({ profile }: { profile: PhotoProfile }) {
  const [visual, setVisual] = useState<CheckResult[] | null>(profile.visual);
  const [running, setRunning] = useState(false);
  const technical = validateTechnical({
    ...profile.inspection,
    decoded: true,
  });
  const unchanged = unchangedDownloadAllowed(profile.inspection, profile.metadata);

  async function runVisual() {
    setRunning(true);
    const canvas = document.createElement("canvas");
    canvas.width = profile.bitmap.width;
    canvas.height = profile.bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      setVisual([{ id: "face-detection", label: "Face detection", state: "unable_to_verify", detail: "Canvas is unavailable." }]);
      setRunning(false);
      return;
    }
    context.drawImage(profile.bitmap, 0, 0);
    const faces = await detectFaces(profile.bitmap, profile.bitmap.width, profile.bitmap.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const face = faces && faces.length === 1 ? faces[0].box : null;
    const results = [
      ...assessFaces(faces),
      assessBackground(pixels.data, canvas.width, canvas.height, face),
      assessSharpness(pixels.data, canvas.width, canvas.height),
    ];
    setVisual(results);
    updateProfile(profile.id, { visual: results });
    setRunning(false);
  }

  const tips = tipsFor([...(visual ?? []), ...technical]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={profile.previewUrl} alt="Selected photograph, shown before any export." className="max-h-[32rem] w-full border border-[var(--line)] bg-[var(--stage)] object-contain" />
        <figcaption className="mt-2 text-sm text-[var(--muted)]">
          Working on {profile.label}. Original file hash {profile.originalHash.slice(0, 12)}…. The original bytes are kept until you clear this photo.
        </figcaption>
      </figure>
      <div className="grid gap-4">
        <p className="text-sm font-medium">{checkerLead(profile, technical, unchanged)}</p>
        <AgeNote profile={profile} />
        <MetadataSummary profile={profile} />
        <section>
          <h2 className="text-lg font-semibold">Technical checks</h2>
          <ResultList results={technical} />
        </section>
        <section>
          <h2 className="text-lg font-semibold">Visual assessment</h2>
          <button type="button" className="button-secondary mt-2" onClick={runVisual} disabled={running}>
            {running ? "Checking…" : "Run local visual check"}
          </button>
          {visual ? <ResultList results={visual} /> : <p className="mt-2 text-sm text-[var(--muted)]">Not run yet. The face model downloads from this site only after you ask.</p>}
        </section>
        {tips.length > 0 ? (
          <section>
            <h2 className="text-lg font-semibold">What you can do</h2>
            <ul className="mt-2 grid gap-2">
              {tips.map((tip) => (
                <li key={tip.title} className="rounded-lg border border-[var(--line)] p-3 text-sm">
                  <strong>{tip.title}. </strong>
                  {tip.body}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {unchanged && profile.workflow === "prepared" ? (
          <DownloadUnchanged profile={profile} />
        ) : (
          <Link className="button-primary" href="/photo-cropper">
            Continue to crop
          </Link>
        )}
        <p className="text-sm text-[var(--muted)]">Cropping can correct framing and dimensions, but it cannot fix a distracting background, a closed eye, poor lighting, or an altered appearance.</p>
      </div>
    </div>
  );
}

function DownloadUnchanged({ profile }: { profile: PhotoProfile }) {
  function download() {
    const url = URL.createObjectURL(new Blob([new Uint8Array(profile.original)], { type: "image/jpeg" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = photoDownloadName(profile.label);
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="border border-[var(--line)] bg-white p-4">
      <h2 className="font-semibold">This JPEG already meets the measured technical limits</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Download uses the original bytes, without re-encoding. Visual and age checks can still need your review. {product.technicalPass}
      </p>
      <button type="button" className="button-primary mt-3" onClick={download}>
        Download unchanged JPEG for {profile.label}
      </button>
      <AfterDownload label={profile.label} />
    </div>
  );
}

function checkerLead(profile: PhotoProfile, technical: CheckResult[], unchanged: boolean) {
  if (unchanged && profile.workflow === "prepared") {
    return `The measured size limits are met for ${profile.label}. Download it only after you review the age note and whether the photo still looks like them.`;
  }
  const blocking = technical.some(
    (item) => ["format", "width", "height", "aspect", "file-size"].includes(item.id) && item.state === "needs_attention",
  );
  if (blocking) {
    return `Do not submit this file for ${profile.label} yet. Crop a square JPEG at 600 × 600 pixels, under 240 kB, then download that file.`;
  }
  return `Review the notes for ${profile.label}, then crop if the head or the frame still needs adjustment.`;
}

function Cropper({ profile }: { profile: PhotoProfile }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [guides, setGuides] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);
  const lightingNote = useRef<HTMLParagraphElement>(null);
  const [drag, setDrag] = useState<{ x: number; y: number; panX: number; panY: number; zoom: number; rotation: CropTransform["rotation"] } | null>(null);
  const [status, setStatus] = useState<string | null>(profile.error);
  const [busy, setBusy] = useState(false);
  const inside = cropCoversSource(profile.bitmap.width, profile.bitmap.height, profile.crop);
  const rule = activeRules.find((item) => item.id === "head-size");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    paintCrop(context, profile.bitmap, profile.crop, canvas.width);
    const note = lightingNote.current;
    if (profile.lightingEnabled && !showOriginal) {
      const frame = context.getImageData(0, 0, canvas.width, canvas.height);
      const plan = analyzeLuminance(frame.data);
      if (plan.allowCorrection) {
        const adjusted = applyGentleLighting(frame.data, profile.lightingIntensity);
        context.putImageData(new ImageData(new Uint8ClampedArray(adjusted), canvas.width, canvas.height), 0, 0);
        if (note) {
          note.textContent = `${plan.detail} The preview is using intensity ${Math.round(profile.lightingIntensity * 100)}%. Show original to compare, or turn correction off to export the unadjusted crop.`;
        }
      } else if (note) {
        note.textContent = plan.detail;
      }
    } else if (note) {
      note.textContent = profile.lightingEnabled
        ? "Showing the original crop. Correction is still on and will be used when you create the JPEG."
        : "Off. The preview matches the photograph, with no lighting change.";
    }
    if (!guides) return;
    context.save();
    context.strokeStyle = "rgba(255, 255, 255, 0.92)";
    context.setLineDash([6, 6]);
    for (const ratio of [0.155, 0.25, 0.5, 0.75, 0.845]) {
      context.beginPath();
      context.moveTo(ratio * canvas.width, 0);
      context.lineTo(ratio * canvas.width, canvas.height);
      context.moveTo(0, ratio * canvas.height);
      context.lineTo(canvas.width, ratio * canvas.height);
      context.stroke();
    }
    context.restore();
  }, [profile.bitmap, profile.crop, profile.id, profile.lightingEnabled, profile.lightingIntensity, guides, showOriginal]);

function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ x: event.clientX, y: event.clientY, panX: profile.crop.panX, panY: profile.crop.panY, zoom: profile.crop.zoom, rotation: profile.crop.rotation });
  }
  function pointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!drag) return;
    const rect = event.currentTarget.getBoundingClientRect();
    updateProfile(profile.id, {
      crop: {
        ...profile.crop,
        panX: drag.panX + (event.clientX - drag.x) / rect.width,
        panY: drag.panY + (event.clientY - drag.y) / rect.height,
      },
    });
  }
  function pointerUp() {
    if (!drag) return;
    const current = getPhotoState().profiles.find((item) => item.id === profile.id);
    if (current) {
      updateProfile(profile.id, {
        past: [...current.past, { panX: drag.panX, panY: drag.panY, zoom: drag.zoom, rotation: drag.rotation }],
        future: [],
        exportRecord: current.exportRecord ? (URL.revokeObjectURL(current.exportRecord.url), null) : null,
      });
    }
    setDrag(null);
  }

  function zoomBy(delta: number) {
    commitCrop(profile.id, { ...profile.crop, zoom: Math.min(8, Math.max(0.2, profile.crop.zoom + delta)) });
  }
  function rotate(direction: 1 | -1) {
    const next = ((profile.crop.rotation + direction * 90 + 360) % 360) as CropTransform["rotation"];
    commitCrop(profile.id, { ...profile.crop, rotation: next });
  }

  async function exportPhoto() {
    if (!inside) {
      setStatus("The frame includes empty area outside the photograph. Zoom in until the frame is filled.");
      return;
    }
    setBusy(true);
    setStatus(null);
    const result = await exportPreparedPhoto({
      bitmap: profile.bitmap,
      crop: profile.crop,
      original: profile.original,
      metadata: profile.metadata,
      lightingEnabled: profile.lightingEnabled,
      lightingIntensity: profile.lightingIntensity,
      keepGps: profile.keepGps,
    });
    if (!result.ok) {
      updateProfile(profile.id, { error: result.message });
      setStatus(result.message);
      setBusy(false);
      return;
    }
    const url = URL.createObjectURL(new Blob([new Uint8Array(result.bytes)], { type: "image/jpeg" }));
    updateProfile(profile.id, {
      error: null,
      exportRecord: {
        bytes: result.bytes,
        url,
        hash: result.hash,
        checks: result.checks,
        metadata: result.metadata,
        rows: result.rows,
        byteIdentical: false,
      },
    });
    setBusy(false);
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm">Editing <strong>{profile.label}</strong>. The download name will say who this photo is for.</p>
      <div className="editor">
        <div className="grid gap-2">
        <div className="editor-stage">
          <div className="mb-2 flex flex-wrap gap-1">
            <button type="button" className="tool-button" onClick={() => rotate(-1)}>Rotate left</button>
            <button type="button" className="tool-button" onClick={() => rotate(1)}>Rotate right</button>
            <button type="button" className="tool-button" onClick={() => commitCrop(profile.id, { ...profile.crop, zoom: 1, panX: 0, panY: 0 })}>Fit</button>
            <button type="button" className="tool-button" onClick={() => commitCrop(profile.id, { ...profile.crop, panX: 0, panY: 0 })}>Center</button>
            <button type="button" className="tool-button" onClick={() => undoCrop(profile.id)} disabled={profile.past.length === 0}>Undo</button>
            <button type="button" className="tool-button" onClick={() => redoCrop(profile.id)} disabled={profile.future.length === 0}>Redo</button>
            <button type="button" className="tool-button" onClick={() => setGuides((value) => !value)} aria-pressed={guides}>
              {guides ? "Hide guides" : "Show guides"}
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={800}
            height={800}
            role="img"
            aria-label="Crop preview. Drag to reposition. Use the buttons to zoom and rotate."
            className="mx-auto block h-auto max-h-[70vh] w-auto max-w-full touch-none bg-[#c5cad3]"
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onWheel={(event) => {
              event.preventDefault();
              zoomBy(event.deltaY < 0 ? 0.08 : -0.08);
            }}
          />
        </div>
        {guides ? <GuideCaption ruleUrl={rule?.sourceUrl} /> : null}
        {!inside ? <p className="status-warn">The crop extends outside the photo. Empty areas are shown in gray and will not be exported.</p> : null}
        </div>
        <aside className="editor-side">
          <label className="text-sm font-medium">
            Zoom
            <input
              className="mt-2 block w-full"
              type="range"
              min={0.2}
              max={4}
              step={0.01}
              value={profile.crop.zoom}
              aria-valuetext={`${profile.crop.zoom.toFixed(2)} times`}
              onChange={(event) => updateProfile(profile.id, { crop: { ...profile.crop, zoom: Number(event.target.value) } })}
              onPointerUp={() => commitCrop(profile.id, profile.crop)}
            />
          </label>
          <LightingControls profile={profile} noteRef={lightingNote} showOriginal={showOriginal} onShowOriginal={setShowOriginal} />
          <button type="button" className="button-primary" onClick={exportPhoto} disabled={busy}>
            {busy ? "Preparing…" : "Create 600 × 600 JPEG"}
          </button>
          {status ? <p className="status-warn" role="status">{status}</p> : null}
        </aside>
      </div>
      {profile.exportRecord ? <ExportResult profile={profile} /> : null}
    </div>
  );
}

function GuideCaption({ ruleUrl }: { ruleUrl?: string }) {
  return (
    <p className="mt-2 text-sm text-[var(--muted)]">
      Guides are approximate: about 50% to 69% of the height from chin to the top of the head. They are not an official measurement, and the photo is not stretched to fit them.
      {ruleUrl ? (
        <>
          {" "}
          <a href={ruleUrl}>Official photo requirements</a>
        </>
      ) : null}
    </p>
  );
}

function LightingControls({
  profile,
  noteRef,
  showOriginal,
  onShowOriginal,
}: {
  profile: PhotoProfile;
  noteRef: RefObject<HTMLParagraphElement | null>;
  showOriginal: boolean;
  onShowOriginal: (value: boolean) => void;
}) {
  return (
    <fieldset className="border-t border-[var(--line)] pt-3">
      <legend className="px-1 text-sm font-semibold">Gentle lighting correction</legend>
      <p className="text-sm text-[var(--muted)]">
        Off by default. This is a small exposure and color-cast adjustment, not a beauty filter. Official guidance says photos must not be digitally altered to change appearance. Leave it off if you are unsure.
      </p>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={profile.lightingEnabled}
          onChange={(event) => {
            updateProfile(profile.id, { lightingEnabled: event.target.checked, exportRecord: null });
            if (!event.target.checked) onShowOriginal(false);
          }}
        />
        Enable gentle lighting correction
      </label>
      <label className="mt-2 block text-sm">
        Intensity {Math.round(profile.lightingIntensity * 100)}%
        <input
          className="mt-1 block w-full"
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={profile.lightingIntensity}
          disabled={!profile.lightingEnabled}
          aria-valuetext={`${Math.round(profile.lightingIntensity * 100)} percent`}
          onChange={(event) => updateProfile(profile.id, { lightingIntensity: Number(event.target.value), exportRecord: null })}
        />
      </label>
      <button
        type="button"
        className="button-secondary mt-2"
        disabled={!profile.lightingEnabled}
        aria-pressed={showOriginal}
        onClick={() => onShowOriginal(!showOriginal)}
      >
        {showOriginal ? "Show correction" : "Show original"}
      </button>
      <p ref={noteRef} className="mt-2 text-sm" role="status">
        Off. The preview matches the photograph, with no lighting change.
      </p>
    </fieldset>
  );
}

function ExportResult({ profile }: { profile: PhotoProfile }) {
  const record = profile.exportRecord;
  if (!record) return null;
  const passed = record.checks.every((check) => check.state === "pass");
  return (
    <section className="grid gap-4 border-t border-[var(--line)] pt-4" aria-live="polite">
      <h2 className="text-xl font-semibold">{passed ? "Technical checks passed" : "Review required"}</h2>
      <p>{passed ? product.technicalPass : "Technical issues remain, or some items could not be verified. Correct them before relying on this file."}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={profile.previewUrl} alt="Original photograph" className="max-h-80 w-full bg-[var(--stage)] object-contain" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={record.url} alt={`Exported JPEG for ${profile.label}`} className="max-h-80 w-full bg-[var(--stage)] object-contain" />
      </div>
      <p className="text-sm">
        Output {record.checks.find((item) => item.id === "width")?.detail} {record.byteIdentical ? "Bytes were not re-encoded." : "The export was re-encoded, so its SHA-256 differs from the original."} Exported hash {record.hash.slice(0, 12)}….
      </p>
      <ResultList results={record.checks} />
      <MetadataTable rows={record.rows} />
      <div className="flex flex-wrap gap-2">
        <a className="button-primary" href={record.url} download={photoDownloadName(profile.label)}>
          Download DV photo for {profile.label}
        </a>
        <button type="button" className="button-secondary" onClick={() => updateProfile(profile.id, { completed: true })}>
          Mark {profile.label} prepared
        </button>
      </div>
      <AfterDownload label={profile.label} />
    </section>
  );
}

function AfterDownload({ label }: { label: string }) {
  const filename = photoDownloadName(label);
  return (
    <section>
      <h2 className="font-semibold">After you download</h2>
      <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-6">
        <li>Save {filename}. That file is only for {label}.</li>
        <li>Leave it as it is. Opening it in an app that smooths skin, changes the background, or reshapes the face can make it unsuitable.</li>
        <li>
          If someone else must be listed, prepare their photo separately on the <Link href="/family-photos">family page</Link>. Do not put two people in one picture.
        </li>
        <li>
          When the official site says entries are open, submit the entry yourself at{" "}
          <a href="https://dvprogram.state.gov/">dvprogram.state.gov</a>. Save the confirmation number that site gives you. Do not type it into DV Ready.
        </li>
      </ol>
      <p className="mt-3 text-sm">
        <Link href="/photo-checklist">Review the checklist</Link>
        <span className="px-2 text-[var(--line)]">/</span>
        <Link href="/dv-2027-guide">Read the entry guide</Link>
      </p>
    </section>
  );
}

function AgeNote({ profile }: { profile: PhotoProfile }) {
  return (
    <section>
      <h2 className="font-semibold">Photo age</h2>
      <p className="mt-1 text-sm">{profile.age.detail}</p>
      {profile.age.timezoneNote ? <p className="mt-1 text-sm text-[var(--muted)]">{profile.age.timezoneNote}</p> : null}
    </section>
  );
}

function MetadataSummary({ profile }: { profile: PhotoProfile }) {
  const items = [
    ["Camera", [profile.metadata.make, profile.metadata.model].filter(Boolean).join(" ") || "Not in the file"],
    ["Lens", profile.metadata.lensModel ?? "Not in the file"],
    ["Exposure", [profile.metadata.exposureTime, profile.metadata.fNumber, profile.metadata.iso ? `ISO ${profile.metadata.iso}` : null].filter(Boolean).join(" · ") || "Not in the file"],
    ["GPS", profile.metadata.gpsPresent ? "Present in the original. It is left out of exports unless you opt in on the crop screen." : "Not present"],
  ];
  return (
    <section>
      <h2 className="font-semibold">Original metadata</h2>
      <dl className="mt-2 grid gap-1 text-sm">
        {items.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[7rem_1fr] gap-2">
            <dt className="text-[var(--muted)]">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {profile.metadata.gpsPresent ? (
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={profile.keepGps} onChange={(event) => updateProfile(profile.id, { keepGps: event.target.checked })} />
          Keep location metadata in an export. Off by default. Coordinates are not shown here.
        </label>
      ) : null}
    </section>
  );
}

function MetadataTable({ rows }: { rows: MetadataRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="mb-2 text-left font-semibold">Metadata after export</caption>
        <thead>
          <tr>
            <th className="py-1 pr-2">Field</th>
            <th className="py-1 pr-2">Original</th>
            <th className="py-1 pr-2">Exported</th>
            <th className="py-1">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.field} className="border-t border-[var(--line)]">
              <td className="py-1 pr-2">{row.field}</td>
              <td className="py-1 pr-2">{row.original}</td>
              <td className="py-1 pr-2">{row.exported}</td>
              <td className="py-1">{row.status.replaceAll("_", " ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultList({ results }: { results: CheckResult[] }) {
  return (
    <ul className="check-list">
      {results.map((result) => (
        <li key={result.id} className="check-row">
          <strong className={tone(result.state)}>{labelState(result.state)}</strong>
          <span>
            <span className="font-medium">{result.label}. </span>
            {result.detail}
            {result.sourceUrl ? (
              <>
                {" "}
                <a href={result.sourceUrl}>Source</a>
              </>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function labelState(state: CheckResult["state"]) {
  if (state === "pass") return "Pass";
  if (state === "needs_attention") return "Needs attention";
  return "Unable to verify";
}

function tone(state: CheckResult["state"]) {
  if (state === "pass") return "text-[var(--pass)]";
  if (state === "needs_attention") return "text-[var(--warn)]";
  return "text-[var(--muted)]";
}

function readQueuedPerson(): { role: ProfileRole; label: string } | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem("dv-ready-next-label");
  if (!raw) return null;
  sessionStorage.removeItem("dv-ready-next-label");
  try {
    const parsed = JSON.parse(raw) as { role?: ProfileRole; label?: string };
    if (!parsed.role || !parsed.label) return null;
    return { role: parsed.role, label: parsed.label.slice(0, 40) };
  } catch {
    return null;
  }
}

export function profileRoleLabel(role: ProfileRole) {
  if (role === "principal") return "Principal entrant";
  if (role === "spouse") return "Spouse";
  if (role === "child") return "Child";
  return "Other family member";
}

export function useProfiles() {
  return useSyncExternalStore(subscribePhoto, getPhotoState, getPhotoState);
}
