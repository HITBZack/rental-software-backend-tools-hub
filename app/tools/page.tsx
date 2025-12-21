import type { Metadata } from "next"

import Link from "next/link"

import { getSiteName, getSiteUrl } from "@/lib/site"
import { toolsCatalog } from "@/lib/tools-catalog"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: `Tools for Booqable Users (Unofficial) | ${getSiteName()}`,
  description:
    "Explore unofficial tools for Booqable users: improve marketing insights, product search, and operational workflows.",
  alternates: {
    canonical: "/tools",
  },
  keywords: [
    "booqable tools",
    "booqable extensions",
    "rental tools hub",
    "booqable analytics",
    "booqable product search",
    "booqable wordpress plugin",
    "unofficial booqable tools",
  ],
}

export default function ToolsIndexPage() {
  const siteUrl = getSiteUrl()

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Tools for Booqable Users (Unofficial)",
    itemListElement: toolsCatalog.map((tool, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: tool.name,
      url: `${siteUrl}/tools/${tool.slug}`,
    })),
  }

  return (
    <main className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <div className="max-w-5xl mx-auto px-6 py-14">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Tools for Booqable Users (Unofficial)</h1>
          <p className="text-muted-foreground text-lg max-w-3xl">
            Practical tools built for Booqable rental businesses. Use these utilities to improve marketing attribution,
            enhance your site search experience, and streamline day-to-day operations.
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/">Open the App</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {toolsCatalog.map((tool) => (
            <div key={tool.slug} className="rounded-xl border border-border bg-card p-6 h-full flex flex-col">
              <h2 className="text-xl font-semibold text-card-foreground">
                <Link href={`/tools/${tool.slug}`} className="hover:underline">
                  {tool.name}
                </Link>
              </h2>
              <p className="mt-2 text-muted-foreground">{tool.tagline}</p>
              <p className="mt-3 text-sm text-muted-foreground">{tool.description}</p>
              <div className="mt-auto pt-5 flex gap-3 justify-start">
                <Button asChild>
                  <Link href={`/tools/${tool.slug}`}>Learn more</Link>
                </Button>
                <Button variant="outline" asChild>
                  {tool.externalUrl ? (
                    <a href={tool.externalUrl} target="_blank" rel="noopener noreferrer">
                      Open tool
                    </a>
                  ) : (
                    <Link href={tool.dashboardPath}>Open tool</Link>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-xl border border-border bg-muted/30 p-6">
          <h2 className="text-lg font-semibold text-foreground">What is Backend Rental Tools Hub?</h2>
          <p className="mt-2 text-muted-foreground">
            Backend Rental Tools Hub is an independent suite of browser-based utilities for Booqable users. Your API key
            stays in your browser, and these tools focus on insights and productivity for rental operations. Not
            affiliated with or endorsed by Booqable.
          </p>
        </div>
      </div>
    </main>
  )
}
