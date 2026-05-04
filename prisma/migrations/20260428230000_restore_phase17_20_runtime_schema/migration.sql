-- Restore Phase 17-20 runtime schema objects in an idempotent way.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE lower(typname) = lower('ClientPushAttemptStatus')) THEN
    CREATE TYPE "ClientPushAttemptStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'RETRYING');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE lower(typname) = lower('UserRole')) THEN
    CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'MODERATOR', 'USER');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE lower(typname) = lower('SubscriptionPlan')) THEN
    CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE lower(typname) = lower('SubscriptionStatus')) THEN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'CANCELED', 'PAST_DUE');
  END IF;
END $$;

DO $$
BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MODERATOR';
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'USER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAST_DUE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'OWNER',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "tenant_users" (
  "user_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_users_pkey" PRIMARY KEY ("user_id", "tenant_id")
);

CREATE TABLE IF NOT EXISTS "client_mapping_configs" (
  "tenant_id" TEXT NOT NULL,
  "config" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_mapping_configs_pkey" PRIMARY KEY ("tenant_id")
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "tenant_id" TEXT NOT NULL,
  "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  "stripe_customer_id" TEXT,
  "stripe_subscription_id" TEXT,
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "current_period_start" TIMESTAMP(3) NOT NULL,
  "current_period_end" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("tenant_id")
);

CREATE TABLE IF NOT EXISTS "client_push_attempts" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "status" "ClientPushAttemptStatus" NOT NULL DEFAULT 'PENDING',
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_push_attempts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "client_push_attempts_tenant_id_order_id_key" ON "client_push_attempts"("tenant_id", "order_id");
CREATE INDEX IF NOT EXISTS "client_push_attempts_tenant_id_status_updated_at_idx" ON "client_push_attempts"("tenant_id", "status", "updated_at");
CREATE INDEX IF NOT EXISTS "tenant_users_tenant_id_role_idx" ON "tenant_users"("tenant_id", "role");
CREATE INDEX IF NOT EXISTS "subscriptions_status_plan_idx" ON "subscriptions"("status", "plan");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_users_user_id_fkey'
  ) THEN
    ALTER TABLE "tenant_users"
      ADD CONSTRAINT "tenant_users_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_users_tenant_id_fkey'
  ) THEN
    ALTER TABLE "tenant_users"
      ADD CONSTRAINT "tenant_users_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_mapping_configs_tenant_id_fkey'
  ) THEN
    ALTER TABLE "client_mapping_configs"
      ADD CONSTRAINT "client_mapping_configs_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_tenant_id_fkey'
  ) THEN
    ALTER TABLE "subscriptions"
      ADD CONSTRAINT "subscriptions_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_push_attempts_tenant_id_fkey'
  ) THEN
    ALTER TABLE "client_push_attempts"
      ADD CONSTRAINT "client_push_attempts_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_push_attempts_order_id_fkey'
  ) THEN
    ALTER TABLE "client_push_attempts"
      ADD CONSTRAINT "client_push_attempts_order_id_fkey"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
