export type ChecklistItem = {
  id: string;
  section: string;
  label: string;
};

export const checklistSections = [
  "Before taking the photo",
  "Before exporting",
  "Before submitting the entry",
] as const;

export const checklistItems: ChecklistItem[] = [
  { id: "recent", section: checklistSections[0], label: "The photo is recent enough for the current six-month requirement." },
  { id: "appearance", section: checklistSections[0], label: "The photo reflects the applicant’s current appearance." },
  { id: "facing", section: checklistSections[0], label: "The applicant faces the camera." },
  { id: "background", section: checklistSections[0], label: "The background is plain white or off-white." },
  { id: "lighting", section: checklistSections[0], label: "Lighting is even, without a strong shadow across the face." },
  { id: "focus", section: checklistSections[0], label: "The face is in focus." },
  { id: "neutral", section: checklistSections[0], label: "The expression is neutral." },
  { id: "eyes", section: checklistSections[0], label: "Both eyes are open." },
  { id: "glasses", section: checklistSections[0], label: "Eyeglasses are removed, unless the narrow medical exception on the official photo page applies." },
  { id: "clothes", section: checklistSections[0], label: "Clothing and any head covering follow the official rules. A religious head covering worn daily is not automatically disallowed." },
  { id: "alone", section: checklistSections[0], label: "No one else is visible." },
  { id: "square", section: checklistSections[1], label: "The crop is square and the person was not stretched." },
  { id: "head-visible", section: checklistSections[1], label: "The full head and required facial features are visible." },
  { id: "head-size", section: checklistSections[1], label: "Head size was checked against the official range, not only against the face box." },
  { id: "format", section: checklistSections[1], label: "The output is JPEG at the required dimensions and file size." },
  { id: "unaltered", section: checklistSections[1], label: "The photo was not digitally altered to change appearance." },
  { id: "warnings", section: checklistSections[1], label: "Warnings from DV Ready were reviewed." },
  { id: "correct-person", section: checklistSections[2], label: "The correct photo is selected for this applicant." },
  { id: "belongs", section: checklistSections[2], label: "The photo belongs to the person it will be submitted for." },
  { id: "current", section: checklistSections[2], label: "The applicant confirms the photo is current." },
  { id: "official", section: checklistSections[2], label: "The applicant has read the official instructions, not only this tool." },
  { id: "limits", section: checklistSections[2], label: "The applicant understands that automated checks cannot guarantee acceptance." },
];

export const CHECKLIST_STORAGE_KEY = "dv-ready-checklist-v1";
