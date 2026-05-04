import type { Application } from "express";
import pinoHttp from "pino-http";
import { logger } from "../lib/logger.js";

export function attachHttpLogging(app: Application): void {
  app.use(
    pinoHttp({
      logger,
      customLogLevel: (_req, res, err) => {
        if (res.statusCode >= 500 || err) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
      serializers: {
        req: (req) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          headers: {
            host: req.headers.host,
            "x-api-key": req.headers["x-api-key"] ? "[redacted]" : undefined,
          },
        }),
        res: (res) => ({
          statusCode: res.statusCode,
        }),
      },
    }),
  );
}
