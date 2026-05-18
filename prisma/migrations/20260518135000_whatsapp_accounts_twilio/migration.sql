-- Move tenant WhatsApp account config from Meta fields to Twilio fields.
-- Keep existing rows by renaming columns where possible.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'whatsapp_accounts' AND column_name = 'phone_number_id'
  ) THEN
    ALTER TABLE "whatsapp_accounts" RENAME COLUMN "phone_number_id" TO "account_sid";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'whatsapp_accounts' AND column_name = 'business_account_id'
  ) THEN
    ALTER TABLE "whatsapp_accounts" RENAME COLUMN "business_account_id" TO "whatsapp_from";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'whatsapp_accounts' AND column_name = 'access_token'
  ) THEN
    ALTER TABLE "whatsapp_accounts" RENAME COLUMN "access_token" TO "auth_token";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'whatsapp_accounts' AND column_name = 'verify_token'
  ) THEN
    ALTER TABLE "whatsapp_accounts" RENAME COLUMN "verify_token" TO "sandbox_join_code";
  END IF;
END $$;

ALTER TABLE "whatsapp_accounts"
  DROP COLUMN IF EXISTS "app_secret";

ALTER TABLE "whatsapp_accounts"
  ALTER COLUMN "sandbox_join_code" DROP NOT NULL;

DROP INDEX IF EXISTS "whatsapp_accounts_phone_number_id_idx";
DROP INDEX IF EXISTS "whatsapp_accounts_verify_token_idx";

CREATE INDEX IF NOT EXISTS "whatsapp_accounts_account_sid_idx"
  ON "whatsapp_accounts"("account_sid");
CREATE INDEX IF NOT EXISTS "whatsapp_accounts_whatsapp_from_idx"
  ON "whatsapp_accounts"("whatsapp_from");
