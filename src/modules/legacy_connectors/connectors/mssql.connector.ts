import sql from "mssql";
import type { LegacyConnectionConfig } from "@prisma/client";
import { env } from "../../../config/env.js";
import type { LegacyConnector } from "../legacy-connector.types.js";
import { resolveLegacySqlMap, quoteMssqlIdent } from "../legacy-sql-schema.js";

function poolConfig(config: LegacyConnectionConfig): sql.config {
  const ms = env.LEGACY_DB_TIMEOUT_MS;
  return {
    server: config.host,
    port: config.port,
    database: config.databaseName,
    user: config.username,
    password: config.password,
    connectionTimeout: ms,
    requestTimeout: ms,
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
  };
}

export async function pingMssqlConnection(config: LegacyConnectionConfig): Promise<{ ok: boolean; message?: string }> {
  let pool: sql.ConnectionPool | undefined;
  try {
    pool = await sql.connect(poolConfig(config));
    await pool.request().query("SELECT 1 AS x");
    await pool.close();
    return { ok: true };
  } catch (err) {
    if (pool) await pool.close().catch(() => undefined);
    return { ok: false, message: err instanceof Error ? err.message : "LEGACY_MSSQL_PING_FAILED" };
  }
}

export const mssqlConnector: LegacyConnector = {
  async sendOrder({ payload, config, mode }) {
    if (mode !== "live") {
      return {
        ok: true,
        source: "MSSQL",
        dryRun: true,
        response: {
          message: "MSSQL dry-run export",
          orderId: payload.orderId,
        },
      };
    }
    if (!config || !config.enabled) {
      throw new Error("LEGACY_MSSQL_CONFIG_MISSING_OR_DISABLED");
    }
    if (config.dryRun) {
      return {
        ok: true,
        source: "MSSQL",
        dryRun: true,
        response: { message: "MSSQL tenant dry-run flag", orderId: payload.orderId },
      };
    }

    const map = resolveLegacySqlMap(config.options);
    const tOrders = quoteMssqlIdent(map.ordersTable);
    const tItems = quoteMssqlIdent(map.itemsTable);
    const cExt = quoteMssqlIdent(map.orderExternalId);
    const cName = quoteMssqlIdent(map.customerName);
    const cPhone = quoteMssqlIdent(map.customerPhone);
    const cTotal = quoteMssqlIdent(map.total);
    const cStatus = quoteMssqlIdent(map.status);
    const iRef = quoteMssqlIdent(map.itemOrderRef);
    const iName = quoteMssqlIdent(map.itemProductName);
    const iQty = quoteMssqlIdent(map.itemQuantity);
    const iPrice = quoteMssqlIdent(map.itemUnitPrice);

    const pool = await sql.connect(poolConfig(config));
    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();

      const existsReq = new sql.Request(transaction);
      existsReq.input("extId", sql.NVarChar(512), payload.externalOrderId);
      const existsResult = await existsReq.query(
        `SELECT COUNT(1) AS c FROM ${tOrders} WITH (UPDLOCK, HOLDLOCK) WHERE ${cExt} = @extId`,
      );
      const count = Number((existsResult.recordset?.[0] as { c?: number } | undefined)?.c ?? 0);
      if (count > 0) {
        await transaction.rollback();
        await pool.close();
        return {
          ok: true,
          source: "MSSQL",
          dryRun: false,
          response: { alreadyExists: true, externalOrderId: payload.externalOrderId },
        };
      }

      const insOrder = new sql.Request(transaction);
      insOrder.input("extId", sql.NVarChar(512), payload.externalOrderId);
      insOrder.input("custName", sql.NVarChar(2000), payload.customer.name ?? "");
      insOrder.input("custPhone", sql.NVarChar(256), payload.customer.phone ?? "");
      insOrder.input("total", sql.Decimal(12, 2), payload.total);
      insOrder.input("status", sql.NVarChar(128), payload.status);
      await insOrder.query(
        `INSERT INTO ${tOrders} (${cExt}, ${cName}, ${cPhone}, ${cTotal}, ${cStatus}) VALUES (@extId, @custName, @custPhone, @total, @status)`,
      );

      for (const item of payload.items) {
        const insItem = new sql.Request(transaction);
        insItem.input("ref", sql.NVarChar(512), payload.externalOrderId);
        insItem.input("name", sql.NVarChar(512), item.name);
        insItem.input("qty", sql.Int, item.quantity);
        insItem.input("unitPrice", sql.Decimal(12, 2), item.unitPrice ?? null);
        await insItem.query(
          `INSERT INTO ${tItems} (${iRef}, ${iName}, ${iQty}, ${iPrice}) VALUES (@ref, @name, @qty, @unitPrice)`,
        );
      }

      await transaction.commit();
      await pool.close();

      return {
        ok: true,
        source: "MSSQL",
        dryRun: false,
        response: {
          message: "MSSQL export committed",
          orderId: payload.orderId,
          externalOrderId: payload.externalOrderId,
          tables: { orders: map.ordersTable, items: map.itemsTable },
        },
      };
    } catch (err) {
      await transaction.rollback().catch(() => undefined);
      if (pool) await pool.close().catch(() => undefined);
      throw err;
    }
  },
};
