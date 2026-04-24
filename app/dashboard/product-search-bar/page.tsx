"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import Link from "next/link"
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
import { getSettings, saveSettings } from "@/lib/storage"
import { parseCsv, mapCsvToProducts } from "@/lib/csv-products"

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
const DEFAULT_STOPWORDS = `the, a, an, is, this, that, by, with, only, ft, item, items, setup, setups, diameter, width, height, length, size, sizes, color, colors, style, styles, type, types, model, models, brand, brands, make, br, p, x, and, or, of, on, in, for, to, as, l, m, s, xl, xxl, xxxl, xxs, xs, i, it, if, perfect, new, used, like, more, less, than, about, all, some, any, every, such, no, not, per, pers, we, you, up, dimensions, dimension, dimensionses, delivery, deliveries, rentals, rental, rents, rent, available, availables, availablity, availablities, service, services, pickup, pickups, pick-up, setups, setup, setupes, setuping, product, products, w, butt, but, butts, item, items, itemes, iteming, itemses, itemsing, has, have, had, having, say, hold, holds, holding, holded, holdes, holdings, use, uses, using, used, useing, usees, usings, make, makes, making, mades, mading, madeing, madees, madeses, do, does, doing, did, done, doeses, doings, doed, doesing, go, nbsp, nbsps, included, includes, including, include, includedes, includings, includeds, organically, organicallies, organic, organics, organicses, organicing, organices, organicinges, and/or, andor, andors, andorses, andoring, andored, andores, or/and, orand, orands, orandses, oranding, oranded, orandes, really, realies, reals, realses, realing, realed, reales, reallies, people, peoples, person, persons, peopleing, peoplees, peopleinges, personing, persones, personinges, personings, personingses, personinges, thing, things, thinges, thinging, thingesing, thingesed, thingeses, likes, liking, liked, likeses, likings, likingses, etc, etcs, etcetera, etceteras, timeless, events, timelesses, ltd, oz, ozs, ozes, ozing, ozed, ozesing, be, tool, tools`

type Step = "intro" | "parsing" | "tagging" | "complete"

export default function ProductSearchBarPage() {
  const [step, setStep] = useState<Step>("intro")
  const [products, setProducts] = useState<Product[]>([])
  const [productsWithTags, setProductsWithTags] = useState<ProductWithTags[]>([])
  const [tagProgress, setTagProgress] = useState(0)
  const [stopwords, setStopwords] = useState(DEFAULT_STOPWORDS)
  const [error, setError] = useState<string | null>(null)
  const [csvFileName, setCsvFileName] = useState<string | null>(null)
  const [skippedShipping, setSkippedShipping] = useState(0)
  const [skippedInvalid, setSkippedInvalid] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const settings = getSettings()
    if (settings.customStopwords) {
      setStopwords(settings.customStopwords)
    }
  }, [])

  const handleStopwordsChange = (value: string) => {
    setStopwords(value)
    saveSettings({ customStopwords: value })
  }

  const handleResetStopwords = () => {
    setStopwords(DEFAULT_STOPWORDS)
    saveSettings({ customStopwords: null })
  }

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

  // Parse a selected CSV file and map it to Product[]
  const ingestCsvFile = async (file: File) => {
    setError(null)
    setStep("parsing")
    setCsvFileName(file.name)
    setProducts([])
    setProductsWithTags([])
    setSkippedShipping(0)
    setSkippedInvalid(0)

    try {
      const text = await file.text()
      const parsed = parseCsv(text)

      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setError("That CSV is empty or could not be parsed. Please check the file and try again.")
        setStep("intro")
        return
      }

      const { businessSlug } = getSettings()
      const { products: mapped, skipped, missingColumns } = mapCsvToProducts(parsed, {
        businessSlug,
        includeCollectionsAsTags: true,
        excludeShippingNames: true,
      })

      if (missingColumns.length > 0) {
        setError(
          `CSV is missing required column(s): ${missingColumns.join(", ")}. ` +
            "Export your products from Booqable and try again.",
        )
        setStep("intro")
        return
      }

      if (mapped.length === 0) {
        setError("No valid products were found in that CSV.")
        setStep("intro")
        return
      }

      setProducts(mapped)
      setSkippedShipping(skipped.shipping)
      setSkippedInvalid(skipped.missingIdOrName)
      setTimeout(() => generateTagsForProducts(mapped), 250)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read CSV file")
      setStep("intro")
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void ingestCsvFile(file)
    // Reset so selecting the same file again re-triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const name = file.name.toLowerCase()
    if (!name.endsWith(".csv")) {
      setError("Please drop a .csv file exported from Booqable.")
      return
    }
    void ingestCsvFile(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
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
    setTagProgress(0)
    setError(null)
    setCsvFileName(null)
    setSkippedShipping(0)
    setSkippedInvalid(0)
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
                  <div className="rounded-xl border bg-muted/40 p-3">
                    <video
                      className="w-full rounded-lg border shadow-sm"
                      src="/videos/FuzzySearch_ShowcaseVideo.mp4"
                      autoPlay
                      muted
                      loop
                      controls
                      preload="metadata"
                      playsInline
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
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
                    include/exclude words specific to your business. Your changes are saved automatically.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="stopwords">Stopwords (comma-separated)</Label>
                    <Textarea
                      id="stopwords"
                      value={stopwords}
                      onChange={(e) => handleStopwordsChange(e.target.value)}
                      className="mt-2 h-32 font-mono text-xs"
                      placeholder="Enter comma-separated words to exclude from tags..."
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      These words will be excluded from generated search tags. Add words that are too common or not
                      useful for searching your products. Your stopwords are saved automatically.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleResetStopwords} className="text-xs bg-transparent">
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CloudUploadIcon className="h-5 w-5" />
                    Upload Products CSV
                  </CardTitle>
                  <CardDescription>
                    Export your products from Booqable (Products &rarr; Export) and drop the CSV here. No API calls are
                    made &mdash; everything is processed locally in your browser.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        fileInputRef.current?.click()
                      }
                    }}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
                      isDragging
                        ? "border-pastel-mint bg-pastel-mint/20"
                        : "border-border bg-muted/30 hover:bg-muted/50"
                    }`}
                  >
                    <CloudUploadIcon className="h-8 w-8 text-foreground" />
                    <p className="text-sm font-medium">
                      {isDragging ? "Drop CSV to start" : "Click to choose a CSV, or drag & drop it here"}
                    </p>
                    <p className="text-xs text-muted-foreground text-center max-w-md">
                      Expected columns include <code className="font-mono">id</code>,{" "}
                      <code className="font-mono">name</code>, <code className="font-mono">description</code>,{" "}
                      <code className="font-mono">tags</code>, <code className="font-mono">collections</code>,{" "}
                      <code className="font-mono">photo_1_url_main</code>. Example files live in{" "}
                      <code className="font-mono">product-exports/</code>.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Parsing Step */}
          {step === "parsing" && (
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshIcon className="h-5 w-5 animate-spin" />
                  Parsing {csvFileName ?? "CSV"}
                </CardTitle>
                <CardDescription>
                  Reading your CSV locally and mapping it to the product search format. Nothing is uploaded anywhere.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Progress value={null as unknown as number} className="h-3" />
                <div className="p-4 rounded-lg bg-pastel-lavender/20 border border-pastel-lavender/30">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldIcon className="h-4 w-4 text-foreground" />
                    <span className="text-sm font-medium">Local-only processing</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your CSV stays on this device. No requests are made to Booqable or any external server.
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

                  {(skippedShipping > 0 || skippedInvalid > 0 || csvFileName) && (
                    <div className="p-3 rounded-lg bg-white border text-xs text-muted-foreground space-y-1">
                      {csvFileName && (
                        <div>
                          Source file: <code className="font-mono text-foreground">{csvFileName}</code>
                        </div>
                      )}
                      {skippedShipping > 0 && (
                        <div>
                          Skipped {skippedShipping} shipping/pickup rows
                        </div>
                      )}
                      {skippedInvalid > 0 && (
                        <div>
                          Skipped {skippedInvalid} rows missing an id or name
                        </div>
                      )}
                    </div>
                  )}

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
                      our WordPress plugin or <Link href="/help/product-search-bar/manual-setup" className="text-pastel-mint hover:text-pastel-mint/80 underline">custom code</Link>
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
