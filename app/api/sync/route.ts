import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { syncAllData, getSyncStatus } from "@/lib/data-sync";
import { jsonError } from "@/lib/api-errors";
import { requireSyncAuth } from "@/lib/sync-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/sync - Get current sync status
 */
export async function GET(request: NextRequest) {
  const authError = await requireSyncAuth(request);
  if (authError) return authError;

  try {
    const status = await getSyncStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error getting sync status:", error);
    return jsonError({
      request,
      status: 500,
      code: "SYNC_STATUS_INTERNAL_ERROR",
      message: "Failed to get sync status",
      details: {
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    });
  }
}

/**
 * POST /api/sync - Trigger manual data sync (cron, CLI, or admin session)
 */
export async function POST(request: NextRequest) {
  const authError = await requireSyncAuth(request);
  if (authError) return authError;

  try {
    const result = await syncAllData();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error triggering sync:", error);
    return jsonError({
      request,
      status: 500,
      code: "SYNC_TRIGGER_INTERNAL_ERROR",
      message: "Failed to trigger sync",
      details: {
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    });
  }
}
