"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { ArrowLeftIcon } from "@/components/icons"

export default function TermsOfServiceClientPage() {
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
              alt="Backend Rental Tools Hub"
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
        </div>

        <div className="prose prose-slate max-w-none">
          <p className="text-muted-foreground mb-6">Last updated: December 9, 2025</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using the Backend Rental Tools Hub, you accept and agree to be bound by these Terms of
              Service. If you do not agree to these terms, please do not use our platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Backend Rental Tools Hub provides tools and utilities to help rental businesses analyze and enhance their
              Booqable experience. Our services include referral insights, product search generation, WordPress plugin
              support, and other productivity tools.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">API Key Usage</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You are responsible for maintaining the confidentiality of your Booqable API key. You agree to use your
              API key only for legitimate purposes in accordance with Booqable's terms of service.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We are not responsible for any unauthorized access to your Booqable account resulting from compromised API
              keys. If you believe your API key has been compromised, please regenerate it immediately in your Booqable
              account settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>Not Affiliated with Booqable:</strong> Backend Rental Tools Hub is an independent project and is
              not affiliated with, endorsed by, or officially connected to Booqable BV. Booqable is a trademark of
              Booqable BV.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong>As-Is Service:</strong> The platform is provided "as is" without warranties of any kind. We do not
              guarantee that the service will be uninterrupted, secure, or error-free.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              In no event shall Backend Rental Tools Hub, halfinthebox, or its creators be liable for any indirect,
              incidental, special, consequential, or punitive damages resulting from your use of or inability to use the
              service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms at any time. Continued use of the platform after changes
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at{" "}
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
