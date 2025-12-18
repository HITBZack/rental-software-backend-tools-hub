import type { Metadata } from "next"

import { getSiteName } from "@/lib/site"
import TermsOfServiceClientPage from "./terms-client"

export const metadata: Metadata = {
  title: `Terms of Service | ${getSiteName()}`,
  description: "Terms of service for Booqable Helper Platform.",
  alternates: {
    canonical: "/terms",
  },
}

export default function TermsOfServicePage() {
  return <TermsOfServiceClientPage />
}
