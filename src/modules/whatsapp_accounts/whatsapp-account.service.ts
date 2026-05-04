import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";
import { sendWhatsAppText } from "../whatsapp/outbound.service.js";
import { whatsappAccountRepository } from "./whatsapp-account.repository.js";

export type UpsertWhatsappAccountInput = {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  verifyToken: string;
  appSecret?: string | null;
  isActive?: boolean;
};

export const whatsappAccountService = {
  async createOrUpdateForTenant(tenantId: string, input: UpsertWhatsappAccountInput) {
    validateRequired(input);
    const row = await whatsappAccountRepository.upsertForTenant(tenantId, {
      phoneNumberId: input.phoneNumberId.trim(),
      businessAccountId: input.businessAccountId.trim(),
      accessToken: input.accessToken.trim(),
      verifyToken: input.verifyToken.trim(),
      appSecret: input.appSecret?.trim() || null,
      isActive: input.isActive ?? true,
    });
    logger.info(
      { tenantId, accountId: row.id, phoneNumberId: row.phoneNumberId, isActive: row.isActive },
      "whatsapp_account_upserted",
    );
    return sanitize(row);
  },

  async listForTenant(tenantId: string) {
    const rows = await whatsappAccountRepository.listForTenant(tenantId);
    return rows.map(sanitize);
  },

  async patchForTenant(
    tenantId: string,
    id: string,
    input: Partial<UpsertWhatsappAccountInput>,
  ) {
    const patch: Record<string, unknown> = {};
    if (typeof input.phoneNumberId === "string") patch.phoneNumberId = input.phoneNumberId.trim();
    if (typeof input.businessAccountId === "string")
      patch.businessAccountId = input.businessAccountId.trim();
    if (typeof input.accessToken === "string") patch.accessToken = input.accessToken.trim();
    if (typeof input.verifyToken === "string") patch.verifyToken = input.verifyToken.trim();
    if (input.appSecret !== undefined) patch.appSecret = input.appSecret?.trim() || null;
    if (typeof input.isActive === "boolean") patch.isActive = input.isActive;

    const row = await whatsappAccountRepository.updateById(tenantId, id, patch);
    logger.info(
      { tenantId, accountId: row.id, phoneNumberId: row.phoneNumberId, isActive: row.isActive },
      "whatsapp_account_updated",
    );
    return sanitize(row);
  },

  async testSendForTenant(
    tenantId: string,
    accountId: string,
    input: { to: string; message: string },
  ) {
    const account = await whatsappAccountRepository.findByIdInTenant(tenantId, accountId);
    if (!account) throw new Error("WHATSAPP_ACCOUNT_NOT_FOUND");
    if (!input.to?.trim()) throw new Error("WHATSAPP_TEST_SEND_TO_REQUIRED");
    if (!input.message?.trim()) throw new Error("WHATSAPP_TEST_SEND_MESSAGE_REQUIRED");

    const normalizedTo = input.to.trim();
    const text = input.message.trim();
    const mode = env.WHATSAPP_SEND_MODE === "cloud" ? "cloud" : "mock";
    if (mode === "cloud") {
      if (!account.isActive) throw new Error("WHATSAPP_ACCOUNT_INACTIVE");
      if (!account.phoneNumberId?.trim()) throw new Error("WHATSAPP_PHONE_NUMBER_ID_REQUIRED");
      if (!account.accessToken?.trim()) throw new Error("WHATSAPP_ACCESS_TOKEN_REQUIRED");
    }

    const result = await sendWhatsAppText({
      tenantId,
      accountId,
      phone: normalizedTo,
      messageText: text,
      context: {
        kind: "account_test_send",
        accountId,
      },
    });

    logger.info(
      { tenantId, accountId, to: normalizedTo, mode, simulated: result.simulatedOutbound },
      "whatsapp_account_test_send_processed",
    );

    return {
      mode,
      simulated: result.simulatedOutbound,
      provider: result.provider,
      providerMessageId: result.providerMessageId ?? null,
      providerStatusCode: result.providerStatusCode ?? null,
      providerError: result.providerError ?? null,
    };
  },
};

function validateRequired(input: UpsertWhatsappAccountInput): void {
  if (!input.phoneNumberId?.trim()) throw new Error("WHATSAPP_PHONE_NUMBER_ID_REQUIRED");
  if (!input.businessAccountId?.trim()) throw new Error("WHATSAPP_BUSINESS_ACCOUNT_ID_REQUIRED");
  if (!input.accessToken?.trim()) throw new Error("WHATSAPP_ACCESS_TOKEN_REQUIRED");
  if (!input.verifyToken?.trim()) throw new Error("WHATSAPP_VERIFY_TOKEN_REQUIRED");
}

function sanitize<T extends { accessToken: string }>(row: T): Omit<T, "accessToken"> & {
  accessTokenConfigured: boolean;
} {
  const { accessToken: _hidden, ...rest } = row;
  return {
    ...rest,
    accessTokenConfigured: Boolean(_hidden?.trim()),
  };
}
