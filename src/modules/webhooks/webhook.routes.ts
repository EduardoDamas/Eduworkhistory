import { Router } from "express";
import { webhookController } from "./webhook.controller.js";

export function createWebhookRoutes(): Router {
  const r = Router();

  r.get("/whatsapp", (req, res) => void webhookController.verifyWhatsapp(req, res));
  r.post("/whatsapp", (req, res) => void webhookController.handle("whatsapp", req, res));
  r.post("/ifood", (req, res) => void webhookController.handle("ifood", req, res));
  r.post("/99food", (req, res) => void webhookController.handle("99food", req, res));

  return r;
}
