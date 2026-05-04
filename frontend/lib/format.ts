export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function truncateId(id: string, keep = 7): string {
  if (id.length <= keep * 2 + 3) return id;
  return `${id.slice(0, keep)}...${id.slice(-keep)}`;
}

/** Short display id for tables (e.g. ORD-8472 style from tail of id). */
export function orderTableId(id: string): string {
  const tail = id.replace(/\D/g, "").slice(-4) || id.slice(-4);
  return `ORD-${tail.padStart(4, "0")}`;
}

export function orderStatusPt(status: string, statusCode: number): { label: string; tone: "success" | "warning" | "error" | "neutral" } {
  if (status === "ORDER_ACCEPTED" || statusCode === 1) {
    return { label: "SUCESSO", tone: "success" };
  }
  if (status === "FAILED" || status.toLowerCase().includes("fail")) {
    return { label: "FALHA", tone: "error" };
  }
  if (status === "PENDING_CONFIRMATION" || statusCode === 0) {
    return { label: "PENDENTE", tone: "warning" };
  }
  return { label: status.slice(0, 12).toUpperCase(), tone: "neutral" };
}

export function pushStatusPt(status: string): { label: string; tone: "success" | "warning" | "error" } {
  if (status === "SUCCESS") return { label: "SUCESSO", tone: "success" };
  if (status === "FAILED") return { label: "FALHA", tone: "error" };
  return { label: "PENDENTE", tone: "warning" };
}
