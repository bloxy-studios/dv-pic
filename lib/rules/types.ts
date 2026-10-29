export type ApplicantScope = "principal" | "derivative" | "both";

export type RuleKind = "technical" | "composition" | "process";

export type VerificationStatus =
  | "active_general_dv"
  | "awaiting_dv2027_confirmation"
  | "historical";

export type PhotoRule = {
  id: string;
  programYear: string;
  category: RuleKind;
  title: string;
  description: string;
  sourceUrl: string;
  sourceLabel: string;
  verifiedOn: string;
  verificationStatus: VerificationStatus;
  applicantScope: ApplicantScope;
  howTested: string;
  limitation: string;
  active: boolean;
};

export type CheckState = "pass" | "needs_attention" | "unable_to_verify";

export type CheckResult = {
  id: string;
  label: string;
  state: CheckState;
  detail: string;
  sourceUrl?: string;
};
