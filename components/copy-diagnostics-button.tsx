"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  text: string;
};

export function CopyDiagnosticsButton({ text }: Props) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      window.setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      window.setTimeout(() => setState("idle"), 2000);
    }
  }

  const label =
    state === "copied"
      ? "Copied report"
      : state === "error"
        ? "Copy failed"
        : "Copy diagnostics";

  return (
    <Button type="button" variant="outline" size="sm" onClick={onCopy}>
      {label}
    </Button>
  );
}
