import { LinkButton } from "@/components/link-button";
import type { SiteLinks } from "@/types/content";

type Props = {
  links: SiteLinks;
};

export function QuickLinks({ links }: Props) {
  return (
    <section className="space-y-4" aria-label="Official links">
      <div>
        <h2 className="font-display text-2xl font-semibold">Official links</h2>
        <p className="mt-2 max-w-prose text-sm text-muted">
          Bookmark these. If a link ever looks off, cross-check against GitBook and
          the official X account before signing anything.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <LinkButton href={links.gitbook} external variant="secondary">
          GitBook docs
        </LinkButton>
        <LinkButton href={links.twitter} external variant="secondary">
          X (Twitter)
        </LinkButton>
        <LinkButton href={links.telegram} external variant="secondary">
          Telegram
        </LinkButton>
        <LinkButton href={links.linktree} external variant="secondary">
          Linktree
        </LinkButton>
        <LinkButton href={links.pump} external variant="secondary">
          Pump.fun
        </LinkButton>
        <LinkButton href={links.dexscreener} external variant="secondary">
          Dexscreener
        </LinkButton>
        <LinkButton href={links.birdeye} external variant="secondary">
          Birdeye
        </LinkButton>
      </div>
    </section>
  );
}
