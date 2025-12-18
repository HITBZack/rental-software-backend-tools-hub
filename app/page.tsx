import type { Metadata } from "next"

import Link from "next/link"

import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { WaveMarquee } from "@/components/wave-marquee"
import { getSiteName } from "@/lib/site"
import { toolsCatalog } from "@/lib/tools-catalog"
import HomeClient from "./home-client"

export const metadata: Metadata = {
  title: `Booqable Tools & Extensions | ${getSiteName()}`,
  description:
    "Booqable tools and extensions to help rental businesses improve marketing insights, site search, and operations.",
  alternates: {
    canonical: "/",
  },
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 pt-10">
        <HomeClient />
      </div>

      <WaveMarquee
        text="Secure Local Storage Only No Server Storage Your Data Stays Private"
        variant="lavender"
        speed={45}
      />

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex flex-col gap-4">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Booqable Tools & Extensions for Rental Businesses</h2>
          <p className="text-muted-foreground text-lg max-w-3xl">
            A set of Booqable tools and extensions to help you track referral sources, improve site search, and keep
            day-to-day rental operations running smoothly.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {toolsCatalog.map((tool) => (
            <div key={tool.slug} className="rounded-xl border border-border bg-card p-6 h-full flex flex-col">
              <h3 className="text-xl font-semibold text-card-foreground">
                <Link href={`/tools/${tool.slug}`} className="hover:underline">
                  {tool.name}
                </Link>
              </h3>
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
      </div>

      <Footer />
    </main>
  )
}
