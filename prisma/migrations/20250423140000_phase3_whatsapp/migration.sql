-- CreateEnum
CREATE TYPE "WaMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "WhatsAppConversationState" AS ENUM (
  'NEEDS_NAME',
  'NEEDS_ADDRESS',
  'READY_TO_ORDER',
  'WAITING_ORDER_ITEMS',
  'PENDING_CONFIRMATION'
);

-- AlterTable orders: total
ALTER TABLE "orders" ADD COLUMN "total" DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- CreateTable whatsapp_messages
CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "direction" "WaMessageDirection" NOT NULL,
    "message_text" TEXT NOT NULL,
    "raw_payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable products
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "display_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12, 2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable whatsapp_conversations
CREATE TABLE "whatsapp_conversations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "state" "WhatsAppConversationState" NOT NULL DEFAULT 'NEEDS_NAME',
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_messages_tenant_id_phone_idx" ON "whatsapp_messages"("tenant_id", "phone");

-- CreateIndex
CREATE INDEX "products_tenant_id_idx" ON "products"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_display_code_key" ON "products"("tenant_id", "display_code");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_conversations_tenant_id_phone_key" ON "whatsapp_conversations"("tenant_id", "phone");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_customer_id_idx" ON "whatsapp_conversations"("customer_id");

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
