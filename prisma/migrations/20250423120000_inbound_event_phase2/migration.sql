-- CreateEnum
CREATE TYPE "InboundEventStatus" AS ENUM (
  'RECEIVED',
  'QUEUED',
  'PROCESSING',
  'PROCESSED',
  'FAILED',
  'DUPLICATE'
);

-- AlterTable inbound_events: add new columns
ALTER TABLE "inbound_events" ADD COLUMN "payload" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "inbound_events" ADD COLUMN "status" "InboundEventStatus" NOT NULL DEFAULT 'RECEIVED';
ALTER TABLE "inbound_events" ADD COLUMN "error_message" TEXT;

-- Backfill payload from legacy column
UPDATE "inbound_events" SET "payload" = COALESCE("raw_payload", '{}'::jsonb);

-- Backfill status from processed_at heuristic
UPDATE "inbound_events"
SET "status" = CASE
  WHEN "processed_at" IS NOT NULL THEN 'PROCESSED'::"InboundEventStatus"
  ELSE 'RECEIVED'::"InboundEventStatus"
END;

-- Drop legacy columns
ALTER TABLE "inbound_events" DROP COLUMN IF EXISTS "raw_payload";
ALTER TABLE "inbound_events" DROP COLUMN IF EXISTS "metadata";
ALTER TABLE "inbound_events" DROP COLUMN IF EXISTS "updated_at";
