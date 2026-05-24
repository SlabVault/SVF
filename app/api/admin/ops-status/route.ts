import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAdminRole, requireAuth } from "@/lib/admin-auth";
import { getAdminOpsStatus } from "@/lib/admin-ops-status";
import { jsonError } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const roleError = await requireAdminRole(request, ["admin"]);
  if (roleError) return roleError;

  try {
    const status = await getAdminOpsStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error loading admin ops status:", error);
    return jsonError({
      request,
      status: 500,
      code: "ADMIN_OPS_STATUS_INTERNAL_ERROR",
      message: "Failed to load admin ops status.",
      details: {
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    });
  }
}
