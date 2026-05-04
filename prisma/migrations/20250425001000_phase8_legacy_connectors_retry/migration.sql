-- CreateEnum
CREATE TYPE "LegacyConnectionSource" AS ENUM ('FIREBIRD', 'MSSQL');

-- CreateEnum
CREATE TYPE "LegacyExportSource" AS ENUM ('FIREBIRD', 'MSSQL', 'MOCK');

-- CreateEnum
CREATE TYPE "LegacyExportAttemptStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'RETRYING');

-- CreateTable
CREATE TABLE "legacy_connection_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source" "LegacyConnectionSource" NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "database_name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "options" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "dry_run" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legacy_connection_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legacy_export_attempts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "source" "LegacyExportSource" NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" "LegacyExportAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "provider_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legacy_export_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "legacy_connection_configs_tenant_id_source_key" ON "legacy_connection_configs"("tenant_id", "source");

-- CreateIndex
CREATE INDEX "legacy_connection_configs_tenant_id_enabled_idx" ON "legacy_connection_configs"("tenant_id", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "legacy_export_attempts_tenant_id_order_id_source_key" ON "legacy_export_attempts"("tenant_id", "order_id", "source");

-- CreateIndex
CREATE INDEX "legacy_export_attempts_tenant_id_status_updated_at_idx" ON "legacy_export_attempts"("tenant_id", "status", "updated_at");

-- AddForeignKey
ALTER TABLE "legacy_connection_configs" ADD CONSTRAINT "legacy_connection_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legacy_export_attempts" ADD CONSTRAINT "legacy_export_attempts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legacy_export_attempts" ADD CONSTRAINT "legacy_export_attempts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
