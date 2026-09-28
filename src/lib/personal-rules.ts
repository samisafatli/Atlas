import type { TransactionType } from "./transaction-types";

export function normalizedDescription(description: string) {
  return description
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// These rules express the owner's confirmed arrangements, not bank semantics.
// Only bank statements use them; card merchants must not inherit these rules.
export function motherTransactionType(
  description: string,
  negative: boolean,
): TransactionType | null {
  const text = normalizedDescription(description);
  if (!negative && /\bmouna\b/.test(text)) return "MOTHER_INCOME";
  if (negative && /\b(bap administracao|claro|prevent senior)\b/.test(text))
    return "MOTHER_EXPENSE";
  return null;
}

export function salaryCategory(
  description: string,
  type: string,
  sourceType: string,
) {
  if (type !== "INCOME" || sourceType !== "BANK_STATEMENT") return null;
  const text = normalizedDescription(description);
  if (/\bsafatli technologies\b/.test(text)) return "Salário PJ — Monety";
  if (/\bsami safatli\b/.test(text) && /\bcaixa\b/.test(text))
    return "Salário repassado da Caixa";
  return null;
}

export function utilitySupplier(description: string) {
  const text = normalizedDescription(description);
  if (/\blight\b/.test(text)) return "Light";
  if (/\b(naturgy|ceg)\b/.test(text)) return "Naturgy";
  return null;
}
