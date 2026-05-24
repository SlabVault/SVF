-- Add split strategy, reservation safety fields, and replay protection.
DO $$
BEGIN
  CREATE TYPE "PaymentSplit" AS ENUM ('FIXED_DUAL', 'SOL_80_SVF_20');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TYPE "PaymentSplit" ADD VALUE IF NOT EXISTS 'FIXED_DUAL';
ALTER TYPE "PaymentSplit" ADD VALUE IF NOT EXISTS 'SOL_80_SVF_20';

ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "paymentSplit" "PaymentSplit" NOT NULL DEFAULT 'FIXED_DUAL',
  ADD COLUMN IF NOT EXISTS "listPriceUsdSnapshot" DECIMAL(65,30),
  ADD COLUMN IF NOT EXISTS "reservedExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "solPaidAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_transactionSignature_key" ON "Transaction"("transactionSignature");
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_burnSignature_key" ON "Transaction"("burnSignature");
