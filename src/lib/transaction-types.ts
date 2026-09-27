export const transactionTypes = [
  "INCOME",
  "EXPENSE",
  "REFUND",
  "TRANSFER",
] as const;
export type TransactionType = (typeof transactionTypes)[number];
export const typeLabels: Record<string, string> = {
  INCOME: "Receita",
  EXPENSE: "Despesa",
  REFUND: "Crédito / estorno",
  TRANSFER: "Transferência / pagamento de fatura",
};
export function categoryType(type: string) {
  return type === "REFUND" ? "EXPENSE" : type === "TRANSFER" ? null : type;
}
export function resultAmount(type: string, cents: bigint) {
  return type === "INCOME" || type === "REFUND"
    ? cents
    : type === "EXPENSE"
      ? -cents
      : 0n;
}
export function expenseAmount(type: string, cents: bigint) {
  return type === "EXPENSE" ? cents : type === "REFUND" ? -cents : 0n;
}
export function transactionSign(type: string) {
  return type === "TRANSFER" ? "↔ " : type === "EXPENSE" ? "− " : "+ ";
}
