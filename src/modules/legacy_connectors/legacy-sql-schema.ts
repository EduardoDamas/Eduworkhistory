import type { Prisma } from "@prisma/client";

export type LegacyTableColumnMap = {
  ordersTable: string;
  itemsTable: string;
  orderExternalId: string;
  customerName: string;
  customerPhone: string;
  total: string;
  status: string;
  /** FK / denormalized ref on items row pointing to same logical order as header */
  itemOrderRef: string;
  itemProductName: string;
  itemQuantity: string;
  itemUnitPrice: string;
};

const DEFAULTS: LegacyTableColumnMap = {
  ordersTable: "PEDIDOS",
  itemsTable: "PEDIDO_ITENS",
  orderExternalId: "EXTERNAL_ORDER_ID",
  customerName: "CUSTOMER_NAME",
  customerPhone: "CUSTOMER_PHONE",
  total: "TOTAL",
  status: "STATUS",
  itemOrderRef: "ORDER_REF",
  itemProductName: "ITEM_NAME",
  itemQuantity: "QTY",
  itemUnitPrice: "UNIT_PRICE",
};

/** Allow unquoted Firebird / bracketed MSSQL identifiers: letters, digits, underscore. */
export function assertSqlIdentifier(name: string, label: string): string {
  const trimmed = name.trim();
  if (!trimmed || !/^[A-Za-z0-9_]+$/.test(trimmed)) {
    throw new Error(`INVALID_SQL_IDENTIFIER:${label}`);
  }
  return trimmed;
}

export function quoteMssqlIdent(name: string): string {
  const safe = assertSqlIdentifier(name, "mssql_identifier");
  return `[${safe}]`;
}

export function resolveLegacySqlMap(options: Prisma.JsonValue | null | undefined): LegacyTableColumnMap {
  const base = { ...DEFAULTS };
  if (!options || typeof options !== "object" || Array.isArray(options)) return base;
  const root = options as Record<string, unknown>;
  const tables = root.tables as Record<string, unknown> | undefined;
  const columns = root.columns as Record<string, unknown> | undefined;
  if (tables && typeof tables === "object" && !Array.isArray(tables)) {
    if (typeof tables.orders === "string") base.ordersTable = tables.orders;
    if (typeof tables.items === "string") base.itemsTable = tables.items;
  }
  if (columns && typeof columns === "object" && !Array.isArray(columns)) {
    if (typeof columns.orderExternalId === "string") base.orderExternalId = columns.orderExternalId;
    if (typeof columns.customerName === "string") base.customerName = columns.customerName;
    if (typeof columns.customerPhone === "string") base.customerPhone = columns.customerPhone;
    if (typeof columns.total === "string") base.total = columns.total;
    if (typeof columns.status === "string") base.status = columns.status;
    const itemCols = columns.items as Record<string, unknown> | undefined;
    if (itemCols && typeof itemCols === "object" && !Array.isArray(itemCols)) {
      if (typeof itemCols.orderFk === "string") base.itemOrderRef = itemCols.orderFk;
      if (typeof itemCols.productName === "string") base.itemProductName = itemCols.productName;
      if (typeof itemCols.quantity === "string") base.itemQuantity = itemCols.quantity;
      if (typeof itemCols.unitPrice === "string") base.itemUnitPrice = itemCols.unitPrice;
    }
  }
  return {
    ordersTable: assertSqlIdentifier(base.ordersTable, "tables.orders"),
    itemsTable: assertSqlIdentifier(base.itemsTable, "tables.items"),
    orderExternalId: assertSqlIdentifier(base.orderExternalId, "columns.orderExternalId"),
    customerName: assertSqlIdentifier(base.customerName, "columns.customerName"),
    customerPhone: assertSqlIdentifier(base.customerPhone, "columns.customerPhone"),
    total: assertSqlIdentifier(base.total, "columns.total"),
    status: assertSqlIdentifier(base.status, "columns.status"),
    itemOrderRef: assertSqlIdentifier(base.itemOrderRef, "columns.items.orderFk"),
    itemProductName: assertSqlIdentifier(base.itemProductName, "columns.items.productName"),
    itemQuantity: assertSqlIdentifier(base.itemQuantity, "columns.items.quantity"),
    itemUnitPrice: assertSqlIdentifier(base.itemUnitPrice, "columns.items.unitPrice"),
  };
}
