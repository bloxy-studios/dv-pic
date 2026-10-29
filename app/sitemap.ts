import type { MetadataRoute } from "next";

const routes = [
  "",
  "/photo-checker",
  "/photo-cropper",
  "/photo-requirements",
  "/photo-checklist",
  "/family-photos",
  "/dv-2027-guide",
  "/official-resources",
  "/privacy",
  "/about",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return routes.map((route) => ({ url: `${base}${route || "/"}`, changeFrequency: "weekly" }));
}
