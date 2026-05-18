import type { UserRole } from "@prisma/client";
import type { Tenant } from "@prisma/client";

export type TenantContext = Pick<Tenant, "id" | "name" | "apiKey">;

export type TenantContextResolved = TenantContext & {
  resolvedBy:
    | "api_key"
    | "phone_number_id"
    | "twilio_account_sid"
    | "twilio_whatsapp_from"
    | "jwt"
    | "dev_bypass";
  whatsappPhoneNumberId?: string;
  userId?: string;
  userRole?: UserRole;
};
