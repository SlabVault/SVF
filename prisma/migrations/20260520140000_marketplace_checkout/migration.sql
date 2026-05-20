-- Marketplace checkout: fulfillment fields and PENDING_FULFILLMENT status
ALTER TYPE "TransactionStatus" ADD VALUE IF NOT EXISTS 'PENDING_FULFILLMENT';

ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "fulfillmentSignature" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "fulfilledAt" TIMESTAMP(3);
