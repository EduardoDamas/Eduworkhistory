import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { getAuthenticatedUser } from "../auth/middleware.js";
import { whatsappAccountRepository } from "../whatsapp_accounts/whatsapp-account.repository.js";

export const integrationsController = {
  async health(req: Request, res: Response): Promise<void> {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (authUser.role !== "OWNER" && authUser.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const tenantAccount = await whatsappAccountRepository.findActiveByTenant(authUser.tenantId);
    const twilioFrom = tenantAccount?.whatsappFrom || env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";

    res.json({
      ifood: {
        enabled: env.IFOOD_ENABLED,
        clientIdConfigured: env.IFOOD_CLIENT_ID.length > 0,
        clientSecretConfigured: env.IFOOD_CLIENT_SECRET.length > 0,
        merchantIdConfigured: env.IFOOD_MERCHANT_ID.length > 0,
      },
      twilio: {
        enabled: tenantAccount ? true : env.TWILIO_ENABLED,
        accountSidConfigured: Boolean(tenantAccount?.accountSid?.trim() || env.TWILIO_ACCOUNT_SID.length > 0),
        authTokenConfigured: Boolean(tenantAccount?.authToken?.trim() || env.TWILIO_AUTH_TOKEN.length > 0),
        whatsappFromConfigured: Boolean(tenantAccount?.whatsappFrom?.trim() || env.TWILIO_WHATSAPP_FROM.length > 0),
        whatsappToConfigured: env.TWILIO_WHATSAPP_TO.length > 0,
        sandboxJoinCodeConfigured: Boolean(tenantAccount?.sandboxJoinCode?.trim() || env.TWILIO_SANDBOX_JOIN_CODE.length > 0),
        sandboxFrom: twilioFrom,
        credentialsSource: tenantAccount ? "tenant" : "env_fallback",
      },
      testMode: env.MARKETPLACE_TEST_MODE,
    });
  },
};
