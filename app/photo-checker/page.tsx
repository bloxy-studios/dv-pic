import type { Metadata } from "next";
import { PhotoWorkspace } from "@/components/photo/workspace";

export const metadata: Metadata = { title: "Photo checker", description: "Check a Diversity Visa photo privately in your browser." };

export default function PhotoCheckerPage() {
  return <PhotoWorkspace view="check" />;
}
