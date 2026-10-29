import { sources } from "./sources";

export type RegistrationStatusId = "not_verified_open";

export const registrationStatus = {
  id: "not_verified_open" as RegistrationStatusId,
  programYear: "DV-2027",
  verifiedOn: "2026-10-28",
  headline: "DV-2027 registration is not verified as open",
  summary:
    "On October 28, 2026, DV Ready did not find a Department of State announcement that the DV-2027 entry period is open. The last Department notice retrieved, updated November 5, 2025, said the start date would be announced later. An indexed copy of dvprogram.state.gov said entries were not being accepted and described the closed DV-2026 entry period. That portal text can change. Check the official sites before you enter personal information.",
  mayBeOutdated: true,
  sources: [sources.dv2027Notice, sources.entryPortal, sources.dvInstructions],
};
