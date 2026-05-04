import type { LegacyConnectionConfig, LegacyExportAttempt, LegacyExportSource } from "@prisma/client";
import type { LegacyOrderExportContract } from "../legacy_integrations/legacy.types.js";

export type LegacyExportMode = "mock" | "dry-run" | "live";

export type LegacyConnectorResult = {
  ok: boolean;
  source: LegacyExportSource;
  dryRun: boolean;
  response: Record<string, unknown>;
};

export interface LegacyConnector {
  sendOrder(input: {
    payload: LegacyOrderExportContract;
    config: LegacyConnectionConfig | null;
    mode: LegacyExportMode;
  }): Promise<LegacyConnectorResult>;
}

export type ExportOrderInput = {
  tenantId: string;
  orderId: string;
};

export type RetryAttemptInput = {
  attemptId: string;
  tenantId: string;
  orderId: string;
  source: LegacyExportSource;
};

export type ExportProcessResult = {
  attempt: LegacyExportAttempt;
  scheduledRetry: boolean;
  skippedAlreadySuccess?: boolean;
};
