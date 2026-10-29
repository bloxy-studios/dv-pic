import type { CheckResult } from "@/lib/rules/types";

export type Tip = { title: string; body: string };

export function tipsFor(results: CheckResult[]): Tip[] {
  const tips: Tip[] = [];
  const byId = new Map(results.map((result) => [result.id, result]));
  const attention = (id: string) => byId.get(id)?.state === "needs_attention";

  if (attention("file-size")) {
    tips.push({
      title: "File is too large",
      body: "DV Ready can compress the JPEG and measure the new file. Compression cannot repair a noisy or huge original if the result would look badly degraded.",
    });
  }
  if (attention("aspect") || attention("width") || attention("height")) {
    tips.push({
      title: "Size or shape does not match",
      body: "The cropper makes a square without stretching. If the original is smaller than 600 pixels on the short side, enlarging it will not add detail. Use a higher-quality photograph.",
    });
  }
  if (attention("head-size")) {
    tips.push({
      title: "Head size looks off",
      body: "Use the composition guides and zoom. Do not resize the head separately from the rest of the photo.",
    });
  }
  if (attention("background")) {
    tips.push({
      title: "Background may be unsuitable",
      body: "Take a new photograph against a plain white or off-white wall if the background is busy, dark, or shadowed. This tool does not replace the background.",
    });
  }
  if (attention("eyes") || attention("pose") || attention("expression")) {
    tips.push({
      title: "Pose or expression",
      body: "Take another photograph. Do not edit eyes, mouth, or facial shape.",
    });
  }
  if (attention("format") && byId.get("format")?.detail.includes("RAW")) {
    tips.push({
      title: "Camera RAW file",
      body: "Export a high-quality JPEG from your camera software, then upload that JPEG. RAW files are not sent anywhere for conversion.",
    });
  }
  return tips;
}
