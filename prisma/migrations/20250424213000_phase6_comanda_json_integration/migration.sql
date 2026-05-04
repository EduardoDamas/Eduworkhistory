-- CreateTable
CREATE TABLE "comanda_integration_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comanda_integration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comanda_integration_logs_tenant_id_created_at_idx" ON "comanda_integration_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "comanda_integration_logs_tenant_id_action_idx" ON "comanda_integration_logs"("tenant_id", "action");

-- AddForeignKey
ALTER TABLE "comanda_integration_logs" ADD CONSTRAINT "comanda_integration_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
