import { parseEnvFlag } from "@/lib/env-flags";

/** Primary env flag for the RWA trade lane (`/trade`). */
const TRADE_PLATFORM_ENV = "TRADE_PLATFORM_ENABLED";

/** Legacy alias — kept for backward compatibility. */
const RWA_TRADE_ENV = "RWA_TRADE_ENABLED";

function readTradePlatformFlag(): string | undefined {
  return process.env[TRADE_PLATFORM_ENV] ?? process.env[RWA_TRADE_ENV];
}

/** Tensor-like RWA trading platform — on in dev by default; explicit flag required in production. */
export function isRwaTradeEnabled(): boolean {
  return parseEnvFlag(
    readTradePlatformFlag(),
    process.env.NODE_ENV !== "production",
  );
}
