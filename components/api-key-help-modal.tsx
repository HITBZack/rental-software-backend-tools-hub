"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { HelpCircleIcon } from "@/components/icons"
import Image from "next/image"

const steps = [
  {
    number: 1,
    title: "Open User Settings",
    description:
      "Click on your profile name in the bottom left corner of Booqable, then select 'User settings' from the dropdown menu.",
    image: "/images/booqable1.jpg",
  },
  {
    number: 2,
    title: "Add Authentication Method",
    description:
      "Scroll down to find the 'Add your first authentication method' section and click the 'New authentication method' button.",
    image: "/images/booqable2.png",
  },
  {
    number: 3,
    title: "Create a Token",
    description: "Give your token a name (like 'Helper Tools'), select 'Token' as the type, and click 'Save'.",
    image: "/images/booqable3.png",
  },
  {
    number: 4,
    title: "Copy Your API Key",
    description: "Your new API key will appear. Click the copy button to copy it, then paste it here.",
    image: "/images/booqable4.png",
  },
]

export function ApiKeyHelpModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors duration-200 hover:bg-pastel-lavender/30 active:bg-pastel-lavender/50 px-3 py-1.5 rounded-lg active:scale-[0.98]">
          <HelpCircleIcon className="h-4 w-4" />
          Need help finding your API key?
        </button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">How to Find Your Booqable API Key</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
          {steps.map((step) => (
            <div key={step.number} className="space-y-2 sm:space-y-3">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0 h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-semibold">
                  {step.number}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
              <div className="ml-8 sm:ml-10 rounded-lg border border-border overflow-hidden bg-muted/30">
                <Image
                  src={step.image || "/placeholder.svg"}
                  alt={`Step ${step.number}: ${step.title}`}
                  width={500}
                  height={300}
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
