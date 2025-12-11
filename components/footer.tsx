import { HeartIcon } from "@/components/icons"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="w-full bg-card border-t border-border py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* About */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">About</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Booqable Helper is a suite of tools designed to help rental businesses get more insights from their
              Booqable data.
            </p>
          </div>

          {/* Links - updated to use Link components with proper routes */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="mailto:contact@halfinthebox.com"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Contact Us
                </a>
              </li>
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Get in Touch</h3>
            <p className="text-sm text-muted-foreground">
              Email:{" "}
              <a href="mailto:contact@halfinthebox.com" className="text-primary hover:underline">
                contact@halfinthebox.com
              </a>
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>Made with</span>
            <HeartIcon className="h-4 w-4 text-accent" />
            <span>
              by{" "}
              <a
                href="https://halfinthebox.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:text-primary transition-colors"
              >
                halfinthebox
              </a>
            </span>
          </div>

          <p className="text-xs text-muted-foreground text-center md:text-right">
            Not affiliated with or endorsed by Booqable.
          </p>
        </div>
      </div>
    </footer>
  )
}
