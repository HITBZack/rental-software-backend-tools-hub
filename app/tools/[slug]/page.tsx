import type { Metadata } from "next"

import Link from "next/link"
import { notFound } from "next/navigation"

import { Button } from "@/components/ui/button"
import { getSiteName, getSiteUrl } from "@/lib/site"
import { getToolBySlug, toolsCatalog } from "@/lib/tools-catalog"

export function generateStaticParams() {
  return toolsCatalog.map((tool) => ({ slug: tool.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const tool = getToolBySlug(params.slug)
  if (!tool) return {}

  const title = `${tool.name} | Tools for Booqable Users (Unofficial) | ${getSiteName()}`

  return {
    title,
    description: tool.description,
    alternates: {
      canonical: `/tools/${tool.slug}`,
    },
    keywords: tool.keywords,
    openGraph: {
      title,
      description: tool.description,
      type: "article",
      url: `/tools/${tool.slug}`,
      images: [{ url: "/icon.png" }],
    },
    twitter: {
      card: "summary",
      title,
      description: tool.description,
      images: ["/icon.png"],
    },
  }
}

export default function ToolLandingPage({ params }: { params: { slug: string } }) {
  const tool = getToolBySlug(params.slug)
  if (!tool) notFound()

  const openHref = tool.externalUrl ?? tool.dashboardPath
  const isExternal = Boolean(tool.externalUrl)

  const siteUrl = getSiteUrl()

  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: tool.description,
    url: `${siteUrl}/tools/${tool.slug}`,
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  }

  return (
    <main className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <div className="max-w-4xl mx-auto px-6 py-14">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            <Link href="/tools" className="hover:underline">
              Tools for Booqable Users (Unofficial)
            </Link>
            <span className="mx-2">/</span>
            <span>{tool.name}</span>
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-foreground">{tool.name}</h1>
          <p className="text-muted-foreground text-lg">{tool.tagline}</p>

          <div className="mt-2 flex flex-wrap gap-3">
            <Button asChild>
              {isExternal ? (
                <a href={openHref} target="_blank" rel="noopener noreferrer">
                  Open tool
                </a>
              ) : (
                <Link href={openHref}>Open tool</Link>
              )}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">View dashboard</Link>
            </Button>
          </div>

          <div className="mt-8 rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-card-foreground">How this helps Booqable users</h2>
            <p className="mt-2 text-muted-foreground">{tool.description}</p>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-muted/30 p-6">
            <h2 className="text-lg font-semibold text-foreground">Related keywords</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {tool.keywords.map((k) => (
                <span key={k} className="text-xs rounded-full border border-border bg-background px-3 py-1 text-muted-foreground">
                  {k}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-10">
            <Button variant="outline" asChild>
              <Link href="/tools">Back to all tools</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
