import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { BackToTop } from "@/components/back-to-top";
import { GrowthInstrumentation } from "@/components/growth-instrumentation";
import { WalletProviderRoot } from "@/components/wallet-provider-root";
import { getDexTokenStats } from "@/lib/dexscreener";
import { validateEnvVars } from "@/lib/security";
import { buildRootMetadata } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config";

const display = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const sans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

if (
  process.env.NODE_ENV === "production" &&
  process.env.VERCEL_ENV === "production"
) {
  const envCheck = validateEnvVars();
  if (!envCheck.valid) {
    throw new Error(`Invalid production environment: ${envCheck.errors.join("; ")}`);
  }
}

export const metadata: Metadata = buildRootMetadata();

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const site = getSiteConfig();
  const tokenStats = await getDexTokenStats(site.contractAddress);

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`dark ${display.variable} ${sans.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full bg-background text-foreground font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-vault-amber focus:px-3 focus:py-2 focus:text-vault-void focus:outline-none focus:ring-2 focus:ring-vault-amber/80 focus:ring-offset-2 focus:ring-offset-background"
        >
          Skip to content
        </a>
        <WalletProviderRoot>
          <AppShell site={site} svfPriceUsd={tokenStats?.priceUsd ?? null}>
            {children}
          </AppShell>
        </WalletProviderRoot>
        <BackToTop />
        <GrowthInstrumentation />
        <Script
          src="https://plugin.jup.ag/plugin-v1.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
