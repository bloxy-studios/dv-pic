/** Official pages consulted on 2026-10-28. travel.state.gov returned 403 to a direct fetch; wording below is from the indexed page text retrieved that day. */
export const sources = {
  photoRequirements: {
    url: "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos.html",
    label: "U.S. Department of State — Photo Requirements",
    verifiedOn: "2026-10-28",
  },
  digitalImage: {
    url: "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos/digital-image-requirements.html",
    label: "U.S. Department of State — Digital Image Requirements",
    verifiedOn: "2026-10-28",
  },
  photoExamples: {
    url: "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos/photo-examples.html",
    label: "U.S. Department of State — Photo Examples",
    verifiedOn: "2026-10-28",
  },
  dvInstructions: {
    url: "https://travel.state.gov/content/travel/en/us-visas/immigrate/diversity-visa-program-entry/diversity-visa-instructions.html",
    label: "U.S. Department of State — Diversity Visa Instructions",
    verifiedOn: "2026-10-28",
  },
  dvSubmit: {
    url: "https://travel.state.gov/content/travel/en/us-visas/immigrate/diversity-visa-program-entry/diversity-visa-submit-entry1.html",
    label: "U.S. Department of State — Submit a DV Entry",
    verifiedOn: "2026-10-28",
  },
  dv2027Notice: {
    url: "https://travel.state.gov/content/travel/en/News/visas-news/changes-to-2027-dv-program-entry-period.html",
    label: "U.S. Department of State — Changes to the DV-2027 entry period (last updated November 5, 2025)",
    verifiedOn: "2026-10-28",
  },
  entryPortal: {
    url: "https://dvprogram.state.gov/",
    label: "Electronic Diversity Visa entry site",
    verifiedOn: "2026-10-28",
  },
  statusCheck: {
    url: "https://dvprogram.state.gov/ESC/CheckStatus.aspx",
    label: "Entrant Status Check",
    verifiedOn: "2026-10-28",
  },
  dv2026InstructionsPdf: {
    url: "https://travel.state.gov/content/dam/visas/Diversity-Visa/DV-Instructions-Translations/DV-2026-Instructions-Translations/DV%202026%20Plain%20Language%20Instructions%20and%20FAQs.pdf",
    label: "DV-2026 plain-language instructions (historical, not a DV-2027 rule)",
    verifiedOn: "2026-10-28",
  },
} as const;

/**
 * 240 kB as written by the Department ("240 kB (kilobytes)").
 * The page does not say 240 × 1024. This app uses the SI kilobyte: 240,000 bytes.
 */
export const MAX_PHOTO_BYTES = 240_000;

export const OUTPUT_SIZE = 600;
