import { logger } from "../../../lib/logger.js";
import type { LegacyAdapter, LegacyAdapterResult, LegacyOrderExportContract } from "../legacy.types.js";

export const firebirdAdapter: LegacyAdapter = {
  async exportOrder(payload: LegacyOrderExportContract): Promise<LegacyAdapterResult> {
    logger.info(
      { orderId: payload.orderId, tenantId: payload.tenantId, payload },
      "legacy_firebird_mock_export",
    );
    return {
      ok: true,
      adapter: "FIREBIRD",
      message: "Mock export completed (no real Firebird connection)",
      exportedAt: new Date().toISOString(),
    };
  },
};
