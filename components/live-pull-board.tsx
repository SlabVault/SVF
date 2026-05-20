"use client";

import { useEffect, useState } from "react";
import { LinkButton } from "@/components/link-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { LivePull, SiteStream } from "@/types/content";

type Props = {
  livePull: LivePull;
  stream: SiteStream;
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Ended";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function LivePullCountdown({ endsAt }: { endsAt: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const end = Date.parse(endsAt);
    if (!Number.isFinite(end)) return;

    const tick = () => setLabel(formatCountdown(end - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (!label) return null;

  return (
    <p className="font-mono text-sm text-vault-amber">
      Ends in <span className="font-semibold text-foreground">{label}</span>
    </p>
  );
}

export function LivePullBoard({ livePull, stream }: Props) {
  if (livePull.active) {
    return (
      <section
        className="motion-safe:animate-fade-in-up"
        aria-label="Live pull"
      >
        <Card className="border-vault-amber/35 bg-gradient-to-r from-vault-amber/15 via-vault-panel/80 to-vault-violet/20 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Badge variant="live" className="w-fit">
                Pulling now
              </Badge>
              <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
                Pulling now on {livePull.partner}
              </h2>
              <p className="text-sm text-muted">
                {livePull.title}
                {livePull.message?.trim() ? ` — ${livePull.message.trim()}` : null}
              </p>
              {livePull.endsAt?.trim() ? (
                <LivePullCountdown endsAt={livePull.endsAt.trim()} />
              ) : null}
            </div>
            <LinkButton href={livePull.url} external className="w-full sm:w-auto shrink-0">
              Join pull
            </LinkButton>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="motion-safe:animate-fade-in-up" aria-label="Next stream">
      <Card className="flex flex-col gap-3 border-line bg-vault-panel/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Next stream
          </p>
          <p className="text-sm text-foreground">
            Follow for live pull alerts and stream times.
          </p>
        </div>
        <LinkButton
          href={stream.watchUrl}
          external
          variant="secondary"
          className="w-full sm:w-auto shrink-0"
        >
          Watch on X
        </LinkButton>
      </Card>
    </section>
  );
}
