/**
 * Security utilities for the application
 */
import crypto from "node:crypto";

/**
 * Validate and sanitize wallet addresses
 */
export function validateWalletAddress(address: string): boolean {
  // Basic Solana address validation (base58, 32-44 characters)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

/**
 * Validate and sanitize numeric inputs
 */
export function validateNumber(value: string, min?: number, max?: number): number | null {
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  if (min !== undefined && num < min) return null;
  if (max !== undefined && num > max) return null;
  return num;
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .trim();
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Rate limiting storage (in-memory for demo, use Redis in production)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const MAX_IN_MEMORY_RATE_LIMIT_RECORDS = 10_000;

function pruneInMemoryRateLimitStore(now: number) {
  // Drop expired windows first to keep memory bounded during traffic spikes.
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }

  if (rateLimitStore.size <= MAX_IN_MEMORY_RATE_LIMIT_RECORDS) return;

  // If the map still grows too large, evict oldest entries (in insertion order).
  const overflow = rateLimitStore.size - MAX_IN_MEMORY_RATE_LIMIT_RECORDS;
  let removed = 0;
  for (const key of rateLimitStore.keys()) {
    rateLimitStore.delete(key);
    removed++;
    if (removed >= overflow) break;
  }
}

/**
 * Check if a request should be rate limited
 */
function checkRateLimitInMemory(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  pruneInMemoryRateLimitStore(now);
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    // Create new record
    const resetTime = now + windowMs;
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  // Increment count
  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
}

async function checkRateLimitUpstash(
  identifier: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetTime: number } | null> {
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;

  const now = Date.now();
  const windowStart = Math.floor(now / windowMs);
  const key = `ratelimit:${windowStart}:${identifier}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const [incrRes, ttlRes] = await Promise.all([
    fetch(`${url}/incr/${encodeURIComponent(key)}`, { method: "POST", headers }),
    fetch(`${url}/expire/${encodeURIComponent(key)}/${Math.ceil(windowMs / 1000)}`, {
      method: "POST",
      headers,
    }),
  ]);

  if (!incrRes.ok || !ttlRes.ok) return null;
  const incrBody = (await incrRes.json()) as { result?: number };
  const count = Number(incrBody.result ?? 0);
  const remaining = Math.max(0, maxRequests - count);
  return {
    allowed: count <= maxRequests,
    remaining,
    resetTime: now + windowMs,
  };
}

export async function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  try {
    const durable = await checkRateLimitUpstash(identifier, maxRequests, windowMs);
    if (durable) return durable;
  } catch (error) {
    console.error("[security] durable rate limit unavailable, using memory:", error);
  }

  return checkRateLimitInMemory(identifier, maxRequests, windowMs);
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("base64url").slice(0, length);
}

/**
 * Validate environment variables
 */
export function validateEnvVars(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!process.env.DATABASE_URL?.trim()) {
    errors.push("DATABASE_URL is required for marketplace functionality");
  }

  if (process.env.NODE_ENV === "production") {
    const required = [
      "NEXT_PUBLIC_SITE_URL",
      "DATABASE_URL",
      "NEXTAUTH_SECRET",
      "ADMIN_PASSWORD",
      "CRON_SECRET",
    ];

    for (const key of required) {
      if (!process.env[key]?.trim()) {
        errors.push(`${key} is required in production`);
      }
    }

    if (
      !process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() &&
      !process.env.NEXT_PUBLIC_SOLANA_RPC?.trim() &&
      !process.env.SOLANA_RPC_URL?.trim() &&
      !process.env.HELIUS_API_KEY?.trim()
    ) {
      errors.push(
        "NEXT_PUBLIC_SOLANA_RPC_URL, NEXT_PUBLIC_SOLANA_RPC, SOLANA_RPC_URL, or HELIUS_API_KEY is required in production",
      );
    }
  }

  return { valid: errors.length === 0, errors };
}
