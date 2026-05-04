import { Router } from "express";
import { whatsappAccountController } from "./whatsapp-account.controller.js";

export function createWhatsAppAccountRoutes(): Router {
  const r = Router();
  r.post("/", (req, res) => void whatsappAccountController.create(req, res));
  r.get("/", (req, res) => void whatsappAccountController.list(req, res));
  r.patch("/:id", (req, res) => void whatsappAccountController.patch(req, res));
  r.post("/:id/test-send", (req, res) => void whatsappAccountController.testSend(req, res));
  return r;
}
