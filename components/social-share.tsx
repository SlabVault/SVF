"use client";

import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  url: string;
  title: string;
  description?: string;
};

function getSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

function subscribeToOrigin() {
  return () => {};
}

function resolveShareUrl(path: string, origin: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized}`;
}

export function SocialShare({ url, title }: Props) {
  const origin = useSyncExternalStore(
    subscribeToOrigin,
    () =>
      typeof window !== "undefined"
        ? window.location.origin
        : getSiteOrigin(),
    getSiteOrigin,
  );

  const shareUrl = resolveShareUrl(url, origin);
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = [
    {
      name: "X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      label: "Share on X",
    },
    {
      name: "Telegram",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      label: "Share on Telegram",
    },
    {
      name: "Copy",
      action: () => {
        void navigator.clipboard.writeText(shareUrl);
      },
      label: "Copy link",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">Share:</span>
      {shareLinks.map((link) =>
        link.action ? (
          <Button
            key={link.name}
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={link.action}
            aria-label={link.label}
          >
            {link.name}
          </Button>
        ) : (
          <Button key={link.name} variant="ghost" size="sm" className="text-xs" asChild>
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              aria-label={link.label}
            >
              {link.name}
            </a>
          </Button>
        ),
      )}
    </div>
  );
}
