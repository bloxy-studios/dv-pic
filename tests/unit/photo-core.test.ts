import { describe, expect, it } from "vitest";
import jpeg from "jpeg-js";
import piexif from "piexifjs";
import { addCalendarMonths, assessPhotoAge, daysInMonth } from "@/lib/dates/photo-age";
import { searchJpegQuality, sha256Hex } from "@/lib/image/encode";
import { binaryToBytes, bytesToBinary, embedMetadata, readMetadata } from "@/lib/image/exif-io";
import { inspectImageBytes } from "@/lib/image/inspect";
import { analyzeLuminance, applyGentleLighting } from "@/lib/image/lighting";
import { compareMetadata, emptyMetadata } from "@/lib/image/metadata";
import { cropCoversSource, defaultCrop } from "@/lib/image/crop-math";
import { unchangedDownloadAllowed } from "@/lib/image/prepare";
import { photoDownloadName } from "@/lib/rules/dv-2027";
import { MAX_PHOTO_BYTES } from "@/lib/rules/sources";
import { validateTechnical } from "@/lib/validation/technical";
import { assessBackground, assessFaces } from "@/lib/vision/assess";

const today = { year: 2026, month: 10, day: 28 };

function jpegBytes(width: number, height: number, quality: number, paint?: (data: Uint8Array) => void) {
  const data = new Uint8Array(width * height * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = 180;
    data[index + 1] = 170;
    data[index + 2] = 160;
    data[index + 3] = 255;
  }
  paint?.(data);
  const encoded = jpeg.encode({ data, width, height }, quality);
  return new Uint8Array(encoded.data);
}

function withExif(bytes: Uint8Array, exif: Record<number, string | number>, gps = false) {
  const zeroth: Record<number, string | number> = {
    [piexif.ImageIFD.Make]: "Canon",
    [piexif.ImageIFD.Model]: "Canon EOS 5D Mark III",
    [piexif.ImageIFD.Orientation]: 6,
  };
  const gpsIfd: Record<number, string | number | Array<[number, number]>> = {};
  if (gps) {
    gpsIfd[piexif.GPSIFD.GPSLatitudeRef] = "N";
    gpsIfd[piexif.GPSIFD.GPSLatitude] = [[40, 1], [0, 1], [0, 1]];
  }
  const dumped = piexif.dump({ "0th": zeroth, Exif: exif, GPS: gpsIfd, "1st": {}, thumbnail: null });
  return binaryToBytes(piexif.insert(dumped, bytesToBinary(bytes)));
}

describe("photo age", () => {
  it("treats the six-month boundary as inside the window", () => {
    const result = assessPhotoAge({ dateTimeOriginal: "2026:04:28 09:00:00", today });
    expect(result.state).toBe("within_window");
    expect(result.boundary).toEqual({ year: 2026, month: 4, day: 28 });
  });

  it("marks the day before the boundary as outside", () => {
    expect(assessPhotoAge({ dateTimeOriginal: "2026:04:27 23:59:59", today }).state).toBe("outside_window");
  });

  it("keeps a missing timezone as a note, not a failure", () => {
    const result = assessPhotoAge({ dateTimeOriginal: "2026:10:01 00:10:00", today });
    expect(result.state).toBe("within_window");
    expect(result.timezoneNote).toMatch(/No UTC offset/);
  });

  it("reads a valid offset without changing the written calendar date", () => {
    const result = assessPhotoAge({
      dateTimeOriginal: "2026:10:01 00:10:00",
      offsetTimeOriginal: "-04:00",
      today,
    });
    expect(result.state).toBe("within_window");
    expect(result.captureDate).toEqual({ year: 2026, month: 10, day: 1 });
  });

  it("does not treat a digitized date as capture proof", () => {
    expect(assessPhotoAge({ dateTimeDigitized: "2026:10:01 00:00:00", today }).state).toBe("inconclusive");
  });

  it("flags conflicting timestamps", () => {
    expect(
      assessPhotoAge({
        dateTimeOriginal: "2026:10:01 00:00:00",
        dateTimeDigitized: "2026:09:01 00:00:00",
        today,
      }).state,
    ).toBe("inconclusive");
  });

  it("flags a future capture date", () => {
    expect(assessPhotoAge({ dateTimeOriginal: "2026:11:02 00:00:00", today }).state).toBe("future_or_inconsistent");
  });

  it("does not call a missing date old or recent", () => {
    const result = assessPhotoAge({ today });
    expect(result.state).toBe("unavailable");
    expect(result.detail).toMatch(/does not automatically mean the photo is too old/);
  });

  it("handles leap-year and end-of-month arithmetic", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(addCalendarMonths({ year: 2024, month: 8, day: 31 }, -6)).toEqual({ year: 2024, month: 2, day: 29 });
    expect(addCalendarMonths({ year: 2025, month: 8, day: 31 }, -6)).toEqual({ year: 2025, month: 2, day: 28 });
    expect(addCalendarMonths({ year: 2026, month: 3, day: 31 }, -6)).toEqual({ year: 2025, month: 9, day: 30 });
  });
});

describe("technical validation", () => {
  it("passes a 600 jpeg under the byte limit", () => {
    const bytes = jpegBytes(600, 600, 40);
    expect(bytes.byteLength).toBeLessThanOrEqual(MAX_PHOTO_BYTES);
    const inspection = inspectImageBytes(bytes);
    const results = validateTechnical(inspection);
    expect(results.find((item) => item.id === "format")?.state).toBe("pass");
    expect(results.find((item) => item.id === "width")?.state).toBe("pass");
    expect(results.find((item) => item.id === "height")?.state).toBe("pass");
    expect(results.find((item) => item.id === "aspect")?.state).toBe("pass");
    expect(results.find((item) => item.id === "file-size")?.state).toBe("pass");
    expect(results.find((item) => item.id === "color")?.state).toBe("pass");
  });

  it("flags wrong dimensions, a nonsquare image, and an oversized file", () => {
    const wide = validateTechnical(inspectImageBytes(jpegBytes(800, 600, 50)));
    expect(wide.find((item) => item.id === "aspect")?.state).toBe("needs_attention");
    const noisy = new Uint8Array(600 * 600 * 4);
    for (let index = 0; index < noisy.length; index += 4) {
      noisy[index] = index % 255;
      noisy[index + 1] = (index * 3) % 255;
      noisy[index + 2] = (index * 7) % 255;
      noisy[index + 3] = 255;
    }
    const huge = new Uint8Array(jpeg.encode({ data: noisy, width: 600, height: 600 }, 100).data);
    expect(huge.byteLength).toBeGreaterThan(MAX_PHOTO_BYTES);
    expect(validateTechnical(inspectImageBytes(huge)).find((item) => item.id === "file-size")?.state).toBe("needs_attention");
  });

  it("identifies png input and a broken jpeg", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 100, 0, 0, 0, 80, 8, 2, 0, 0, 0]);
    expect(inspectImageBytes(png).kind).toBe("png");
    expect(validateTechnical(inspectImageBytes(png)).find((item) => item.id === "format")?.state).toBe("needs_attention");
    const broken = validateTechnical(inspectImageBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xd9])));
    expect(broken.find((item) => item.id === "decode")?.state).toBe("needs_attention");
  });

  it("uses 240000 bytes, not 240 kibibytes", () => {
    expect(MAX_PHOTO_BYTES).toBe(240_000);
  });
});

describe("metadata", () => {
  it("keeps the camera model and capture date, updates dimensions, and strips GPS", async () => {
    const source = withExif(
      jpegBytes(800, 600, 60),
      { [piexif.ExifIFD.DateTimeOriginal]: "2026:10:02 12:00:00" },
      true,
    );
    const before = await sha256Hex(source);
    const original = await readMetadata(source);
    expect(original.model).toContain("5D Mark III");
    expect(original.dateTimeOriginal).toBe("2026:10:02 12:00:00");
    expect(original.gpsPresent).toBe(true);
    expect(original.orientation).toBe(6);
    const exportedJpeg = jpegBytes(600, 600, 50);
    const embedded = embedMetadata(exportedJpeg, original, { width: 600, height: 600 }, "strip", null);
    expect(await sha256Hex(source)).toBe(before);
    expect(await sha256Hex(embedded)).not.toBe(before);
    const exported = await readMetadata(embedded);
    expect(exported.model).toContain("5D Mark III");
    expect(exported.dateTimeOriginal).toBe("2026:10:02 12:00:00");
    expect(exported.dateTimeOriginal).not.toBe("2026:10:28 00:00:00");
    expect(exported.gpsPresent).toBe(false);
    expect(exported.pixelX).toBe(600);
    expect(exported.orientation).toBe(1);
    const rows = compareMetadata(original, exported, "strip");
    expect(rows.find((row) => row.field === "Camera model")?.status).toBe("preserved");
    expect(rows.find((row) => row.field.startsWith("Capture date"))?.status).toBe("preserved");
    expect(rows.find((row) => row.field === "GPS location")?.status).toBe("removed_for_privacy");
    expect(rows.find((row) => row.field === "Pixel width")?.status).toBe("updated");
    expect(rows.find((row) => row.field === "Orientation")?.status).toBe("updated");
  });

  it("does not invent a capture date when the original has none", async () => {
    const source = jpegBytes(32, 32, 40);
    const original = await readMetadata(source);
    expect(original.dateTimeOriginal).toBeNull();
    const embedded = embedMetadata(source, original, { width: 32, height: 32 }, "strip", null);
    expect((await readMetadata(embedded)).dateTimeOriginal).toBeNull();
  });
});

describe("lighting and composition", () => {
  it("leaves correction off unless intensity is applied, and refuses severe frames", () => {
    const dark = new Uint8ClampedArray(64);
    const plan = analyzeLuminance(dark);
    expect(plan.recommendation).toBe("retake");
    expect(plan.allowCorrection).toBe(false);
    const bright = new Uint8ClampedArray(64);
    bright.fill(255);
    expect(analyzeLuminance(bright).recommendation).toBe("retake");
    const mid = new Uint8ClampedArray([120, 120, 120, 255]);
    const copy = applyGentleLighting(mid, 0);
    expect(Array.from(copy)).toEqual(Array.from(mid));
    expect(Array.from(mid)).toEqual([120, 120, 120, 255]);
    const dim = new Uint8ClampedArray(16);
    for (let index = 0; index < dim.length; index += 4) {
      dim[index] = 70;
      dim[index + 1] = 70;
      dim[index + 2] = 70;
      dim[index + 3] = 255;
    }
    expect(analyzeLuminance(dim).allowCorrection).toBe(true);
    expect(applyGentleLighting(dim, 1)[0]).toBeGreaterThan(70);
  });

  it("does not pass missing, multiple, edge, or tilted faces", () => {
    expect(assessFaces(null)[0]?.state).toBe("unable_to_verify");
    expect(assessFaces([])[0]?.state).toBe("needs_attention");
    expect(assessFaces([face(), face()])[0]?.state).toBe("needs_attention");
    const edge = assessFaces([{ ...face(), box: { x: 0, y: 0.2, width: 0.2, height: 0.3 } }]);
    expect(edge.find((item) => item.id === "edges")?.state).toBe("needs_attention");
    const tilted = assessFaces([
      {
        ...face(),
        landmarks: landmarks(0.2),
      },
    ]);
    expect(tilted.find((item) => item.id === "pose")?.state).toBe("needs_attention");
  });

  it("does not pass a cluttered background from an average color", () => {
    const rgba = new Uint8ClampedArray(32 * 32 * 4);
    for (let index = 0; index < rgba.length; index += 4) {
      const on = index % 80 < 40;
      rgba[index] = on ? 20 : 240;
      rgba[index + 1] = on ? 20 : 240;
      rgba[index + 2] = on ? 20 : 240;
      rgba[index + 3] = 255;
    }
    expect(assessBackground(rgba, 32, 32, null).state).not.toBe("pass");
  });
});

describe("export policy", () => {
  it("downloads an already compliant jpeg unchanged only when orientation is normal", () => {
    const inspection = inspectImageBytes(jpegBytes(600, 600, 40));
    expect(unchangedDownloadAllowed(inspection, { ...emptyMetadata(), orientation: 1 })).toBe(true);
    expect(unchangedDownloadAllowed(inspection, { ...emptyMetadata(), orientation: 6 })).toBe(false);
  });

  it("searches for the highest quality under the byte limit", async () => {
    const found = await searchJpegQuality({
      maxBytes: 1000,
      minQuality: 0.5,
      maxQuality: 0.9,
      encode: async (quality) => new Uint8Array(Math.round(2000 - quality * 1500)),
    });
    expect(found?.bytes.byteLength).toBeLessThanOrEqual(1000);
    expect(found?.quality).toBeGreaterThan(0.5);
  });

  it("keeps a landscape crop from claiming the frame is inside the photo at zoom 1", () => {
    expect(cropCoversSource(1200, 800, { ...defaultCrop, zoom: 1 }).inside).toBe(false);
    expect(cropCoversSource(1200, 800, { ...defaultCrop, zoom: 1200 / 800 }).inside).toBe(true);
  });
});

describe("download names", () => {
  it("keeps family photos from sharing one file name", () => {
    expect(photoDownloadName("Spouse")).toBe("dv-photo-spouse-600x600.jpg");
    expect(photoDownloadName("Child one")).toBe("dv-photo-child-one-600x600.jpg");
    expect(photoDownloadName("../secret")).toBe("dv-photo-secret-600x600.jpg");
    expect(photoDownloadName("   ")).toBe("dv-photo-applicant-600x600.jpg");
  });
});

function face() {
  return {
    box: { x: 0.3, y: 0.2, width: 0.4, height: 0.5 },
    score: 0.9,
    landmarks: landmarks(0),
    blinkLeft: 0.1,
    blinkRight: 0.1,
    smile: 0.1,
  };
}

function landmarks(slope: number) {
  const points = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  points[10] = { x: 0.5, y: 0.3 };
  points[152] = { x: 0.5, y: 0.8 };
  points[33] = { x: 0.4, y: 0.45 };
  points[263] = { x: 0.6, y: 0.45 + slope };
  return points;
}
