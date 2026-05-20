import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/admin-auth";

/**
 * PATCH /api/admin/transactions/:id/fulfill - Mark slab fulfillment complete
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const fulfillmentSignature =
      typeof body.fulfillmentSignature === "string"
        ? body.fulfillmentSignature.trim()
        : undefined;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    if (
      transaction.status !== "PENDING_FULFILLMENT" &&
      transaction.status !== "COMPLETED"
    ) {
      return NextResponse.json(
        {
          error: `Cannot fulfill transaction with status ${transaction.status}`,
        },
        { status: 400 },
      );
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        status: "COMPLETED",
        fulfillmentSignature:
          fulfillmentSignature || transaction.fulfillmentSignature,
        fulfilledAt: new Date(),
      },
      include: { slab: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error marking fulfillment complete:", error);
    return NextResponse.json(
      { error: "Failed to update fulfillment status" },
      { status: 500 },
    );
  }
}
