-- CreateEnum
CREATE TYPE "ProductExternalSource" AS ENUM ('FIREBIRD', 'MSSQL', 'MANUAL', 'UNKNOWN');

-- AlterTable
ALTER TABLE "products"
  ADD COLUMN "external_id" TEXT,
  ADD COLUMN "external_source" "ProductExternalSource" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "last_synced_at" TIMESTAMP(3),
  ADD COLUMN "sync_metadata" JSONB;

-- CreateIndex
CREATE INDEX "products_tenant_id_external_source_idx" ON "products"("tenant_id", "external_source");
