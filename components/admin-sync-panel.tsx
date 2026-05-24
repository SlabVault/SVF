"use client";

import { useState } from "react";
import type { SyncResult, SyncSourceStatus, SyncStatusSnapshot } from "@/lib/data-sync";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = {
  initialStatus: SyncStatusSnapshot;
};

type SyncResponse = Partial<SyncResult> & { error?: string };

function statusTone(status: SyncSourceStatus): string {
  if (status.status === "unknown") {
    return "border-line bg-vault-panel/40 text-slate-200";
  }
  if (status.status === "failure") {
    return "border-rose-500/40 bg-rose-500/15 text-rose-100";
  }
  if (status.isStale) {
    return "border-amber-500/40 bg-amber-500/15 text-amber-100";
  }
  return "border-emerald-500/40 bg-emerald-500/15 text-emerald-100";
}

function statusLabel(status: SyncSourceStatus): string {
  if (status.status === "unknown") {
    return "unknown";
  }
  if (status.status === "failure") {
    return "failure";
  }
  if (status.isStale) {
    return "stale";
  }
  return "healthy";
}

function formatAge(ageMinutes: number | null): string {
  if (ageMinutes === null) {
    return "n/a";
  }
  if (ageMinutes < 60) {
    return `${ageMinutes}m`;
  }
  const hours = Math.floor(ageMinutes / 60);
  const minutes = ageMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export function AdminSyncPanel({ initialStatus }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncedAt, setSyncedAt] = useState(initialStatus.lastSync);
  const [lastAttemptAt, setLastAttemptAt] = useState(initialStatus.lastSyncAttempt);
  const [sourceStatuses, setSourceStatuses] = useState(initialStatus.sourceStatuses);
  const [operatorHints, setOperatorHints] = useState(initialStatus.operatorHints);
  const [degraded, setDegraded] = useState(initialStatus.degraded);

  async function runSync() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as SyncResponse;
      if (!res.ok) {
        setStatus(data.error ?? "Sync failed");
        return;
      }
      setSyncedAt(data.timestamp ?? new Date().toISOString());
      setLastAttemptAt(data.timestamp ?? new Date().toISOString());
      if (data.sourceStatuses) {
        setSourceStatuses(data.sourceStatuses);
      }
      if (data.operatorHints) {
        setOperatorHints(data.operatorHints);
      }
      if (typeof data.degraded === "boolean") {
        setDegraded(data.degraded);
      }
      setStatus(
        data.success
          ? data.degraded
            ? "Sync completed with upstream warnings."
            : "Sync completed."
          : `Sync finished with warnings: ${(data.errors ?? []).join("; ") || "no changes"}`,
      );
    } catch {
      setStatus("Network error — try npm run sync from the repo root.");
    } finally {
      setLoading(false);
    }
  }

  const displayTime = syncedAt
    ? new Date(syncedAt).toLocaleString()
    : "Never";
  const displayAttemptTime = lastAttemptAt
    ? new Date(lastAttemptAt).toLocaleString()
    : "Never";

  return (
    <Card className="space-y-4 p-6 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">Data sync</h2>
        <Badge className={degraded ? "bg-amber-500/15 text-amber-100" : "bg-emerald-500/15 text-emerald-100"}>
          {degraded ? "degraded" : "healthy"}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted">
        Pull slabs, pulls, and wallet balances from external sources into{" "}
        <code className="text-foreground">data/*.json</code>. CLI:{" "}
        <code className="text-foreground">npm run sync</code>
      </p>
      <div className="space-y-1 text-sm text-muted">
        <p>
          Last successful sync:{" "}
          <span className="font-mono text-foreground">{displayTime}</span>
        </p>
        <p>
          Last sync attempt:{" "}
          <span className="font-mono text-foreground">{displayAttemptTime}</span>
        </p>
      </div>
      {status ? <p className="text-sm text-foreground">{status}</p> : null}
      <Button
        type="button"
        variant="outline"
        disabled={loading}
        onClick={() => void runSync()}
      >
        {loading ? "Syncing…" : "Run sync now"}
      </Button>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Source status</h3>
        <ul className="space-y-2">
          {sourceStatuses.map((sourceStatus) => (
            <li
              key={sourceStatus.key}
              className="rounded-lg border border-line bg-vault-panel/40 px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-foreground">{sourceStatus.label}</p>
                <Badge className={statusTone(sourceStatus)}>
                  {statusLabel(sourceStatus)}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted">{sourceStatus.detail}</p>
              <p className="mt-1 text-xs text-muted">
                Last success age:{" "}
                <span className="font-mono text-foreground">
                  {formatAge(sourceStatus.ageMinutes)}
                </span>
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Operator hints</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          {operatorHints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
