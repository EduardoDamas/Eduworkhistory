import { logger } from "../../../lib/logger.js";
import type { LegacyAdapter, LegacyAdapterResult, LegacyOrderExportContract } from "../legacy.types.js";

export const mockAdapter: LegacyAdapter = {
  async exportOrder(payload: LegacyOrderExportContract): Promise<LegacyAdapterResult> {
    logger.info({ payload }, "legacy_generic_mock_export");
    return {
      ok: true,
      adapter: "MOCK",
      message: "Mock export completed",
      exportedAt: new Date().toISOString(),
    };
  },
};
