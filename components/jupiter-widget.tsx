"use client";

import { useEffect, useRef } from "react";

const SVF_TOKEN_ADDRESS = "6ZxRa2CWtAcWKb58RMJABuiUYWu9o4oM76QCyMVLpump";

export function JupiterWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current || !containerRef.current) return;

    const initJupiter = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof window !== "undefined" && (window as any).Jupiter) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const jupiter = (window as any).Jupiter;
        jupiter.init({
          displayMode: "integrated",
          integratedTargetId: "jupiter-plugin",
          formProps: {
            initialInputMint: "So11111111111111111111111111111111111111112", // SOL
            initialOutputMint: SVF_TOKEN_ADDRESS,
            fixedMint: SVF_TOKEN_ADDRESS, // Lock output to SVF
            fixedAmount: false,
          },
        });
        isInitialized.current = true;
      }
    };

    // Wait for Jupiter script to load
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).Jupiter) {
      initJupiter();
    } else {
      let checkInterval: NodeJS.Timeout | null = null;

      const checkJupiter = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof window !== "undefined" && (window as any).Jupiter) {
          initJupiter();
          if (checkInterval) {
            clearInterval(checkInterval);
          }
        }
      };

      checkJupiter();
      checkInterval = setInterval(checkJupiter, 500);

      // Cleanup interval after 5 seconds
      setTimeout(() => {
        if (checkInterval) clearInterval(checkInterval);
      }, 5000);

      return () => {
        if (checkInterval) clearInterval(checkInterval);
      };
    }
  }, []);

  return (
    <div className="w-full">
      <div id="jupiter-plugin" ref={containerRef} className="min-h-[500px]" />
    </div>
  );
}
