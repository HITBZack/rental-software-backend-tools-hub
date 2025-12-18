import type { MetadataRoute } from "next"

import { getSiteUrl } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/tools"],
        disallow: ["/dashboard"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
