import { legacyExportService } from "../legacy_connectors/legacy-export.service.js";

export const legacyIntegrationService = {
  async exportOrder(orderId: string, tenantId: string): Promise<void> {
    await legacyExportService.exportOrder({ tenantId, orderId });
  },
};
