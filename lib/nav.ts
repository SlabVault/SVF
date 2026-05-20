/** Flat header navigation — all routes visible on desktop and mobile menu. */
export const INTERNAL_NAV = [
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

/** @deprecated Use INTERNAL_NAV */
export const PRIMARY_NAV = INTERNAL_NAV;

/** @deprecated Dropdown removed — all links are in INTERNAL_NAV */
export const MORE_NAV = [] as const;

export const ADMIN_NAV = [
  { href: "/admin", label: "Admin Dashboard" },
  { href: "/admin/slabs", label: "Manage Slabs" },
  { href: "/admin/transactions", label: "Transactions" },
] as const;
