import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = {
  live: boolean;
  embedUrl: string;
  watchUrl: string;
};

export function StreamEmbed({ live, embedUrl, watchUrl }: Props) {
  const canEmbed = Boolean(embedUrl?.trim());

  return (
    <section className="space-y-4" aria-label="Live stream">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Streams</h2>
        <Badge variant={live ? "live" : "secondary"} className="px-3 py-1">
          {live ? "Live" : "Offline"}
        </Badge>
      </div>

      <Card variant="embed" className="transition-[border-color] hover:border-vault-violet/25">
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
            <Button asChild>
              <a href={watchUrl} target="_blank" rel="noreferrer">
                Watch on X
              </a>
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}
