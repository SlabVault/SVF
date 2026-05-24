/** SlabVault — community vault / treasury brand. */
export const SLABVAULT_BRAND = {
  fullName: "SlabVaultFi",
  displayName: "SlabVault",
  ticker: "SVF",
  tagline: "Community-owned collectible vault on Solana",
  labsName: "SlabVault Labs",
} as const;

/** GRAILS — graded slab aggregator / trade desk product. */
export const GRAILS_BRAND = {
  name: "GRAILS",
  tagline: "Tensor for Slabs",
  subtitle: "Graded-card aggregator & trade desk",
  byline: "by SlabVault Labs",
  description:
    "Unified floor, filters, and wallet-native settlement for graded cards across Collector Crypt, Phygitals, and Magic Eden on Solana.",
} as const;

export const BRAND_ASSETS = {
  /** Geometric purple G mark — favicon, compact chrome */
  logo: "/brand/logo.png",
  /** Full GRAILS wordmark SVG — trade desk header (replace file at public/brand/grails-logo.svg) */
  tradeLogo: "/brand/grails-logo.svg",
  /** Full GRAILS wordmark + byline — hero, marketing */
  banner: "/brand/banner.png",
  /** @deprecated use `logo` */
  slabvaultLogo: "/brand/logo.png",
  /** Purple geometric G mark — trade desk header compact mark */
  grailsLogo: "/brand/grails-logo.png",
  /** @deprecated use `banner` */
  grailsBanner: "/brand/banner.png",
} as const;

export const LAUNCH_APP_CTA = "Explore GRAILS";
export const LAUNCH_APP_HREF = "/trade";
