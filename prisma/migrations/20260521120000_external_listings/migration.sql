-- CreateEnum
CREATE TYPE "ExternalListingSource" AS ENUM ('collector_crypt', 'phygitals', 'magic_eden', 'manual');

-- CreateEnum
CREATE TYPE "ExternalListingStatus" AS ENUM ('active', 'sold', 'unknown');

-- CreateEnum
CREATE TYPE "ExternalListingCurrency" AS ENUM ('USD', 'SOL', 'USDC');

-- CreateEnum
CREATE TYPE "ExternalListingGrader" AS ENUM ('PSA', 'BGS', 'CGC', 'SGC');

-- CreateTable
CREATE TABLE "ExternalListing" (
    "id" TEXT NOT NULL,
    "source" "ExternalListingSource" NOT NULL,
    "externalId" TEXT NOT NULL,
    "deepLinkUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "grader" "ExternalListingGrader",
    "certNumber" TEXT,
    "priceUsd" DECIMAL(65,30),
    "priceSol" DECIMAL(65,30),
    "currency" "ExternalListingCurrency" NOT NULL DEFAULT 'USD',
    "imageUrl" TEXT NOT NULL,
    "setName" TEXT,
    "cardName" TEXT,
    "fmvUsd" DECIMAL(65,30),
    "status" "ExternalListingStatus" NOT NULL DEFAULT 'active',
    "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "staleAfter" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalListing_source_externalId_key" ON "ExternalListing"("source", "externalId");

-- CreateIndex
CREATE INDEX "ExternalListing_status_source_idx" ON "ExternalListing"("status", "source");

-- CreateIndex
CREATE INDEX "ExternalListing_indexedAt_idx" ON "ExternalListing"("indexedAt");
