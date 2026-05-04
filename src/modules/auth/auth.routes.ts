import { Router } from "express";
import { authController } from "./auth.controller.js";

export function createAuthRoutes(): Router {
  const router = Router();
  router.post("/register", (req, res) => void authController.register(req, res));
  router.post("/login", (req, res) => void authController.login(req, res));
  return router;
}
