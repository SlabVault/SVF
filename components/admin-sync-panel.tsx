"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = {
  lastSyncAt: string | null;
};

type SyncResponse = {
  success?: boolean;
  timestamp?: string;
  errors?: string[];
  error?: string;
};

export function AdminSyncPanel({ lastSyncAt }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncedAt, setSyncedAt] = useState(lastSyncAt);

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
      setStatus(
        data.success
          ? "Sync completed."
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

  return (
    <Card className="space-y-4 p-6 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
      <div>
        <h2 className="font-display text-xl font-semibold">Data sync</h2>
        <p className="mt-1 text-sm text-muted">
          Pull slabs, pulls, and wallet balances from external sources into{" "}
          <code className="text-foreground">data/*.json</code>. CLI:{" "}
          <code className="text-foreground">npm run sync</code>
        </p>
      </div>
      <p className="text-sm text-muted">
        Last sync: <span className="font-mono text-foreground">{displayTime}</span>
      </p>
      {status ? <p className="text-sm text-foreground">{status}</p> : null}
      <Button
        type="button"
        variant="outline"
        disabled={loading}
        onClick={() => void runSync()}
      >
        {loading ? "Syncing…" : "Run sync now"}
      </Button>
    </Card>
  );
}
