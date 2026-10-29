import { MAX_PHOTO_BYTES, OUTPUT_SIZE, sources } from "@/lib/rules/sources";
import type { CheckResult } from "@/lib/rules/types";
import type { ImageInspection } from "@/lib/image/inspect";

export type TechnicalSubject = ImageInspection & {
  orientedWidth?: number | null;
  orientedHeight?: number | null;
};

export function validateTechnical(image: TechnicalSubject): CheckResult[] {
  const results: CheckResult[] = [];
  const source = sources.photoRequirements.url;
  const digital = sources.digitalImage.url;

  if (image.kind === "raw" || image.kind === "tiff") {
    results.push({
      id: "format",
      label: "Format",
      state: "needs_attention",
      sourceUrl: source,
      detail: image.rawBrand
        ? `This looks like a camera RAW file (${image.rawBrand}). Export a high-quality JPEG from your camera software. DV Ready does not convert RAW files and does not upload them.`
        : "This looks like a TIFF or camera RAW file. Export a high-quality JPEG from your camera software. DV Ready does not convert RAW files and does not upload them.",
    });
    return results;
  }

  results.push({
    id: "format",
    label: "Format",
    state: image.kind === "jpeg" ? "pass" : "needs_attention",
    sourceUrl: source,
    detail:
      image.kind === "jpeg"
        ? "The file is a JPEG."
        : image.kind === "png" || image.kind === "webp"
          ? `The file is ${image.kind.toUpperCase()}. It can be edited here, but the DV entry file must be JPEG.`
          : "The file is not a JPEG, PNG, or WebP image DV Ready can use.",
  });

  results.push({
    id: "decode",
    label: "Decoding",
    state: image.decoded && image.width && image.height ? "pass" : "needs_attention",
    detail:
      image.decoded && image.width && image.height
        ? "The image decoded successfully."
        : "The file could not be decoded as a usable image. It may be damaged.",
  });

  const width = image.width;
  const height = image.height;
  results.push({
    id: "width",
    label: "Width",
    state: width === OUTPUT_SIZE ? "pass" : width ? "needs_attention" : "unable_to_verify",
    sourceUrl: source,
    detail: width
      ? `Width is ${width} pixels. The DV entry size used by this tool is ${OUTPUT_SIZE}.`
      : "Width could not be read.",
  });
  results.push({
    id: "height",
    label: "Height",
    state: height === OUTPUT_SIZE ? "pass" : height ? "needs_attention" : "unable_to_verify",
    sourceUrl: source,
    detail: height
      ? `Height is ${height} pixels. The DV entry size used by this tool is ${OUTPUT_SIZE}.`
      : "Height could not be read.",
  });
  results.push({
    id: "aspect",
    label: "Aspect ratio",
    state: width && height && width === height ? "pass" : width && height ? "needs_attention" : "unable_to_verify",
    sourceUrl: source,
    detail:
      width && height
        ? width === height
          ? "The image is square."
          : "The image is not square. Cropping can make a square without stretching it."
        : "Aspect ratio could not be read.",
  });

  results.push({
    id: "file-size",
    label: "File size",
    state: image.byteLength <= MAX_PHOTO_BYTES ? "pass" : "needs_attention",
    sourceUrl: source,
    detail: `${image.byteLength.toLocaleString("en-US")} bytes (${formatKb(image.byteLength)} kB). The limit used here is ${MAX_PHOTO_BYTES.toLocaleString("en-US")} bytes (240 kB).`,
  });

  if (image.kind === "jpeg" && image.components) {
    const colorOk = image.components >= 3 && (image.precision === null || image.precision === 8);
    results.push({
      id: "color",
      label: "Color",
      state: colorOk ? "pass" : "needs_attention",
      sourceUrl: digital,
      detail: colorOk
        ? `The JPEG has ${image.components} color components at ${image.precision ?? "unknown"}-bit precision.`
        : "The JPEG does not look like an 8-bit color image.",
    });
  } else {
    results.push({
      id: "color",
      label: "Color",
      state: "unable_to_verify",
      sourceUrl: digital,
      detail: "Color components could not be read from this file before it is exported as JPEG.",
    });
  }

  if (!image.iccDescription) {
    results.push({
      id: "color-space",
      label: "Color space",
      state: "unable_to_verify",
      sourceUrl: digital,
      detail:
        "No ICC profile description was found. Many camera JPEGs are sRGB without an embedded profile. DV Ready will not mark sRGB as passed unless the profile says so.",
    });
  } else if (/srgb/i.test(image.iccDescription)) {
    results.push({
      id: "color-space",
      label: "Color space",
      state: "pass",
      sourceUrl: digital,
      detail: `Embedded profile: ${image.iccDescription}.`,
    });
  } else if (image.iccDescription === "embedded profile") {
    results.push({
      id: "color-space",
      label: "Color space",
      state: "unable_to_verify",
      sourceUrl: digital,
      detail:
        "An ICC profile is embedded, but its name could not be read. The pixels were not marked as a different color space. Confirm the photo is sRGB if your camera can embed that profile.",
    });
  } else {
    results.push({
      id: "color-space",
      label: "Color space",
      state: "needs_attention",
      sourceUrl: digital,
      detail: `Embedded profile “${image.iccDescription}” is not identified as sRGB.`,
    });
  }

  if (width && height && image.kind === "jpeg") {
    const uncompressed = width * height * 3;
    const ratio = uncompressed / image.byteLength;
    results.push({
      id: "compression",
      label: "Compression estimate",
      state: ratio <= 20 ? "pass" : "needs_attention",
      sourceUrl: digital,
      detail: `Estimated compression is ${ratio.toFixed(1)}:1 against an uncompressed 24-bit image. The digital-image page says the ratio should be at most 20:1. This is an estimate.`,
    });
  }

  return results;
}

export function technicalSummary(results: CheckResult[]): "passed" | "issues" | "review" {
  if (results.some((result) => result.state === "needs_attention")) return "issues";
  if (results.some((result) => result.state === "unable_to_verify")) return "review";
  return "passed";
}

export function allTechnicalPass(results: CheckResult[]): boolean {
  return results.every((result) => result.state === "pass");
}

function formatKb(bytes: number): string {
  return (bytes / 1000).toFixed(1);
}
