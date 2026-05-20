"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = {
  live: boolean;
  embedUrl: string;
  watchUrl: string;
};

export function StreamEmbed({ live, embedUrl, watchUrl }: Props) {
  const [expanded, setExpanded] = useState(live);
  const canEmbed = Boolean(embedUrl?.trim());

  return (
    <section className="space-y-4 animate-fade-in-up" aria-label="Live stream">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Streams</h2>
        <Badge variant={live ? "live" : "secondary"} className={`px-3 py-1 ${live ? "animate-pulse-glow" : ""}`}>
          {live ? "Live" : "Offline"}
        </Badge>
      </div>

      {live || expanded ? (
        <Card variant="embed" className="group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-vault-violet/20 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50 hover:border-vault-violet/30">
          {canEmbed ? (
            <iframe
              title="SlabVaultFi live stream"
              src={embedUrl.trim()}
              className="aspect-video h-auto w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="max-w-md text-sm text-muted">
                Add an iframe <span className="font-mono text-xs">embedUrl</span> in{" "}
                <span className="font-mono text-xs">data/site.json</span> when your
                player supports embedding (Kick / Twitch / YouTube).
              </p>
              <Button asChild className="transition-all duration-300 hover:scale-105">
                <a href={watchUrl} target="_blank" rel="noreferrer">
                  Watch on X
                </a>
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <Card className="group p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-vault-violet/20 bg-gradient-to-br from-vault-panel/30 to-vault-deep/30">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">Stream is currently offline</p>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(true)} className="transition-all duration-300 hover:scale-105">
              Expand
            </Button>
          </div>
        </Card>
      )}
    </section>
  );
}
