export const transactionTypes = [
  "MOTHER_INCOME",
  "MOTHER_EXPENSE",
  "MOTHER_ESTIMATED_EXPENSE",
  "INCOME",
  "EXPENSE",
  "REFUND",
  "TRANSFER",
  "INVESTMENT_DEPOSIT",
  "INVESTMENT_WITHDRAWAL",
] as const;
export type TransactionType = (typeof transactionTypes)[number];
export const typeLabels: Record<string, string> = {
  MOTHER_INCOME: "Mãe — entrada",
  MOTHER_EXPENSE: "Mãe — pagamento",
  MOTHER_ESTIMATED_EXPENSE: "Mãe — pagamento estimado",
  INCOME: "Receita",
  EXPENSE: "Despesa",
  REFUND: "Crédito / estorno",
  TRANSFER: "Transferência / pagamento de fatura",
  INVESTMENT_DEPOSIT: "Aplicação de investimento",
  INVESTMENT_WITHDRAWAL: "Resgate de investimento",
};
export function categoryType(type: string) {
  return type === "REFUND"
    ? "EXPENSE"
    : [
          "TRANSFER",
          "INVESTMENT_DEPOSIT",
          "INVESTMENT_WITHDRAWAL",
          "MOTHER_INCOME",
          "MOTHER_EXPENSE",
          "MOTHER_ESTIMATED_EXPENSE",
        ].includes(type)
      ? null
      : type;
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

export function isDebitPurchaseRefund(description: string) {
  const text = description
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return /^estorno\s*[-–—]\s*(?:ajuste de )?compra no debito(?:\b|$)/.test(
    text,
  );
}
export function transactionSign(type: string) {
  return type === "TRANSFER"
    ? "↔ "
    : [
          "EXPENSE",
          "INVESTMENT_DEPOSIT",
          "MOTHER_EXPENSE",
          "MOTHER_ESTIMATED_EXPENSE",
        ].includes(type)
      ? "− "
      : "+ ";
}

export function rdbTransactionType(
  description: string,
  negative: boolean,
): TransactionType | null {
  const text = description
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
  if (text === "aplicacao rdb" && negative) return "INVESTMENT_DEPOSIT";
  if (text === "resgate rdb" && !negative) return "INVESTMENT_WITHDRAWAL";
  return null;
}
