"use client";

import { useEffect } from "react";

type GrowthEvent = {
  event: string;
  timestamp: string;
  pagePath: string;
  href?: string;
  label?: string;
  context?: string;
  source?: string;
  medium?: string;
  campaign?: string;
};

const ATTR_EVENT = "data-growth-event";
const ATTR_CONTEXT = "data-growth-context";
const STORAGE_KEY = "svf.growth.context";

function readLandingContext(): Partial<GrowthEvent> {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) || "{}",
    ) as Partial<GrowthEvent>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persistLandingContext(): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const source = url.searchParams.get("utm_source") ?? undefined;
  const medium = url.searchParams.get("utm_medium") ?? undefined;
  const campaign = url.searchParams.get("utm_campaign") ?? undefined;

  // Only write when UTM params exist to preserve first-touch context.
  if (!source && !medium && !campaign) return;

  const payload = { source, medium, campaign };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function dispatchGrowthEvent(event: GrowthEvent): void {
  if (typeof window === "undefined") return;

  const win = window as Window & {
    dataLayer?: unknown[];
    __SVF_GROWTH_EVENTS__?: GrowthEvent[];
  };

  if (Array.isArray(win.dataLayer)) {
    win.dataLayer.push(event);
  }

  const queue = win.__SVF_GROWTH_EVENTS__ ?? [];
  queue.push(event);
  win.__SVF_GROWTH_EVENTS__ = queue.slice(-100);

  window.dispatchEvent(new CustomEvent("svf:growth", { detail: event }));
}

export function GrowthInstrumentation() {
  useEffect(() => {
    persistLandingContext();

    const onClick = (clickEvent: MouseEvent) => {
      const target = clickEvent.target as HTMLElement | null;
      if (!target) return;

      const node = target.closest(`[${ATTR_EVENT}]`) as HTMLElement | null;
      if (!node) return;

      const eventName = node.getAttribute(ATTR_EVENT);
      if (!eventName) return;

      const href =
        node instanceof HTMLAnchorElement
          ? node.href
          : node.getAttribute("href") || undefined;

      const label = node.textContent?.trim().slice(0, 120) || undefined;
      const context = node.getAttribute(ATTR_CONTEXT) || undefined;
      const landing = readLandingContext();

      dispatchGrowthEvent({
        event: eventName,
        timestamp: new Date().toISOString(),
        pagePath: window.location.pathname,
        href,
        label,
        context,
        source: landing.source,
        medium: landing.medium,
        campaign: landing.campaign,
      });
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, []);

  return null;
}
