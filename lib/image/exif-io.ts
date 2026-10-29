import exifr from "exifr";
import piexif from "piexifjs";
import type { MetadataSnapshot } from "./metadata";
import { emptyMetadata } from "./metadata";

type ExifRecord = Record<string, unknown>;

export async function readMetadata(bytes: Uint8Array): Promise<MetadataSnapshot> {
  try {
    const tags = (await exifr.parse(bytes, {
      reviveValues: false,
      translateValues: false,
      mergeOutput: true,
      gps: true,
    })) as ExifRecord | undefined;
    if (!tags) return emptyMetadata();
    const gpsLatitude = tags.latitude ?? tags.GPSLatitude;
    return {
      dateTimeOriginal: asText(tags.DateTimeOriginal),
      dateTimeDigitized: asText(tags.DateTimeDigitized),
      dateTime: asText(tags.DateTime ?? tags.ModifyDate),
      offsetTimeOriginal: asText(tags.OffsetTimeOriginal),
      make: asText(tags.Make),
      model: asText(tags.Model),
      lensMake: asText(tags.LensMake),
      lensModel: asText(tags.LensModel),
      exposureTime: asExposure(tags.ExposureTime),
      fNumber: asNumberText(tags.FNumber, "f/"),
      iso: asText(tags.ISO ?? tags.ISOSpeedRatings ?? tags.PhotographicSensitivity),
      focalLength: asNumberText(tags.FocalLength, "", " mm"),
      orientation: typeof tags.Orientation === "number" ? tags.Orientation : null,
      pixelX: asNumber(tags.PixelXDimension ?? tags.ExifImageWidth),
      pixelY: asNumber(tags.PixelYDimension ?? tags.ExifImageHeight),
      colorSpace: colorSpaceLabel(tags.ColorSpace),
      gpsPresent: gpsLatitude !== undefined && gpsLatitude !== null,
      software: asText(tags.Software),
    };
  } catch {
    return emptyMetadata();
  }
}

export function embedMetadata(
  jpeg: Uint8Array,
  source: MetadataSnapshot,
  output: { width: number; height: number },
  gpsChoice: "strip" | "keep",
  gpsBytes: Uint8Array | null,
): Uint8Array {
  const zeroth: Record<number, string | number | [number, number]> = {};
  const exif: Record<number, string | number | [number, number]> = {};
  const gps: Record<number, string | number | [number, number] | Array<[number, number]>> = {};
  if (source.make) zeroth[piexif.ImageIFD.Make] = source.make;
  if (source.model) zeroth[piexif.ImageIFD.Model] = source.model;
  if (source.software) zeroth[piexif.ImageIFD.Software] = source.software;
  if (source.dateTime) zeroth[piexif.ImageIFD.DateTime] = source.dateTime;
  zeroth[piexif.ImageIFD.Orientation] = 1;
  if (source.dateTimeOriginal) exif[piexif.ExifIFD.DateTimeOriginal] = source.dateTimeOriginal;
  if (source.dateTimeDigitized) exif[piexif.ExifIFD.DateTimeDigitized] = source.dateTimeDigitized;
  if (source.lensMake) exif[piexif.ExifIFD.LensMake] = source.lensMake;
  if (source.lensModel) exif[piexif.ExifIFD.LensModel] = source.lensModel;
  if (source.exposureTime) exif[piexif.ExifIFD.ExposureTime] = toRational(source.exposureTime);
  if (source.fNumber) exif[piexif.ExifIFD.FNumber] = toRational(source.fNumber.replace(/^f\//, ""));
  if (source.iso && Number.isFinite(Number(source.iso))) {
    exif[piexif.ExifIFD.ISOSpeedRatings] = Number(source.iso);
  }
  if (source.focalLength) exif[piexif.ExifIFD.FocalLength] = toRational(source.focalLength.replace(" mm", ""));
  exif[piexif.ExifIFD.PixelXDimension] = output.width;
  exif[piexif.ExifIFD.PixelYDimension] = output.height;
  exif[piexif.ExifIFD.ColorSpace] = 1;

  if (gpsChoice === "keep" && gpsBytes) {
    try {
      const loaded = piexif.load(bytesToBinary(gpsBytes));
      Object.assign(gps, loaded.GPS ?? {});
    } catch {
      // GPS could not be copied. The comparison will show that it was not preserved.
    }
  }

  const dumped = piexif.dump({ "0th": zeroth, Exif: exif, GPS: gps, "1st": {}, thumbnail: null });
  const inserted = piexif.insert(dumped, bytesToBinary(jpeg));
  return binaryToBytes(inserted);
}

function asText(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Date) return formatExifDate(value);
  return String(value);
}

function formatExifDate(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}:${pad(date.getMonth() + 1)}:${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function asNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function asNumberText(value: unknown, prefix = "", suffix = ""): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return `${prefix}${trimNumber(value)}${suffix}`;
  return `${prefix}${String(value).replace(prefix, "").replace(suffix, "")}${suffix}`;
}

function asExposure(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") {
    if (value >= 1) return trimNumber(value);
    const denominator = Math.round(1 / value);
    return `1/${denominator}`;
  }
  return String(value);
}

function colorSpaceLabel(value: unknown): string | null {
  if (value === 1 || value === "1" || value === "sRGB") return "sRGB";
  if (value === 65535 || value === "65535" || value === "Uncalibrated") return "Uncalibrated";
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function toRational(value: string): [number, number] {
  const cleaned = value.trim();
  if (cleaned.includes("/")) {
    const [numerator, denominator] = cleaned.split("/");
    return [Number(numerator), Number(denominator) || 1];
  }
  const number = Number(cleaned);
  if (!Number.isFinite(number)) return [0, 1];
  if (Number.isInteger(number)) return [number, 1];
  return [Math.round(number * 1000), 1000];
}

function trimNumber(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

export function bytesToBinary(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return binary;
}

export function binaryToBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) bytes[index] = value.charCodeAt(index) & 0xff;
  return bytes;
}
