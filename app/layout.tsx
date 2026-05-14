import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSiteConfig } from "@/lib/site-config";

const display = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const sans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SlabVaultFi — Community-owned collectible vault",
    template: "%s — SlabVaultFi",
  },
  description:
    "Live gacha pulls, graded Pokémon slabs, and a transparent multisig vault. $SVF coordinates treasury growth you can track on-chain.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "SlabVaultFi",
    title: "SlabVaultFi — Community-owned collectible vault",
    description:
      "Live gacha pulls, graded Pokémon slabs, and a transparent multisig vault.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@SlabVaultFi",
    site: "@SlabVaultFi",
    title: "SlabVaultFi — Community-owned collectible vault",
    description:
      "Live gacha pulls, graded Pokémon slabs, and a transparent multisig vault.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const site = getSiteConfig();

  return (
    <html
      lang="en"
      className={`dark ${display.variable} ${sans.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full bg-background text-foreground font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-vault-amber focus:px-3 focus:py-2 focus:text-vault-void focus:outline-none focus:ring-2 focus:ring-vault-amber/80 focus:ring-offset-2 focus:ring-offset-background"
        >
          Skip to content
        </a>
        <div className="flex min-h-full flex-col">
          <SiteHeader brandName={site.brandName} ticker={site.ticker} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter site={site} />
        </div>
      </body>
    </html>
  );
}
