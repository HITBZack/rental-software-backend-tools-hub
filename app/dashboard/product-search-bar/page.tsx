"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { WaveMarquee } from "@/components/wave-marquee"
import {
  MagnifyingGlassIcon,
  DownloadIcon,
  RefreshIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  FileJsonIcon,
  TagIcon,
  FilterIcon,
  CloudUploadIcon,
  ShieldIcon,
} from "@/components/icons"
import { getSettings } from "@/lib/storage"

interface Product {
  name: string
  id: string
  url: string
  image: string | null
  tags: string[]
  description: string | null
}

interface ProductWithTags extends Product {
  searchTags: string[]
}

// Default stopwords for tag generation
const DEFAULT_STOPWORDS = `the, a, an, is, this, that, by, with, only, ft, item, items, setup, setups, diameter, width, height, length, size, sizes, color, colors, style, styles, type, types, model, models, brand, brands, make, br, p, x, and, or, of, on, in, for, to, as, l, m, s, xl, xxl, xxxl, xxs, xs, i, it, if, perfect, new, used, like, more, less, than, about, all, some, any, every, such, no, not, per, we, you, up, dimensions, dimension, delivery, deliveries, rentals, rental, rents, rent, available, service, services, pickup, product, products, w, but, has, have, had, having, hold, holds, use, uses, using, make, makes, making, do, does, doing, did, done, go, nbsp, included, includes, including, include, really, people, person, thing, things, like, likes, etc, be, tool, tools`

type Step = "intro" | "fetching" | "tagging" | "complete"

export default function ProductSearchBarPage() {
  const [step, setStep] = useState<Step>("intro")
  const [products, setProducts] = useState<Product[]>([])
  const [productsWithTags, setProductsWithTags] = useState<ProductWithTags[]>([])
  const [fetchProgress, setFetchProgress] = useState(0)
  const [fetchedCount, setFetchedCount] = useState(0)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [tagProgress, setTagProgress] = useState(0)
  const [stopwords, setStopwords] = useState(DEFAULT_STOPWORDS)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)

  // Pluralize helper
  const pluralize = (word: string): string => {
    if (word.length <= 2) return word
    if (word.endsWith("y") && !"aeiou".includes(word[word.length - 2])) {
      return word.slice(0, -1) + "ies"
    } else if (word.endsWith("s")) {
      return word + "es"
    }
    return word + "s"
  }

  // Generate tags for a product
  const generateTags = useCallback(
    (name: string, description: string | null): string[] => {
      const stopwordSet = new Set(
        stopwords
          .toLowerCase()
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      )

      const tags = new Set<string>()

      // Strip HTML tags from description
      const cleanDesc = (description || "").replace(/<[^>]+>/g, " ")
      const text = `${name} ${cleanDesc}`.toLowerCase()

      // Tokenize into words
      const words = text.match(/[a-zA-Z]+/g) || []
      for (const w of words) {
        if (stopwordSet.has(w)) continue
        tags.add(w)
        const plural = pluralize(w)
        if (plural !== w) tags.add(plural)
      }

      // Handle compact number tags like "#2"
      const compactMatches = text.match(/#\s*\d+/g) || []
      for (const match of compactMatches) {
        const compact = match.replace(" ", "")
        tags.add(match.trim())
        tags.add(compact)
      }

      return Array.from(tags).sort()
    },
    [stopwords],
  )

  // Fetch all products
  const fetchProducts = async () => {
    setError(null)
    setStep("fetching")
    setFetchProgress(0)
    setFetchedCount(0)
    setTotalCount(null)
    setProducts([])

    const settings = getSettings()
    const apiKey = settings.apiKey

    if (!apiKey) {
      setError("No API key configured. Please complete onboarding first.")
      setStep("intro")
      return
    }

    const allProducts: Product[] = []
    let page = 1
    const pageSize = 100
    let hasMore = true

    try {
      while (hasMore) {
        setCurrentPage(page)

        const response = await fetch(`https://api.booqable.com/1/products?page=${page}&per=${pageSize}`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()
        const items = data.data || []

        if (data.meta?.total && !totalCount) {
          setTotalCount(data.meta.total)
        }

        for (const p of items) {
          const name = (p.name || "").toLowerCase()
          // Skip delivery/pickup items
          if (name.includes("delivery") || name.includes("pick up")) continue

          allProducts.push({
            name: p.name,
            id: p.id,
            url: `https://${settings.companySlug || "your-company"}.booqable.com/rentals/${p.slug || p.id}`,
            image: p.photo_url || null,
            tags: p.tag_list || [],
            description: p.description || null,
          })
        }

        setProducts([...allProducts])
        setFetchedCount(allProducts.length)
        setFetchProgress(totalCount ? Math.round((allProducts.length / totalCount) * 100) : (page * 10) % 100)

        if (items.length < pageSize) {
          hasMore = false
        } else {
          page++
          // Rate limiting delay
          await new Promise((r) => setTimeout(r, 500))
        }
      }

      setFetchProgress(100)
      // Auto-proceed to tagging
      setTimeout(() => generateTagsForProducts(allProducts), 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch products")
      setStep("intro")
    }
  }

  // Generate tags for all products
  const generateTagsForProducts = async (prods: Product[]) => {
    setStep("tagging")
    setTagProgress(0)

    const tagged: ProductWithTags[] = []

    for (let i = 0; i < prods.length; i++) {
      const p = prods[i]
      const searchTags = generateTags(p.name, p.description)
      tagged.push({
        ...p,
        searchTags: [...new Set([...p.tags, ...searchTags])],
      })

      setTagProgress(Math.round(((i + 1) / prods.length) * 100))

      // Yield to UI every 50 items
      if (i % 50 === 0) {
        await new Promise((r) => setTimeout(r, 0))
      }
    }

    setProductsWithTags(tagged)
    setStep("complete")
  }

  // Download JSON file
  const downloadJson = () => {
    const json = JSON.stringify(productsWithTags, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "products_with_tags.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Reset to start
  const resetProcess = () => {
    setStep("intro")
    setProducts([])
    setProductsWithTags([])
    setFetchProgress(0)
    setTagProgress(0)
    setError(null)
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-card px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-pastel-mint flex items-center justify-center">
            <MagnifyingGlassIcon className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Product Search Bar Generator</h1>
            <p className="text-muted-foreground">
              Create a custom fuzzy search bar with inventory-wide search for your website
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Security Notice */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-pastel-mint/30 border border-pastel-mint/50">
            <ShieldIcon className="h-5 w-5 text-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Your data is safe</p>
              <p className="text-sm text-muted-foreground">
                We only read your product data to generate search tags. Nothing is written to your Booqable account or
                sent to any external servers. Everything happens in your browser.
              </p>
            </div>
          </div>

          {/* Intro Step */}
          {step === "intro" && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MagnifyingGlassIcon className="h-5 w-5" />
                    What is the Product Search Bar?
                  </CardTitle>
                  <CardDescription>
                    Booqable's default search only searches visible products on the current page. Our custom search bar
                    provides inventory-wide fuzzy searching across all your products, with intelligent tag matching.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-pastel-lavender/20 border border-pastel-lavender/30">
                      <FileJsonIcon className="h-6 w-6 text-foreground mb-2" />
                      <h3 className="font-medium text-sm">Generate Product Data</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        We fetch all your products and create a searchable JSON file
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-pastel-peach/20 border border-pastel-peach/30">
                      <TagIcon className="h-6 w-6 text-foreground mb-2" />
                      <h3 className="font-medium text-sm">Smart Tag Generation</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Auto-generate search tags from names and descriptions
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-pastel-mint/20 border border-pastel-mint/30">
                      <FilterIcon className="h-6 w-6 text-foreground mb-2" />
                      <h3 className="font-medium text-sm">Fuzzy Matching</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Find products even with typos or partial matches
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FilterIcon className="h-5 w-5" />
                    Customize Stopwords
                  </CardTitle>
                  <CardDescription>
                    Stopwords are common words that are excluded from search tags. You can customize this list to
                    include/exclude words specific to your business.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="stopwords">Stopwords (comma-separated)</Label>
                    <Textarea
                      id="stopwords"
                      value={stopwords}
                      onChange={(e) => setStopwords(e.target.value)}
                      className="mt-2 h-32 font-mono text-xs"
                      placeholder="Enter comma-separated words to exclude from tags..."
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      These words will be excluded from generated search tags. Add words that are too common or not
                      useful for searching your products.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStopwords(DEFAULT_STOPWORDS)}
                    className="text-xs"
                  >
                    Reset to Defaults
                  </Button>
                </CardContent>
              </Card>

              {error && (
                <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
                  <AlertCircleIcon className="h-5 w-5 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <Button onClick={fetchProducts} className="w-full h-12 text-base">
                <RefreshIcon className="h-5 w-5 mr-2" />
                Generate Product Search Data
              </Button>
            </div>
          )}

          {/* Fetching Step */}
          {step === "fetching" && (
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshIcon className="h-5 w-5 animate-spin" />
                  Fetching Your Products
                </CardTitle>
                <CardDescription>
                  Reading product data from your Booqable account. This may take a moment for large inventories.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {fetchedCount} {totalCount ? `/ ${totalCount}` : ""} products
                    </span>
                  </div>
                  <Progress value={fetchProgress} className="h-3" />
                  <p className="text-xs text-muted-foreground text-center">
                    Fetching page {currentPage}... (Read-only, no changes are made)
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-pastel-lavender/20 border border-pastel-lavender/30">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldIcon className="h-4 w-4 text-foreground" />
                    <span className="text-sm font-medium">Safe & Secure</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We are only reading your product data. No data is being written or modified in your Booqable
                    account.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tagging Step */}
          {step === "tagging" && (
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TagIcon className="h-5 w-5" />
                  Generating Search Tags
                </CardTitle>
                <CardDescription>
                  Creating intelligent search tags for each product based on names and descriptions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tag Generation Progress</span>
                    <span className="font-medium">{tagProgress}%</span>
                  </div>
                  <Progress value={tagProgress} className="h-3" />
                  <p className="text-xs text-muted-foreground text-center">Processing {products.length} products...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Complete Step */}
          {step === "complete" && (
            <div className="space-y-6 animate-fade-in">
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <CheckCircleIcon className="h-5 w-5" />
                    Generation Complete!
                  </CardTitle>
                  <CardDescription className="text-green-600">
                    Successfully processed {productsWithTags.length} products with search tags.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-white border">
                      <p className="text-2xl font-bold text-foreground">{productsWithTags.length}</p>
                      <p className="text-sm text-muted-foreground">Products processed</p>
                    </div>
                    <div className="p-4 rounded-lg bg-white border">
                      <p className="text-2xl font-bold text-foreground">
                        {productsWithTags.reduce((acc, p) => acc + p.searchTags.length, 0).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">Total search tags</p>
                    </div>
                  </div>

                  <Button onClick={downloadJson} className="w-full h-12">
                    <DownloadIcon className="h-5 w-5 mr-2" />
                    Download products_with_tags.json
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CloudUploadIcon className="h-5 w-5" />
                    Installation Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="list-decimal list-inside space-y-3 text-sm">
                    <li className="text-muted-foreground">
                      <span className="text-foreground font-medium">Download the JSON file</span> using the button above
                    </li>
                    <li className="text-muted-foreground">
                      <span className="text-foreground font-medium">Upload to your website's root folder</span> (e.g.,
                      yoursite.com/products_with_tags.json)
                    </li>
                    <li className="text-muted-foreground">
                      <span className="text-foreground font-medium">Add the search bar widget</span> to your site using
                      our WordPress plugin or custom code
                    </li>
                    <li className="text-muted-foreground">
                      <span className="text-foreground font-medium">Re-generate</span> this file whenever you add new
                      products to keep search up to date
                    </li>
                  </ol>

                  <div className="p-4 rounded-lg bg-pastel-peach/20 border border-pastel-peach/30 mt-4">
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Tip:</strong> The search bar widget will automatically fetch
                      this JSON file and provide instant fuzzy search across all your products.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button variant="outline" onClick={resetProcess} className="flex-1 bg-transparent">
                  <RefreshIcon className="h-4 w-4 mr-2" />
                  Start Over
                </Button>
                <Button variant="outline" onClick={() => generateTagsForProducts(products)} className="flex-1">
                  <TagIcon className="h-4 w-4 mr-2" />
                  Regenerate Tags
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <WaveMarquee
        text="Custom Search Bar ▣ Fuzzy Matching ▣ Inventory-Wide Search ▣ Fast & Lightweight"
        variant="mint"
        speed={30}
      />
    </div>
  )
}
