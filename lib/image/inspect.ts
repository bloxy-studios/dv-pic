export type ImageKind = "jpeg" | "png" | "webp" | "gif" | "tiff" | "raw" | "unknown";

export type JpegInfo = {
  width: number;
  height: number;
  components: number;
  precision: number;
};

export type ImageInspection = {
  kind: ImageKind;
  byteLength: number;
  width: number | null;
  height: number | null;
  components: number | null;
  precision: number | null;
  iccDescription: string | null;
  decoded: boolean;
  rawBrand: string | null;
};

const JPEG_SOI = 0xffd8;

export function sniffKind(bytes: Uint8Array): { kind: ImageKind; rawBrand: string | null } {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { kind: "jpeg", rawBrand: null };
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { kind: "png", rawBrand: null };
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return { kind: "webp", rawBrand: null };
  }
  if (bytes.length >= 6 && (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a")) {
    return { kind: "gif", rawBrand: null };
  }
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4);
    if (brand.startsWith("crx") || brand === "CR3 " || brand.toLowerCase().includes("nef")) {
      return { kind: "raw", rawBrand: brand.trim() };
    }
    return { kind: "unknown", rawBrand: brand.trim() };
  }
  if (
    bytes.length >= 4 &&
    ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
      (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a))
  ) {
    return { kind: "tiff", rawBrand: null };
  }
  return { kind: "unknown", rawBrand: null };
}

export function readJpegInfo(bytes: Uint8Array): JpegInfo | null {
  if (bytes.length < 4 || readU16(bytes, 0) !== JPEG_SOI) return null;
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) return null;
    if (offset + 1 >= bytes.length) return null;
    const length = readU16(bytes, offset);
    if (length < 2 || offset + length > bytes.length) return null;
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof) {
      const precision = bytes[offset + 2] ?? 0;
      const height = readU16(bytes, offset + 3);
      const width = readU16(bytes, offset + 5);
      const components = bytes[offset + 7] ?? 0;
      if (!width || !height || !components) return null;
      return { width, height, components, precision };
    }
    offset += length;
  }
  return null;
}

export function readPngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (sniffKind(bytes).kind !== "png" || bytes.length < 24) return null;
  if (ascii(bytes, 12, 4) !== "IHDR") return null;
  const width = readU32(bytes, 16);
  const height = readU32(bytes, 20);
  if (!width || !height) return null;
  return { width, height };
}

export function readIccDescription(bytes: Uint8Array): string | null {
  const { kind } = sniffKind(bytes);
  if (kind !== "jpeg") return null;
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) break;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xda || marker === 0xd9) break;
    const length = readU16(bytes, offset);
    if (length < 2 || offset + length > bytes.length) break;
    if (marker === 0xe2) {
      const header = ascii(bytes, offset + 2, 11);
      if (header === "ICC_PROFILE") {
        const text = ascii(bytes, offset + 2, Math.min(length - 2, 180));
        const match = text.match(/sRGB IEC61966-2\.1|sRGB|Adobe RGB \(1998\)|Display P3/i);
        return match?.[0] ?? "embedded profile";
      }
    }
    offset += length;
  }
  return null;
}

export function inspectImageBytes(bytes: Uint8Array): ImageInspection {
  const sniffed = sniffKind(bytes);
  const jpeg = sniffed.kind === "jpeg" ? readJpegInfo(bytes) : null;
  const png = sniffed.kind === "png" ? readPngSize(bytes) : null;
  return {
    kind: sniffed.kind,
    byteLength: bytes.length,
    width: jpeg?.width ?? png?.width ?? null,
    height: jpeg?.height ?? png?.height ?? null,
    components: jpeg?.components ?? (png ? null : null),
    precision: jpeg?.precision ?? null,
    iccDescription: readIccDescription(bytes),
    decoded: Boolean(jpeg || png),
    rawBrand: sniffed.rawBrand,
  };
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let value = "";
  for (let i = 0; i < length && start + i < bytes.length; i += 1) {
    value += String.fromCharCode(bytes[start + i] ?? 0);
  }
  return value;
}

function readU16(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) * 0x1000000 +
      ((bytes[offset + 1] ?? 0) << 16) +
      ((bytes[offset + 2] ?? 0) << 8) +
      (bytes[offset + 3] ?? 0)) >>>
    0
  );
}
