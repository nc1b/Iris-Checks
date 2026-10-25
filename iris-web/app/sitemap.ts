import type { MetadataRoute } from "next";
import { CONTENT_UPDATED, PUBLIC_PAGES, SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((p) => ({
    url: `${SITE_URL}${p.path === "/" ? "" : p.path}`,
    lastModified: CONTENT_UPDATED,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
