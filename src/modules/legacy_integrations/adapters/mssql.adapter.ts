import { logger } from "../../../lib/logger.js";
import type { LegacyAdapter, LegacyAdapterResult, LegacyOrderExportContract } from "../legacy.types.js";

export const mssqlAdapter: LegacyAdapter = {
  async exportOrder(payload: LegacyOrderExportContract): Promise<LegacyAdapterResult> {
    logger.info(
      { orderId: payload.orderId, tenantId: payload.tenantId, payload },
      "legacy_mssql_mock_export",
    );
    return {
      ok: true,
      adapter: "MSSQL",
      message: "Mock export completed (no real MSSQL connection)",
      exportedAt: new Date().toISOString(),
    };
  },
};
