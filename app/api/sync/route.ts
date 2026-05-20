import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { syncAllData, getSyncStatus } from "@/lib/data-sync";
import { isSyncAuthorized } from "@/lib/sync-auth";

/**
 * GET /api/sync - Get current sync status
 */
export async function GET() {
  try {
    const status = await getSyncStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error getting sync status:", error);
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/sync - Trigger manual data sync (cron, CLI, or admin session)
 */
export async function POST(request: NextRequest) {
  if (!(await isSyncAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncAllData();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error triggering sync:", error);
    return NextResponse.json(
      { error: "Failed to trigger sync" },
      { status: 500 },
    );
  }
}
