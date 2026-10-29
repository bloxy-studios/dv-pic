export type MetadataSnapshot = {
  dateTimeOriginal: string | null;
  dateTimeDigitized: string | null;
  dateTime: string | null;
  offsetTimeOriginal: string | null;
  make: string | null;
  model: string | null;
  lensMake: string | null;
  lensModel: string | null;
  exposureTime: string | null;
  fNumber: string | null;
  iso: string | null;
  focalLength: string | null;
  orientation: number | null;
  pixelX: number | null;
  pixelY: number | null;
  colorSpace: string | null;
  gpsPresent: boolean;
  software: string | null;
};

export type MetadataStatus =
  | "preserved"
  | "updated"
  | "removed_for_privacy"
  | "not_supported"
  | "missing"
  | "unable_to_verify";

export type MetadataRow = {
  field: string;
  original: string;
  exported: string;
  status: MetadataStatus;
};

export const emptyMetadata = (): MetadataSnapshot => ({
  dateTimeOriginal: null,
  dateTimeDigitized: null,
  dateTime: null,
  offsetTimeOriginal: null,
  make: null,
  model: null,
  lensMake: null,
  lensModel: null,
  exposureTime: null,
  fNumber: null,
  iso: null,
  focalLength: null,
  orientation: null,
  pixelX: null,
  pixelY: null,
  colorSpace: null,
  gpsPresent: false,
  software: null,
});

const FIELDS: { key: keyof MetadataSnapshot; label: string; kind: "copy" | "dimensions" | "orientation" | "gps" }[] =
  [
    { key: "dateTimeOriginal", label: "Capture date (DateTimeOriginal)", kind: "copy" },
    { key: "dateTimeDigitized", label: "Digitized date", kind: "copy" },
    { key: "dateTime", label: "DateTime", kind: "copy" },
    { key: "offsetTimeOriginal", label: "Capture time offset", kind: "copy" },
    { key: "make", label: "Camera make", kind: "copy" },
    { key: "model", label: "Camera model", kind: "copy" },
    { key: "lensMake", label: "Lens make", kind: "copy" },
    { key: "lensModel", label: "Lens model", kind: "copy" },
    { key: "exposureTime", label: "Exposure time", kind: "copy" },
    { key: "fNumber", label: "F-number", kind: "copy" },
    { key: "iso", label: "ISO", kind: "copy" },
    { key: "focalLength", label: "Focal length", kind: "copy" },
    { key: "software", label: "Software", kind: "copy" },
    { key: "orientation", label: "Orientation", kind: "orientation" },
    { key: "pixelX", label: "Pixel width", kind: "dimensions" },
    { key: "pixelY", label: "Pixel height", kind: "dimensions" },
    { key: "colorSpace", label: "Color space tag", kind: "copy" },
    { key: "gpsPresent", label: "GPS location", kind: "gps" },
  ];

export function compareMetadata(
  original: MetadataSnapshot,
  exported: MetadataSnapshot | null,
  gpsChoice: "strip" | "keep",
): MetadataRow[] {
  return FIELDS.map((field) => {
    const originalValue = display(original[field.key]);
    if (!exported) {
      return {
        field: field.label,
        original: originalValue,
        exported: "—",
        status: originalValue === "Not present" ? "missing" : "unable_to_verify",
      };
    }
    const exportedValue = display(exported[field.key]);
    if (field.kind === "gps") {
      if (!original.gpsPresent) {
        return { field: field.label, original: "Not present", exported: exportedValue, status: "missing" };
      }
      if (gpsChoice === "strip" && !exported.gpsPresent) {
        return {
          field: field.label,
          original: "Present",
          exported: "Not present",
          status: "removed_for_privacy",
        };
      }
      if (gpsChoice === "keep" && exported.gpsPresent) {
        return { field: field.label, original: "Present", exported: "Present", status: "preserved" };
      }
      return {
        field: field.label,
        original: "Present",
        exported: exportedValue,
        status: "unable_to_verify",
      };
    }
    if (originalValue === "Not present") {
      if (field.kind === "dimensions" && exportedValue !== "Not present") {
        return { field: field.label, original: originalValue, exported: exportedValue, status: "updated" };
      }
      return {
        field: field.label,
        original: originalValue,
        exported: exportedValue,
        status: exportedValue === "Not present" ? "missing" : "unable_to_verify",
      };
    }
    if (field.kind === "dimensions") {
      return {
        field: field.label,
        original: originalValue,
        exported: exportedValue,
        status: originalValue === exportedValue ? "preserved" : exportedValue === "Not present" ? "not_supported" : "updated",
      };
    }
    if (field.kind === "orientation") {
      return {
        field: field.label,
        original: originalValue,
        exported: exportedValue,
        status:
          exportedValue === "1"
            ? originalValue === "1"
              ? "preserved"
              : "updated"
            : exportedValue === "Not present"
              ? "not_supported"
              : "unable_to_verify",
      };
    }
    if (exportedValue === "Not present") {
      return { field: field.label, original: originalValue, exported: exportedValue, status: "not_supported" };
    }
    return {
      field: field.label,
      original: originalValue,
      exported: exportedValue,
      status: originalValue === exportedValue ? "preserved" : "unable_to_verify",
    };
  });
}

function display(value: MetadataSnapshot[keyof MetadataSnapshot]): string {
  if (typeof value === "boolean") return value ? "Present" : "Not present";
  if (value === null || value === undefined || value === "") return "Not present";
  return String(value);
}
