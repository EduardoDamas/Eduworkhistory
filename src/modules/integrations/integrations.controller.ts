import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { getAuthenticatedUser } from "../auth/middleware.js";

export const integrationsController = {
  health(req: Request, res: Response): void {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (authUser.role !== "OWNER" && authUser.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    res.json({
      ifood: {
        enabled: env.IFOOD_ENABLED,
        clientIdConfigured: env.IFOOD_CLIENT_ID.length > 0,
        clientSecretConfigured: env.IFOOD_CLIENT_SECRET.length > 0,
        merchantIdConfigured: env.IFOOD_MERCHANT_ID.length > 0,
      },
      twilio: {
        enabled: env.TWILIO_ENABLED,
        accountSidConfigured: env.TWILIO_ACCOUNT_SID.length > 0,
        authTokenConfigured: env.TWILIO_AUTH_TOKEN.length > 0,
        whatsappFromConfigured: env.TWILIO_WHATSAPP_FROM.length > 0,
        whatsappToConfigured: env.TWILIO_WHATSAPP_TO.length > 0,
        sandboxJoinCodeConfigured: env.TWILIO_SANDBOX_JOIN_CODE.length > 0,
        sandboxFrom: env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886",
      },
      testMode: env.MARKETPLACE_TEST_MODE,
    });
  },
};
