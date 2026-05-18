import { logger } from "../../lib/logger.js";
import { sendWhatsAppText } from "../whatsapp/outbound.service.js";
import { whatsappAccountRepository } from "./whatsapp-account.repository.js";

export type UpsertWhatsappAccountInput = {
  accountSid: string;
  authToken: string;
  whatsappFrom: string;
  sandboxJoinCode?: string | null;
  isActive?: boolean;
};

export const whatsappAccountService = {
  async createOrUpdateForTenant(tenantId: string, input: UpsertWhatsappAccountInput) {
    validateRequired(input);
    const row = await whatsappAccountRepository.upsertForTenant(tenantId, {
      accountSid: input.accountSid.trim(),
      authToken: input.authToken.trim(),
      whatsappFrom: normalizeWhatsappAddress(input.whatsappFrom),
      sandboxJoinCode: input.sandboxJoinCode?.trim() || null,
      isActive: input.isActive ?? true,
    });
    logger.info(
      { tenantId, accountId: row.id, accountSid: row.accountSid, whatsappFrom: row.whatsappFrom, isActive: row.isActive },
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
    if (typeof input.accountSid === "string") patch.accountSid = input.accountSid.trim();
    if (typeof input.authToken === "string") patch.authToken = input.authToken.trim();
    if (typeof input.whatsappFrom === "string")
      patch.whatsappFrom = normalizeWhatsappAddress(input.whatsappFrom);
    if (input.sandboxJoinCode !== undefined)
      patch.sandboxJoinCode = input.sandboxJoinCode?.trim() || null;
    if (typeof input.isActive === "boolean") patch.isActive = input.isActive;

    const row = await whatsappAccountRepository.updateById(tenantId, id, patch);
    logger.info(
      { tenantId, accountId: row.id, accountSid: row.accountSid, whatsappFrom: row.whatsappFrom, isActive: row.isActive },
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
    if (!account.isActive) throw new Error("WHATSAPP_ACCOUNT_INACTIVE");

    const normalizedTo = input.to.trim();
    const text = input.message.trim();
    const result = await sendWhatsAppText({
      tenantId,
      accountId,
      accountSid: account.accountSid,
      authToken: account.authToken,
      whatsappFrom: account.whatsappFrom,
      phone: normalizedTo,
      messageText: text,
      context: {
        kind: "account_test_send",
        accountId,
      },
    });

    logger.info(
      { tenantId, accountId, to: normalizedTo, simulated: result.simulatedOutbound },
      "whatsapp_account_test_send_processed",
    );

    return {
      simulated: result.simulatedOutbound,
      provider: result.provider,
      providerMessageId: result.providerMessageId ?? null,
      providerStatusCode: result.providerStatusCode ?? null,
      providerError: result.providerError ?? null,
    };
  },
};

function validateRequired(input: UpsertWhatsappAccountInput): void {
  if (!input.accountSid?.trim()) throw new Error("WHATSAPP_ACCOUNT_SID_REQUIRED");
  if (!input.authToken?.trim()) throw new Error("WHATSAPP_AUTH_TOKEN_REQUIRED");
  if (!input.whatsappFrom?.trim()) throw new Error("WHATSAPP_FROM_REQUIRED");
}

function normalizeWhatsappAddress(value: string): string {
  const v = value.trim().toLowerCase();
  return v.startsWith("whatsapp:") ? v : `whatsapp:${v}`;
}

function sanitize<T extends { authToken: string }>(row: T): Omit<T, "authToken"> & {
  authTokenConfigured: boolean;
} {
  const { authToken: _hidden, ...rest } = row;
  return {
    ...rest,
    authTokenConfigured: Boolean(_hidden?.trim()),
  };
}
