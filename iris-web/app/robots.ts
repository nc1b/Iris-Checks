import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Lets search engines crawl the public site, but not the account pages or the API. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/sso-callback"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
