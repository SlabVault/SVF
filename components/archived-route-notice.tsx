"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  getArchivedRouteNotice,
  parseArchivedRouteSource,
} from "@/lib/redirect-notices";

export function ArchivedRouteNotice() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const source = useMemo(
    () => parseArchivedRouteSource(searchParams.get("from") ?? undefined),
    [searchParams],
  );

  const dismiss = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    const query = params.toString();
    router.replace(query ? `?${query}` : "?", { scroll: false });
  }, [router, searchParams]);

  if (!source) return null;

  const notice = getArchivedRouteNotice(source);

  return (
    <div
      role="status"
      className="mb-3 rounded-xl border border-vault-amber/35 bg-vault-amber/10 px-4 py-3 sm:px-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">{notice.title}</p>
          <p className="text-sm text-muted">{notice.body}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 self-start text-muted hover:text-foreground"
          onClick={dismiss}
          aria-label="Dismiss notice"
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
