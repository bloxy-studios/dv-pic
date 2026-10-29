import type { Metadata } from "next";
import { PhotoWorkspace } from "@/components/photo/workspace";

export const metadata: Metadata = { title: "Crop photo", description: "Crop a Diversity Visa photo to 600 by 600 pixels without uploading it." };

export default function PhotoCropperPage() {
  return <PhotoWorkspace view="crop" />;
}
