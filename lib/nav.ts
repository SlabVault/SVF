import { LAUNCH_APP_CTA, LAUNCH_APP_HREF } from "@/lib/brand";
import { isRwaTradeEnabled } from "@/lib/trade-config";
import { TRADE_ROUTES } from "@/lib/trade-routes";
import { VAULT_ROUTES } from "@/lib/vault-routes";

export type NavLink = {
  href: string;
  label: string;
  description?: string;
};

/** @deprecated Legacy platform nav shape — use primary + more instead. */
export type NavPlatform = {
  id: "vault" | "trade";
  kind: "link";
  label: string;
  href: string;
  description: string;
  badge?: "beta" | "soon";
};

export type PublicNavStructure = {
  primary: readonly NavLink[];
  more: readonly NavLink[];
};

export const MORE_NAV = [
  { href: "/streams", label: "Streams" },
  { href: "/svf", label: "$SVF" },
  { href: "/faq", label: "FAQ" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/community", label: "Community" },
] as const satisfies readonly NavLink[];

/** @deprecated Use getPrimaryNav() */
export const VAULT_PLATFORM = {
  id: "vault",
  kind: "link",
  label: "Vault",
  href: VAULT_ROUTES.overview,
  description: "Community treasury — flywheel, inventory, and transparency",
} as const satisfies NavPlatform;

/** @deprecated Use VAULT_PLATFORM */
export const VAULT_SHOP_GROUP = VAULT_PLATFORM;

/** GRAILS trade desk — app lives at /trade; surfaced via Launch App CTA on marketing chrome. */
export const GRAILS_APP = {
  id: "trade",
  kind: "link",
  label: "GRAILS",
  href: LAUNCH_APP_HREF,
  description:
    "Multi-venue graded slab aggregator — CC, Phygitals, treasury, and preview desks in one trade shell",
  badge: "beta",
} as const satisfies NavPlatform;

/** @deprecated Use GRAILS_APP */
export const TRADE_PLATFORM = GRAILS_APP;

export const LAUNCH_APP_NAV = {
  href: LAUNCH_APP_HREF,
  label: LAUNCH_APP_CTA,
  description: GRAILS_APP.description,
} as const satisfies NavLink;

/** @deprecated Use MORE_NAV */
export const SECONDARY_NAV = MORE_NAV;

/** Flat route list for sitemap and legacy consumers. */
export const INTERNAL_NAV = [
  { href: "/", label: "Home" },
  { href: LAUNCH_APP_HREF, label: "GRAILS" },
  { href: TRADE_ROUTES.all, label: "All listings" },
  { href: VAULT_ROUTES.overview, label: "Vault" },
  { href: "/pulls", label: "Pulls" },
  { href: VAULT_ROUTES.proof, label: "Transparency" },
  ...MORE_NAV,
] as const;

export function getPrimaryNav(): NavLink[] {
  return [
    {
      href: "/",
      label: "Home",
      description: "SlabVault story, flywheel, and how to participate",
    },
    {
      href: VAULT_ROUTES.overview,
      label: "Vault",
      description: "Community treasury, inventory, and transparency",
    },
    {
      href: "/pulls",
      label: "Pulls",
      description: "Live gacha pull history and clips",
    },
  ];
}

/** Primary marketing CTA — separate from inline nav links. */
export function getLaunchAppNav(): NavLink | null {
  if (!isRwaTradeEnabled()) return null;
  return LAUNCH_APP_NAV;
}

export function getPublicNavStructure(): PublicNavStructure {
  return {
    primary: getPrimaryNav(),
    more: MORE_NAV,
  };
}

/** Flat nav items respecting feature flags (legacy/mobile fallback). */
export function getPublicNav(): NavLink[] {
  const { primary, more } = getPublicNavStructure();
  const seen = new Set<string>();

  return [...primary, ...more].filter((item) => {
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
}

export const ADMIN_NAV = [
  { href: "/admin", label: "Admin Dashboard" },
  { href: "/admin/slabs", label: "Manage Slabs" },
  { href: "/admin/transactions", label: "Transactions" },
] as const;
