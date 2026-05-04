import { Router } from "express";
import { customerController } from "./customer.controller.js";

export function createCustomerRoutes(): Router {
  const r = Router();
  r.get("/", (req, res) => void customerController.list(req, res));
  r.post("/", (req, res) => void customerController.create(req, res));
  return r;
}
