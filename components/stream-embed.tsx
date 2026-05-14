type Props = {
  live: boolean;
  embedUrl: string;
  watchUrl: string;
};

export function StreamEmbed({ live, embedUrl, watchUrl }: Props) {
  const canEmbed = Boolean(embedUrl?.trim());

  return (
    <section className="space-y-3" aria-label="Live stream">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Streams</h2>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            live
              ? "border-vault-mint/40 bg-vault-mint/10 text-vault-mint"
              : "border-line bg-vault-panel text-muted"
          }`}
        >
          {live ? "Live" : "Offline"}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-black/40">
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
          <div className="flex aspect-video flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="max-w-md text-sm text-muted">
              Add an iframe <span className="font-mono text-xs">embedUrl</span> in{" "}
              <span className="font-mono text-xs">data/site.json</span> when your
              player supports embedding (Kick / Twitch / YouTube).
            </p>
            <a
              href={watchUrl}
              className="rounded-full border border-vault-amber/40 bg-vault-amber px-5 py-2 text-sm font-semibold text-vault-void transition-colors hover:bg-vault-amber/90"
              target="_blank"
              rel="noreferrer"
            >
              Watch on X
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
