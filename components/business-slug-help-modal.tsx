"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { HelpCircleIcon } from "@/components/icons"
import Image from "next/image"

export function BusinessSlugHelpModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors duration-200 hover:bg-pastel-lavender/30 active:bg-pastel-lavender/50 px-3 py-1.5 rounded-lg active:scale-[0.98]">
          <HelpCircleIcon className="h-4 w-4" />
          <span>Need help finding it?</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Find your Booqable business slug</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <ol className="list-decimal list-inside space-y-2">
            <li>Open your Booqable dashboard in your browser.</li>
            <li>Copy the full URL from the address bar (e.g. https://your-company.booqable.com/).</li>
            <li>Paste it into the business slug field — we’ll pull out the slug for you.</li>
          </ol>
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <Image
              src="/images/booqable1.jpg"
              alt="Booqable dashboard URL example"
              width={1000}
              height={600}
              className="w-full h-auto rounded-md object-contain"
            />
            <div className="text-sm leading-snug text-muted-foreground">
              Example: if your URL is <span className="font-mono text-foreground">https://boundless-events-rentals-ltd.booqable.com</span>,
              your slug is <span className="font-mono text-foreground">boundless-events-rentals-ltd</span>.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
