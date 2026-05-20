"use client";

import { Button } from "@/components/ui/button";

type Props = {
  url: string;
  title: string;
  description?: string;
};

export function SocialShare({ url, title }: Props) {
  const encodedUrl = encodeURIComponent(url);
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
        navigator.clipboard.writeText(url);
      },
      label: "Copy link",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">Share:</span>
      {shareLinks.map((link) => (
        <Button
          key={link.name}
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={link.action}
          asChild={!link.action}
        >
          {link.action ? (
            <button onClick={link.action}>{link.name}</button>
          ) : (
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              aria-label={link.label}
            >
              {link.name}
            </a>
          )}
        </Button>
      ))}
    </div>
  );
}
