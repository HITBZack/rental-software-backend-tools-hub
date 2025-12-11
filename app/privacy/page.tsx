"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeftIcon } from "@/components/icons"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function PrivacyPolicyPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-8 gap-2 text-muted-foreground hover:text-foreground hover:bg-pastel-mint/30"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Go Back
        </Button>

        <div className="flex items-center gap-4 mb-8">
          <div className="h-12 w-12 rounded-xl overflow-hidden">
            <Image
              src="/icon.png"
              alt="Booqable Helper"
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
        </div>

        <div className="prose prose-slate max-w-none">
          <p className="text-muted-foreground mb-6">Last updated: December 9, 2025</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              Booqable Helper Platform ("we", "our", or "us") is committed to protecting your privacy. This Privacy
              Policy explains how we collect, use, and safeguard your information when you use our platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>API Keys:</strong> Your Booqable API key is stored locally in your browser's localStorage. We
              never transmit, store, or have access to your API key on our servers. All API calls to Booqable are made
              directly from your browser.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>Usage Data:</strong> We may collect anonymous usage analytics to improve our services, such as
              which features are most used and general usage patterns.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Settings:</strong> Your preferences and settings are stored locally in your browser and are not
              transmitted to our servers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              Since all sensitive data (including your API key) is stored locally in your browser, we do not have access
              to it. Your data never leaves your device except when making direct API calls to Booqable's servers. We
              recommend clearing your browser data if you use a shared computer.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our platform connects directly to Booqable's API using your credentials. We do not share your information
              with any other third parties. Please refer to Booqable's privacy policy for information on how they handle
              your data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You can delete all locally stored data at any time by clearing your browser's localStorage or using the
              "Reset All Data" option in the Settings page. Since we don't store your data on our servers, there is no
              server-side data to request or delete.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at{" "}
              <a
                href="mailto:contact@halfinthebox.com"
                className="text-foreground font-medium hover:text-pastel-mint transition-colors"
              >
                contact@halfinthebox.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
