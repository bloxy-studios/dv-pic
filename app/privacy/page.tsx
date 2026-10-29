import type { Metadata } from "next";
import { product } from "@/lib/product";

export const metadata: Metadata = { title: "Privacy", description: "How DV Ready handles photographs. Photos are processed in the browser." };

export default function PrivacyPage() {
  return (
    <article className="grid max-w-3xl gap-4 text-sm leading-6">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy</h1>
      <p>{product.name} processes photographs on your device. The photo checker, cropper, lighting preview, face check, and JPEG export do not upload the image to a DV Ready server or to an image-processing API.</p>
      <p>The optional face check downloads a face-landmark model from this same website after you ask for it. The model is a general detector. Your photograph is not sent with that download, and the app does not build a face template, embedding, or identity match.</p>
      <p>Original file bytes stay in memory for the browser tab session so you can reset or compare them. Closing the tab or choosing “Clear all photos” drops those objects. Browsers do not promise that freed memory is wiped.</p>
      <p>GPS coordinates are not copied into an export unless you turn that option on. The screen says only whether location data is present. Coordinates are not put in the page address, and this app has no analytics script.</p>
      <p>The checklist can be saved in local storage on this device if you press the save button. That save stores which boxes are checked. It does not store the photograph. You can clear it on the checklist page.</p>
      <p>There is no account. There is no payment. There is no advertising in the editor.</p>
    </article>
  );
}
