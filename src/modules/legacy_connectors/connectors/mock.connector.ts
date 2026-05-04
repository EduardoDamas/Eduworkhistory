import type { LegacyConnector } from "../legacy-connector.types.js";

export const mockLegacyConnector: LegacyConnector = {
  async sendOrder({ payload }) {
    return {
      ok: true,
      source: "MOCK",
      dryRun: false,
      response: {
        message: "Mock connector export success",
        orderId: payload.orderId,
        exportedAt: new Date().toISOString(),
      },
    };
  },
};
