"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-md space-y-4 p-6">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Something went wrong
        </h2>
        <p className="text-sm text-muted">
          We encountered an unexpected error. Please try again or contact support if the problem persists.
        </p>
        <Button onClick={reset}>Try again</Button>
      </Card>
    </div>
  );
}
