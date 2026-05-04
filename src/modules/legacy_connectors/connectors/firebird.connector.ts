import type { LegacyConnectionConfig } from "@prisma/client";
import { env } from "../../../config/env.js";
import { logger } from "../../../lib/logger.js";
import type { LegacyConnector } from "../legacy-connector.types.js";
import { resolveLegacySqlMap } from "../legacy-sql-schema.js";

type FirebirdModule = typeof import("node-firebird");
type FirebirdDb = import("node-firebird").Database;
type FirebirdTransaction = import("node-firebird").Transaction;

async function loadFirebird(): Promise<FirebirdModule | null> {
  try {
    return await import("node-firebird");
  } catch (err) {
    logger.warn({ err }, "legacy_firebird_module_not_available");
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function attachDb(Firebird: FirebirdModule, options: Record<string, unknown>): Promise<FirebirdDb> {
  return new Promise((resolve, reject) => {
    Firebird.attach(options as never, (err: unknown, db: FirebirdDb) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

function beginTx(Firebird: FirebirdModule, db: FirebirdDb): Promise<FirebirdTransaction> {
  return new Promise((resolve, reject) => {
    db.transaction(Firebird.ISOLATION_READ_COMMITTED, (err: unknown, tx: FirebirdTransaction) => {
      if (err) reject(err);
      else resolve(tx);
    });
  });
}

function txQuery(tx: FirebirdTransaction, sql: string, params: unknown[]): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    tx.query(sql, params, (err: unknown, result: unknown[]) => {
      if (err) reject(err);
      else resolve(result ?? []);
    });
  });
}

function txCommit(tx: FirebirdTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.commit((err: unknown) => (err ? reject(err) : resolve()));
  });
}

function txRollback(tx: FirebirdTransaction): Promise<void> {
  return new Promise((resolve) => {
    tx.rollback(() => resolve());
  });
}

function dbDetach(db: FirebirdDb): Promise<void> {
  return new Promise((resolve) => {
    db.detach(() => resolve());
  });
}

function buildAttachOptions(config: LegacyConnectionConfig): Record<string, unknown> {
  return {
    host: config.host,
    port: config.port,
    database: config.databaseName,
    user: config.username,
    password: config.password,
    lowercase_keys: true,
  };
}

export async function pingFirebirdConnection(config: LegacyConnectionConfig): Promise<{ ok: boolean; message?: string }> {
  const Firebird = await loadFirebird();
  if (!Firebird) return { ok: false, message: "NOT_CONFIGURED" };
  const ms = env.LEGACY_DB_TIMEOUT_MS;
  let db: FirebirdDb | undefined;
  try {
    db = await withTimeout(attachDb(Firebird, buildAttachOptions(config)), ms, "LEGACY_FIREBIRD_TIMEOUT");
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("LEGACY_FIREBIRD_TIMEOUT")), ms);
      db!.query("SELECT 1 AS X FROM RDB$DATABASE", [], (err: unknown) => {
        clearTimeout(t);
        if (err) reject(err);
        else resolve();
      });
    });
    await dbDetach(db);
    return { ok: true };
  } catch (err) {
    if (db) await dbDetach(db).catch(() => undefined);
    return { ok: false, message: err instanceof Error ? err.message : "LEGACY_FIREBIRD_PING_FAILED" };
  }
}

export const firebirdConnector: LegacyConnector = {
  async sendOrder({ payload, config, mode }) {
    if (mode !== "live") {
      return {
        ok: true,
        source: "FIREBIRD",
        dryRun: true,
        response: {
          message: "Firebird dry-run export",
          orderId: payload.orderId,
        },
      };
    }
    if (!config || !config.enabled) {
      throw new Error("LEGACY_FIREBIRD_CONFIG_MISSING_OR_DISABLED");
    }
    if (config.dryRun) {
      return {
        ok: true,
        source: "FIREBIRD",
        dryRun: true,
        response: { message: "Firebird tenant dry-run flag", orderId: payload.orderId },
      };
    }

    const Firebird = await loadFirebird();
    if (!Firebird) {
      throw new Error("LEGACY_FIREBIRD_NOT_CONFIGURED");
    }

    const map = resolveLegacySqlMap(config.options);
    const ms = env.LEGACY_DB_TIMEOUT_MS;
    let db: FirebirdDb | undefined;
    let tx: FirebirdTransaction | undefined;
    try {
      db = await withTimeout(attachDb(Firebird, buildAttachOptions(config)), ms, "LEGACY_FIREBIRD_TIMEOUT");
      tx = await withTimeout(beginTx(Firebird, db), ms, "LEGACY_FIREBIRD_TIMEOUT");

      const existsSql = `SELECT COUNT(*) AS C FROM ${map.ordersTable} WHERE ${map.orderExternalId} = ?`;
      const existsRows = (await withTimeout(txQuery(tx, existsSql, [payload.externalOrderId]), ms, "LEGACY_FIREBIRD_TIMEOUT")) as {
        c?: number;
        C?: number;
      }[];
      const count = Number(existsRows[0]?.c ?? existsRows[0]?.C ?? 0);
      if (count > 0) {
        await txRollback(tx);
        await dbDetach(db);
        return {
          ok: true,
          source: "FIREBIRD",
          dryRun: false,
          response: { alreadyExists: true, externalOrderId: payload.externalOrderId },
        };
      }

      const insertOrderSql = `INSERT INTO ${map.ordersTable} (${map.orderExternalId}, ${map.customerName}, ${map.customerPhone}, ${map.total}, ${map.status}) VALUES (?, ?, ?, ?, ?)`;
      await withTimeout(
        txQuery(tx, insertOrderSql, [
          payload.externalOrderId,
          payload.customer.name ?? "",
          payload.customer.phone ?? "",
          payload.total,
          payload.status,
        ]),
        ms,
        "LEGACY_FIREBIRD_TIMEOUT",
      );

      const insertItemSql = `INSERT INTO ${map.itemsTable} (${map.itemOrderRef}, ${map.itemProductName}, ${map.itemQuantity}, ${map.itemUnitPrice}) VALUES (?, ?, ?, ?)`;
      for (const item of payload.items) {
        await withTimeout(
          txQuery(tx, insertItemSql, [
            payload.externalOrderId,
            item.name,
            item.quantity,
            item.unitPrice ?? null,
          ]),
          ms,
          "LEGACY_FIREBIRD_TIMEOUT",
        );
      }

      await withTimeout(txCommit(tx), ms, "LEGACY_FIREBIRD_TIMEOUT");
      tx = undefined;
      await dbDetach(db);
      db = undefined;

      return {
        ok: true,
        source: "FIREBIRD",
        dryRun: false,
        response: {
          message: "Firebird export committed",
          orderId: payload.orderId,
          externalOrderId: payload.externalOrderId,
          tables: { orders: map.ordersTable, items: map.itemsTable },
        },
      };
    } catch (err) {
      if (tx) await txRollback(tx).catch(() => undefined);
      if (db) await dbDetach(db).catch(() => undefined);
      throw err;
    }
  },
};
