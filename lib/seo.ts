import type { Metadata } from "next";

import { GRAILS_BRAND, SLABVAULT_BRAND } from "@/lib/brand";

const FALLBACK_SITE_URL = "http://localhost:3000";

/** Full product name for SEO, legal copy, and social metadata. */
export const SITE_BRAND_NAME = SLABVAULT_BRAND.fullName;
/** Short display name for header, nav, and footer chrome. */
export const SITE_DISPLAY_NAME = SLABVAULT_BRAND.displayName;
export const SITE_TAGLINE = SLABVAULT_BRAND.tagline;

const ROOT_DESCRIPTION =
  "SlabVault is a Solana-native community-owned collectible vault — live pulls, graded slabs, and transparent treasury growth coordinated by $SVF. Launch GRAILS for graded-card trading across Collector Crypt, Phygitals, and Magic Eden.";

export const GRAILS_SEO = {
  name: GRAILS_BRAND.name,
  title: `${GRAILS_BRAND.name} — ${GRAILS_BRAND.tagline}`,
  description: GRAILS_BRAND.description,
  keywords: [
    GRAILS_BRAND.name,
    "Tensor for Slabs",
    "graded slab aggregator",
    "Solana graded cards",
    "Collector Crypt",
    "Phygitals",
    "Magic Eden",
    "RWA trading",
    SLABVAULT_BRAND.labsName,
  ],
  imageAlt: `${GRAILS_BRAND.name} graded slab trade desk on Solana`,
} as const;

export const DEFAULT_OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${SITE_BRAND_NAME} — community collectible vault on Solana`,
};

const defaultKeywords = [
  SITE_BRAND_NAME,
  SITE_DISPLAY_NAME,
  "community vault",
  "graded slabs",
  "Solana",
  "SVF",
  "collectibles",
  "RWA",
  GRAILS_BRAND.name,
];

type BuildPageMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  imageAlt?: string;
  noIndex?: boolean;
  siteName?: string;
};

function normalizePath(path: string): string {
  if (!path) return "/";
  if (path === "/") return path;
  return path.startsWith("/") ? path : `/${path}`;
}

export function getSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || FALLBACK_SITE_URL;
  return raw.replace(/\/$/, "");
}

export function getMetadataBase(): URL {
  return new URL(`${getSiteOrigin()}/`);
}

export function absoluteUrl(path: string): string {
  const safePath = normalizePath(path);
  return `${getSiteOrigin()}${safePath === "/" ? "" : safePath}`;
}

export function buildRootMetadata(): Metadata {
  const defaultTitle = `${SITE_DISPLAY_NAME} — ${SITE_TAGLINE}`;

  return {
    metadataBase: getMetadataBase(),
    title: {
      default: defaultTitle,
      template: `%s — ${SITE_DISPLAY_NAME}`,
    },
    description: ROOT_DESCRIPTION,
    keywords: [
      SITE_BRAND_NAME,
      SITE_DISPLAY_NAME,
      "SVF",
      "community vault",
      "graded slabs",
      "collectible vault",
      "Solana collectibles",
      GRAILS_BRAND.name,
      "Tensor for Slabs",
    ],
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: SITE_DISPLAY_NAME,
      title: defaultTitle,
      description: ROOT_DESCRIPTION,
      url: "/",
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      creator: "@SlabVaultFi",
      site: "@SlabVaultFi",
      title: defaultTitle,
      description: ROOT_DESCRIPTION,
      images: [DEFAULT_OG_IMAGE.url],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
    icons: {
      icon: [
        { url: "/brand/logo.png", type: "image/png", sizes: "192x192" },
        { url: "/icon.png", type: "image/png", sizes: "32x32" },
        { url: "/favicon.ico", sizes: "any" },
      ],
      apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
    },
  };
}

export function buildGrailsTradeMetadata(path = "/trade"): Metadata {
  return buildPageMetadata({
    title: GRAILS_SEO.title,
    description: GRAILS_SEO.description,
    path,
    keywords: [...GRAILS_SEO.keywords],
    imageAlt: GRAILS_SEO.imageAlt,
    siteName: GRAILS_SEO.name,
  });
}

export function buildPageMetadata({
  title,
  description,
  path,
  keywords = [],
  imageAlt,
  noIndex = false,
  siteName = SITE_DISPLAY_NAME,
}: BuildPageMetadataInput): Metadata {
  const safePath = normalizePath(path);
  const socialTitle =
    title === "Home"
      ? `${SITE_DISPLAY_NAME} — ${SITE_TAGLINE}`
      : title.includes("—")
        ? title
        : `${title} — ${siteName}`;
  const mergedKeywords = Array.from(new Set([...defaultKeywords, ...keywords]));

  return {
    title,
    description,
    keywords: mergedKeywords,
    alternates: {
      canonical: safePath,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName,
      title: socialTitle,
      description,
      url: safePath,
      images: [{ ...DEFAULT_OG_IMAGE, alt: imageAlt ?? DEFAULT_OG_IMAGE.alt }],
    },
    twitter: {
      card: "summary_large_image",
      creator: "@SlabVaultFi",
      site: "@SlabVaultFi",
      title: socialTitle,
      description,
      images: [DEFAULT_OG_IMAGE.url],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
            "max-snippet": -1,
            "max-image-preview": "large",
            "max-video-preview": -1,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-snippet": -1,
            "max-image-preview": "large",
            "max-video-preview": -1,
          },
        },
  };
}
