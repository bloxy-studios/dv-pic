import { assessPhotoAge, localCivilDate } from "@/lib/dates/photo-age";
import type { PhotoAgeResult } from "@/lib/dates/photo-age";
import { searchJpegQuality } from "@/lib/image/encode";
import { embedMetadata, readMetadata } from "@/lib/image/exif-io";
import { inspectImageBytes } from "@/lib/image/inspect";
import type { ImageInspection } from "@/lib/image/inspect";
import { analyzeLuminance, applyGentleLighting } from "@/lib/image/lighting";
import type { LumaPlan } from "@/lib/image/lighting";
import { compareMetadata } from "@/lib/image/metadata";
import type { MetadataRow, MetadataSnapshot } from "@/lib/image/metadata";
import { sha256Hex } from "@/lib/image/encode";
import { clampCrop, containScale, type CropTransform } from "@/lib/image/crop-math";
import { OUTPUT_SIZE, MAX_PHOTO_BYTES } from "@/lib/rules/sources";
import { validateTechnical } from "@/lib/validation/technical";
import type { CheckResult } from "@/lib/rules/types";

export const MAX_UPLOAD_BYTES = 30_000_000;

export type PreparedExport = {
  bytes: Uint8Array;
  hash: string;
  checks: CheckResult[];
  metadata: MetadataSnapshot;
  rows: MetadataRow[];
  byteIdentical: boolean;
  url: string;
};

export async function readFileBytes(file: File): Promise<Uint8Array> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("This file is over 30 MB. Export a smaller JPEG from your camera software and try again.");
  }
  return new Uint8Array(await file.arrayBuffer());
}

export async function uprightBitmap(bytes: Uint8Array, mime: string, orientation: number | null): Promise<ImageBitmap> {
  const blob = new Blob([new Uint8Array(bytes)], { type: mime });
  const source = await createImageBitmap(blob, { imageOrientation: "none" });
  const turn = orientation ?? 1;
  if (turn === 1) return source;
  const swapped = turn >= 5 && turn <= 8;
  const canvas = document.createElement("canvas");
  canvas.width = swapped ? source.height : source.width;
  canvas.height = swapped ? source.width : source.height;
  const context = canvas.getContext("2d");
  if (!context) {
    source.close();
    throw new Error("This browser could not prepare the image.");
  }
  context.save();
  if (turn === 2) context.transform(-1, 0, 0, 1, canvas.width, 0);
  if (turn === 3) context.transform(-1, 0, 0, -1, canvas.width, canvas.height);
  if (turn === 4) context.transform(1, 0, 0, -1, 0, canvas.height);
  if (turn === 5) context.transform(0, 1, 1, 0, 0, 0);
  if (turn === 6) context.transform(0, 1, -1, 0, canvas.width, 0);
  if (turn === 7) context.transform(0, -1, -1, 0, canvas.width, canvas.height);
  if (turn === 8) context.transform(0, -1, 1, 0, 0, canvas.height);
  context.drawImage(source, 0, 0);
  context.restore();
  source.close();
  return createImageBitmap(canvas);
}

export function paintCrop(
  context: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  crop: CropTransform,
  viewSize: number,
) {
  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;
  context.clearRect(0, 0, viewSize, viewSize);
  context.fillStyle = "#d6d3d1";
  context.fillRect(0, 0, viewSize, viewSize);
  context.save();
  context.translate(viewSize / 2 + crop.panX * viewSize, viewSize / 2 + crop.panY * viewSize);
  context.rotate((crop.rotation * Math.PI) / 180);
  const scale = (viewSize * crop.zoom) / containScale(sourceWidth, sourceHeight, crop.rotation);
  context.scale(scale, scale);
  context.drawImage(bitmap, -sourceWidth / 2, -sourceHeight / 2);
  context.restore();
}

export async function exportPreparedPhoto(options: {
  bitmap: ImageBitmap;
  crop: CropTransform;
  original: Uint8Array;
  metadata: MetadataSnapshot;
  lightingEnabled: boolean;
  lightingIntensity: number;
  keepGps: boolean;
  unchangedBytes?: Uint8Array | null;
}): Promise<
  | {
      ok: true;
      bytes: Uint8Array;
      hash: string;
      checks: CheckResult[];
      metadata: MetadataSnapshot;
      rows: MetadataRow[];
      byteIdentical: boolean;
      lighting: LumaPlan;
    }
  | { ok: false; message: string; lighting: LumaPlan }
> {
  if (options.unchangedBytes) {
    const hash = await sha256Hex(options.unchangedBytes);
    const inspection = inspectImageBytes(options.unchangedBytes);
    const metadata = await readMetadata(options.unchangedBytes);
    return {
      ok: true,
      bytes: options.unchangedBytes,
      hash,
      checks: validateTechnical(inspection),
      metadata,
      rows: compareMetadata(options.metadata, metadata, options.keepGps ? "keep" : "strip"),
      byteIdentical: true,
      lighting: emptyPlan(),
    };
  }

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return { ok: false, message: "This browser could not encode the photo.", lighting: emptyPlan() };
  paintCrop(context, options.bitmap, clampCrop(options.bitmap.width, options.bitmap.height, options.crop), OUTPUT_SIZE);
  const pixels = context.getImageData(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  const lighting = analyzeLuminance(pixels.data);
  if (options.lightingEnabled) {
    if (!lighting.allowCorrection) {
      return {
        ok: false,
        message: `${lighting.detail} Lighting correction was not applied.`,
        lighting,
      };
    }
    const adjusted = applyGentleLighting(pixels.data, options.lightingIntensity);
    context.putImageData(new ImageData(new Uint8ClampedArray(adjusted), OUTPUT_SIZE, OUTPUT_SIZE), 0, 0);
  }

  const encoded = await searchJpegQuality({
    maxBytes: MAX_PHOTO_BYTES,
    encode: async (quality) => {
      const jpeg = await canvasToJpeg(canvas, quality);
      return embedMetadata(
        jpeg,
        options.metadata,
        { width: OUTPUT_SIZE, height: OUTPUT_SIZE },
        options.keepGps ? "keep" : "strip",
        options.keepGps ? options.original : null,
      );
    },
  });
  if (!encoded) {
    return {
      ok: false,
      message:
        "The photo could not be saved under 240 kB without dropping below the quality floor. Take a simpler, well-lit photograph or start from a smaller original.",
      lighting,
    };
  }
  const inspection = inspectImageBytes(encoded.bytes);
  const decoded = await createImageBitmap(new Blob([new Uint8Array(encoded.bytes)], { type: "image/jpeg" })).then(
    (bitmap) => {
      const valid = bitmap.width === OUTPUT_SIZE && bitmap.height === OUTPUT_SIZE;
      bitmap.close();
      return valid;
    },
    () => false,
  );
  if (!decoded || inspection.width !== OUTPUT_SIZE || inspection.height !== OUTPUT_SIZE) {
    return { ok: false, message: "The exported file could not be decoded at 600 × 600.", lighting };
  }
  const exportedMeta = await readMetadata(encoded.bytes);
  return {
    ok: true,
    bytes: encoded.bytes,
    hash: await sha256Hex(encoded.bytes),
    checks: validateTechnical({ ...inspection, decoded: true }),
    metadata: exportedMeta,
    rows: compareMetadata(options.metadata, exportedMeta, options.keepGps ? "keep" : "strip"),
    byteIdentical: false,
    lighting,
  };
}

export function ageFor(metadata: MetadataSnapshot, today = localCivilDate()): PhotoAgeResult {
  return assessPhotoAge({
    dateTimeOriginal: metadata.dateTimeOriginal,
    offsetTimeOriginal: metadata.offsetTimeOriginal,
    dateTimeDigitized: metadata.dateTimeDigitized,
    dateTime: metadata.dateTime,
    today,
  });
}

export function unchangedDownloadAllowed(inspection: ImageInspection, metadata: MetadataSnapshot): boolean {
  return (
    inspection.kind === "jpeg" &&
    inspection.decoded &&
    inspection.width === OUTPUT_SIZE &&
    inspection.height === OUTPUT_SIZE &&
    inspection.byteLength <= MAX_PHOTO_BYTES &&
    (metadata.orientation === null || metadata.orientation === 1)
  );
}

async function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("JPEG encoding failed."))),
      "image/jpeg",
      quality,
    );
  });
  return new Uint8Array(await blob.arrayBuffer());
}

function emptyPlan(): LumaPlan {
  return {
    mean: 0,
    shadowClip: 0,
    highlightClip: 0,
    recommendation: "none",
    allowCorrection: false,
    detail: "",
  };
}
