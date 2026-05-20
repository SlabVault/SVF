"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  transactionId: string;
  status: string;
  adminPasswordConfigured: boolean;
};

export function FulfillmentActions({
  transactionId,
  status,
  adminPasswordConfigured,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fulfillmentSig, setFulfillmentSig] = useState("");

  if (status !== "PENDING_FULFILLMENT") {
    return status === "COMPLETED" ? (
      <span className="text-xs text-vault-mint">Fulfilled</span>
    ) : null;
  }

  const handleFulfill = async () => {
    const password = prompt("Enter admin password:");
    if (!password) return;

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/transactions/${transactionId}/fulfill`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${password}`,
          },
          body: JSON.stringify({
            fulfillmentSignature: fulfillmentSig.trim() || undefined,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to mark fulfillment complete");
      }

      setMessage("Marked as fulfilled. Refresh to see updated status.");
      window.location.reload();
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Fulfillment update failed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {adminPasswordConfigured ? (
        <>
          <input
            type="text"
            placeholder="Fulfillment tx sig (optional)"
            value={fulfillmentSig}
            onChange={(e) => setFulfillmentSig(e.target.value)}
            className="w-full rounded border border-line bg-vault-panel/40 px-2 py-1 text-xs font-mono"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={handleFulfill}
            className="w-full text-xs"
          >
            {loading ? "Saving..." : "Mark fulfilled"}
          </Button>
        </>
      ) : (
        <span className="text-xs text-muted">Set ADMIN_PASSWORD for actions</span>
      )}
      {message ? <p className="text-xs text-muted">{message}</p> : null}
    </div>
  );
}
