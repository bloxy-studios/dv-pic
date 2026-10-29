import { MAX_PHOTO_BYTES, OUTPUT_SIZE, sources } from "./sources";
import type { PhotoRule } from "./types";

const general = sources.photoRequirements;
const digital = sources.digitalImage;

export const photoRules: PhotoRule[] = [
  {
    id: "jpeg-format",
    programYear: "DV-general",
    category: "technical",
    title: "JPEG file",
    description: "The DV entry image must be a JPEG (.jpg).",
    sourceUrl: general.url,
    sourceLabel: general.label,
    verifiedOn: general.verifiedOn,
    verificationStatus: "active_general_dv",
    applicantScope: "both",
    howTested: "The file header is inspected. The name and browser MIME type are not trusted.",
    limitation: "A JPEG container can still hold a poor or altered photograph.",
    active: true,
  },
  {
    id: "dimensions-600",
    programYear: "DV-general",
    category: "technical",
    title: "600 × 600 pixels",
    description:
      "The Diversity Visa entry section of the photo requirements page requires a digital image of 600×600 pixels. The general digital-image page allows 600×600 through 1200×1200 and says to follow the specific requirement. This tool follows the DV-specific 600×600 size.",
    sourceUrl: general.url,
    sourceLabel: general.label,
    verifiedOn: general.verifiedOn,
    verificationStatus: "active_general_dv",
    applicantScope: "both",
    howTested: "Decoded pixel width and height are compared with 600 and 600.",
    limitation:
      "No separate DV-2027 instruction document was available on the verification date. This is the current DV entry size on the photo requirements page, not a newly published DV-2027 rule.",
    active: true,
  },
  {
    id: "square",
    programYear: "DV-general",
    category: "technical",
    title: "Square aspect ratio",
    description: "Height must equal width.",
    sourceUrl: general.url,
    sourceLabel: general.label,
    verifiedOn: general.verifiedOn,
    verificationStatus: "active_general_dv",
    applicantScope: "both",
    howTested: "Decoded width is compared with decoded height.",
    limitation: "A square file can still crop the head poorly.",
    active: true,
  },
  {
    id: "max-bytes",
    programYear: "DV-general",
    category: "technical",
    title: "File size at most 240 kB",
    description: `The page says the image must be equal to or less than 240 kB (kilobytes). DV Ready treats that as ${MAX_PHOTO_BYTES.toLocaleString("en-US")} bytes, not 240 × 1024.`,
    sourceUrl: general.url,
    sourceLabel: general.label,
    verifiedOn: general.verifiedOn,
    verificationStatus: "active_general_dv",
    applicantScope: "both",
    howTested: "The encoded file's byte length is measured after compression and metadata insertion.",
    limitation:
      "The Department did not publish an explicit byte count. 240 × 1,000 is the SI reading of “kB (kilobytes).”",
    active: true,
  },
  {
    id: "color",
    programYear: "DV-general",
    category: "technical",
    title: "Color image",
    description: "The photograph must be in color. The digital-image page also says 24 bits per pixel.",
    sourceUrl: digital.url,
    sourceLabel: digital.label,
    verifiedOn: digital.verifiedOn,
    verificationStatus: "active_general_dv",
    applicantScope: "both",
    howTested: "JPEG component count and sample precision are read from the frame header when possible.",
    limitation: "A three-channel file can still be visually monochrome.",
    active: true,
  },
  {
    id: "srgb",
    programYear: "DV-general",
    category: "technical",
    title: "sRGB color space",
    description:
      "The digital-image page says the image must be in the sRGB color space, the common output of most digital cameras.",
    sourceUrl: digital.url,
    sourceLabel: digital.label,
    verifiedOn: digital.verifiedOn,
    verificationStatus: "active_general_dv",
    applicantScope: "both",
    howTested: "An embedded ICC description is read when present.",
    limitation:
      "Many camera JPEGs omit an ICC profile and are still intended as sRGB. Missing profile information is reported as unable to verify, not as a failure.",
    active: true,
  },
  {
    id: "compression-ratio",
    programYear: "DV-general",
    category: "technical",
    title: "Compression ratio at most 20:1",
    description:
      "The digital-image page says the compression ratio should be less than or equal to 20:1.",
    sourceUrl: digital.url,
    sourceLabel: digital.label,
    verifiedOn: digital.verifiedOn,
    verificationStatus: "active_general_dv",
    applicantScope: "both",
    howTested:
      "Encoded bytes are compared with an uncompressed 24-bit estimate (width × height × 3).",
    limitation:
      "JPEG does not store the original compression ratio. This is an estimate, not the encoder setting.",
    active: true,
  },
  {
    id: "recent-photo",
    programYear: "DV-general",
    category: "process",
    title: "Taken within the last six months",
    description:
      "The photo must have been taken within the last six months and reflect current appearance.",
    sourceUrl: general.url,
    sourceLabel: general.label,
    verifiedOn: general.verifiedOn,
    verificationStatus: "active_general_dv",
    applicantScope: "both",
    howTested:
      "DateTimeOriginal is compared with the check date using calendar months. Other timestamps are not treated as proof.",
    limitation:
      "EXIF dates can be missing, wrong, or edited. Metadata cannot prove when the shutter was pressed or that the photo matches current appearance.",
    active: true,
  },
  {
    id: "head-size",
    programYear: "DV-general",
    category: "composition",
    title: "Head size 50% to 69% of image height",
    description:
      "The head, from the bottom of the chin to the top of the head, must be 1 inch to 1 3/8 inches (22 mm to 35 mm), or 50% to 69% of the image height.",
    sourceUrl: general.url,
    sourceLabel: general.label,
    verifiedOn: general.verifiedOn,
    verificationStatus: "active_general_dv",
    applicantScope: "both",
    howTested:
      "A face model can estimate forehead-to-chin distance. That is not the crown-to-chin measurement, so the official range is not marked passed from landmarks alone.",
    limitation:
      "Hair, head coverings, and the crown are not measured reliably. The on-screen guides are approximate.",
    active: true,
  },
  {
    id: "background-expression-pose",
    programYear: "DV-general",
    category: "composition",
    title: "Background, pose, and expression",
    description:
      "Use a plain white or off-white background, face the camera directly, keep a neutral expression, and keep both eyes open. Do not wear eyeglasses except in the narrow medical case described by the Department. Headphones are not acceptable. A head covering is not acceptable unless it is worn daily for a religious purpose, the full face is visible, and it casts no shadow. Do not digitally alter the photo to change appearance.",
    sourceUrl: general.url,
    sourceLabel: general.label,
    verifiedOn: general.verifiedOn,
    verificationStatus: "active_general_dv",
    applicantScope: "both",
    howTested:
      "Background uniformity, face count, position, tilt, and a face model's blink and smile scores are estimates. Glasses, religious head coverings, and digital alteration are left for the applicant to review.",
    limitation:
      "Automated checks cannot determine religion, medical need, or whether a photo was edited.",
    active: true,
  },
  {
    id: "family-photos",
    programYear: "DV-2026-historical",
    category: "process",
    title: "Photographs for included family members",
    description:
      "DV-2026 instructions required recent photos of the entrant, spouse, and derivative children included on the entry, with the same technical standards. A photo was not required for a spouse or child who is already a U.S. citizen or lawful permanent resident.",
    sourceUrl: sources.dv2026InstructionsPdf.url,
    sourceLabel: sources.dv2026InstructionsPdf.label,
    verifiedOn: sources.dv2026InstructionsPdf.verifiedOn,
    verificationStatus: "historical",
    applicantScope: "both",
    howTested: "The family workspace keeps a separate photo for each person. It does not decide who must be included.",
    limitation:
      "This text is from the DV-2026 instructions. DV-2027 family-photo rules were not confirmed in a DV-2027 instruction document on the verification date.",
    active: false,
  },
];

export const activeRules = photoRules.filter((rule) => rule.active);

export const outputSpec = {
  width: OUTPUT_SIZE,
  height: OUTPUT_SIZE,
  maxBytes: MAX_PHOTO_BYTES,
  filename: `dv-photo-${OUTPUT_SIZE}x${OUTPUT_SIZE}.jpg`,
};

/** A separate download name for each person, so family photos do not overwrite one another. */
export function photoDownloadName(label: string): string {
  const slug = label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return `dv-photo-${slug || "applicant"}-${OUTPUT_SIZE}x${OUTPUT_SIZE}.jpg`;
}
