import type { Request, Response } from "express";
import { logger } from "../../lib/logger.js";
import { InboundEnqueueError } from "../jobs/inbound-event.queue.js";
import { webhookService, WebhookValidationError } from "./webhook.service.js";
import type { WebhookSourcePath } from "./webhook.types.js";

export const webhookController = {
  async verifyWhatsapp(req: Request, res: Response): Promise<void> {
    const mode = req.query["hub.mode"];
    const verifyToken = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    const value = await webhookService.verifyWhatsAppWebhook(
      typeof mode === "string" ? mode : undefined,
      typeof verifyToken === "string" ? verifyToken : undefined,
      typeof challenge === "string" ? challenge : undefined,
    );
    if (!value) {
      res.status(403).send("forbidden");
      return;
    }
    res.status(200).type("text/plain").send(value);
  },

  async handle(path: WebhookSourcePath, req: Request, res: Response): Promise<void> {
    try {
      const result = await webhookService.handleWebhook(path, req);
      res.status(200).json(result);
    } catch (err) {
      if (err instanceof WebhookValidationError) {
        res.status(err.statusCode).json({ ok: false, error: err.message });
        return;
      }
      if (err instanceof InboundEnqueueError) {
        logger.error({ err, path }, "webhook_enqueue_failed");
        res.status(503).json({ ok: false, error: "Temporary failure accepting event" });
        return;
      }
      logger.error({ err, path }, "webhook_unhandled_error");
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  },

  async handleTwilioWhatsapp(req: Request, res: Response): Promise<void> {
    try {
      const result = webhookService.handleTwilioWhatsapp(req.body);
      // Twilio retries aggressively; acknowledge fast.
      res.status(200).json(result);
    } catch (err) {
      logger.error({ err }, "twilio_webhook_unhandled_error");
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  },
};
