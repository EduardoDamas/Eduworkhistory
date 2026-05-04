import { whatsappAccountRepository } from "../../whatsapp_accounts/whatsapp-account.repository.js";
import { whatsappCloudClient, WhatsAppCloudError } from "./whatsapp-cloud-client.js";

export const whatsappCloudService = {
  async sendTextForTenant(input: {
    tenantId: string;
    to: string;
    messageText: string;
  }): Promise<{
    responseRaw: unknown;
    phoneNumberId: string;
    providerMessageId?: string;
    providerStatusCode: number;
  }> {
    const account = await whatsappAccountRepository.findActiveByTenant(input.tenantId);
    if (!account) throw new Error("WHATSAPP_ACTIVE_ACCOUNT_NOT_FOUND");
    if (!account.phoneNumberId?.trim()) throw new Error("WHATSAPP_PHONE_NUMBER_ID_REQUIRED");
    if (!account.accessToken?.trim()) throw new Error("WHATSAPP_ACCESS_TOKEN_REQUIRED");

    const response = await whatsappCloudClient.sendText({
      phoneNumberId: account.phoneNumberId,
      accessToken: account.accessToken,
      to: input.to,
      messageText: input.messageText,
    });

    return {
      responseRaw: response.raw,
      phoneNumberId: account.phoneNumberId,
      providerMessageId: response.providerMessageId,
      providerStatusCode: response.statusCode,
    };
  },

  async sendTextForAccount(input: {
    tenantId: string;
    accountId: string;
    to: string;
    messageText: string;
  }): Promise<{
    responseRaw: unknown;
    phoneNumberId: string;
    providerMessageId?: string;
    providerStatusCode: number;
  }> {
    const account = await whatsappAccountRepository.findByIdInTenant(input.tenantId, input.accountId);
    if (!account) throw new Error("WHATSAPP_ACCOUNT_NOT_FOUND");
    if (!account.isActive) throw new Error("WHATSAPP_ACCOUNT_INACTIVE");
    if (!account.phoneNumberId?.trim()) throw new Error("WHATSAPP_PHONE_NUMBER_ID_REQUIRED");
    if (!account.accessToken?.trim()) throw new Error("WHATSAPP_ACCESS_TOKEN_REQUIRED");

    const response = await whatsappCloudClient.sendText({
      phoneNumberId: account.phoneNumberId,
      accessToken: account.accessToken,
      to: input.to,
      messageText: input.messageText,
    });

    return {
      responseRaw: response.raw,
      phoneNumberId: account.phoneNumberId,
      providerMessageId: response.providerMessageId,
      providerStatusCode: response.statusCode,
    };
  },
};

export { WhatsAppCloudError };
