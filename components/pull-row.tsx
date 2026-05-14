import Link from "next/link";
import type { PullItem } from "@/types/content";
import { formatUsd } from "@/lib/format";

type Props = {
  pull: PullItem;
};

export function PullRow({ pull }: Props) {
  const cost = pull.costUsd != null ? formatUsd(pull.costUsd) : "—";
  const out = pull.outcomeUsd != null ? formatUsd(pull.outcomeUsd) : "—";

  return (
    <article className="grid gap-4 rounded-2xl border border-line bg-vault-panel/50 p-4 md:grid-cols-[140px_1fr_auto] md:items-center">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Date
        </p>
        <p className="mt-1 font-mono text-sm text-foreground">{pull.date}</p>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {pull.source}
        </p>
        <p className="text-sm text-foreground">{pull.summary}</p>
        <p className="text-xs text-muted">
          Cost: <span className="font-mono text-foreground/90">{cost}</span> ·
          Outcome: <span className="font-mono text-foreground/90">{out}</span>
        </p>
      </div>
      <div className="md:text-right">
        {pull.clipUrl ? (
          <Link
            href={pull.clipUrl}
            className="inline-flex text-sm font-semibold text-vault-amber underline-offset-4 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Clip
          </Link>
        ) : (
          <span className="text-xs text-muted">No clip linked</span>
        )}
      </div>
    </article>
  );
}
