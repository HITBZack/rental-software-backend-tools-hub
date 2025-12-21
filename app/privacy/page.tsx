import type { Metadata } from "next"

import { getSiteName } from "@/lib/site"
import PrivacyPolicyClientPage from "./privacy-client"

export const metadata: Metadata = {
  title: `Privacy Policy | ${getSiteName()}`,
  description: "Privacy policy for Backend Rental Tools Hub (unofficial tools for Booqable users).",
  alternates: {
    canonical: "/privacy",
  },
}

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClientPage />
}
