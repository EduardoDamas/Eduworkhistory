import express, { type Application, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { attachHttpLogging } from "./observability/http-logging.js";
import { tenantAuth } from "./modules/auth/middleware.js";
import { createAuthRoutes } from "./modules/auth/auth.routes.js";
import { createAuthOnboardingRoutes } from "./modules/auth/auth-onboarding.routes.js";
import { createTenantRoutes, createProtectedTenantRoutes } from "./modules/tenants/tenant.routes.js";
import { createCustomerRoutes } from "./modules/customers/customer.routes.js";
import { createOrderRoutes } from "./modules/orders/order.routes.js";
import { createWebhookRoutes } from "./modules/webhooks/webhook.routes.js";
import { createCatalogRoutes } from "./modules/catalog/catalog.routes.js";
import { createWhatsAppAccountRoutes } from "./modules/whatsapp_accounts/whatsapp-account.routes.js";
import { createComandaRoutes } from "./modules/comanda/comanda.routes.js";
import { createProductRoutes } from "./modules/products/product.routes.js";
import { createLegacyRoutes } from "./modules/legacy_connectors/legacy.routes.js";
import { createIntegrationRoutes } from "./modules/integrations/integrations.routes.js";
import { logger } from "./lib/logger.js";

export function createApp(): Application {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "5mb" }));
  attachHttpLogging(app);

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", createAuthRoutes());
  app.use("/tenants", createTenantRoutes());
  app.use("/webhooks", createWebhookRoutes());
  app.use("/saas", tenantAuth, createAuthOnboardingRoutes());

  // Keep auth middleware scoped to protected route groups only.
  app.use("/tenants", tenantAuth, createProtectedTenantRoutes());
  app.use("/customers", tenantAuth, createCustomerRoutes());
  app.use("/orders", tenantAuth, createOrderRoutes());
  app.use("/catalog", tenantAuth, createCatalogRoutes());
  app.use("/products", tenantAuth, createProductRoutes());
  app.use("/whatsapp/accounts", tenantAuth, createWhatsAppAccountRoutes());
  app.use("/comanda", tenantAuth, createComandaRoutes());
  app.use("/legacy", tenantAuth, createLegacyRoutes());
  app.use("/integrations", tenantAuth, createIntegrationRoutes());

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const httpErr = err as { statusCode?: number; status?: number; expose?: boolean; message?: string };
    const status = httpErr?.statusCode ?? httpErr?.status;
    if (typeof status === "number" && status >= 400 && status < 500) {
      const message = httpErr.expose && httpErr.message ? httpErr.message : "Bad request";
      logger.warn({ err }, "client_error");
      res.status(status).json({ error: message });
      return;
    }
    logger.error({ err }, "unhandled_error");
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
