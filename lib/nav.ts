/** Full primary header navigation (flat, all visible on desktop). */
export const PRIMARY_NAV = [
  { href: "/", label: "Home" },
  { href: "/vault", label: "Vault" },
  { href: "/pulls", label: "Pulls" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/streams", label: "Streams" },
  { href: "/svf", label: "$SVF" },
  { href: "/faq", label: "FAQ" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/community", label: "Community" },
] as const;

/** @deprecated Use PRIMARY_NAV — kept for imports that still reference MORE_NAV */
export const MORE_NAV = [] as const;

export const INTERNAL_NAV = PRIMARY_NAV;

export const ADMIN_NAV = [
  { href: "/admin", label: "Admin Dashboard" },
  { href: "/admin/slabs", label: "Manage Slabs" },
  { href: "/admin/transactions", label: "Transactions" },
] as const;
