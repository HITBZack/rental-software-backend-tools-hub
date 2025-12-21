"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { HelpCircleIcon } from "@/components/icons"
import Image from "next/image"

export function BusinessSlugHelpModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
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
          <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center gap-3">
            <Image
              src="/images/booqable1.jpg"
              alt="Booqable dashboard URL example"
              width={72}
              height={72}
              className="rounded-md object-cover"
            />
            <div className="text-xs leading-snug text-muted-foreground">
              Example: if your URL is <span className="font-mono text-foreground">https://timeless-events-party-rentals-ltd.booqable.com</span>,
              your slug is <span className="font-mono text-foreground">timeless-events-party-rentals-ltd</span>.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
