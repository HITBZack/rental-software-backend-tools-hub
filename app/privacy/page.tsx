import type { Metadata } from "next"

import { getSiteName } from "@/lib/site"
import PrivacyPolicyClientPage from "./privacy-client"

export const metadata: Metadata = {
  title: `Privacy Policy | ${getSiteName()}`,
  description: "Privacy policy for Booqable Helper Platform.",
  alternates: {
    canonical: "/privacy",
  },
}

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClientPage />
}
