import type { UserRole } from "@prisma/client";
import type { Tenant } from "@prisma/client";

export type TenantContext = Pick<Tenant, "id" | "name" | "apiKey">;

export type TenantContextResolved = TenantContext & {
  resolvedBy: "api_key" | "phone_number_id" | "jwt";
  whatsappPhoneNumberId?: string;
  userId?: string;
  userRole?: UserRole;
};
