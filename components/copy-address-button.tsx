"use client";

import { useState } from "react";

type Props = {
  address: string;
};

export function CopyAddressButton({ address }: Props) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setState("copied");
      window.setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      window.setTimeout(() => setState("idle"), 2000);
    }
  }

  const label =
    state === "copied" ? "Copied" : state === "error" ? "Copy failed" : "Copy";

  return (
    <button
      type="button"
      onClick={onCopy}
      className="rounded-lg border border-line bg-vault-panel px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-vault-violet/50 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-amber"
    >
      {label}
    </button>
  );
}
