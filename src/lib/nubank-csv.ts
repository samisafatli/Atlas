import { motherTransactionType } from "./personal-rules";
import type { TransactionType } from "./transaction-types";
import { rdbTransactionType, isDebitPurchaseRefund } from "./transaction-types";
export type ImportSource = "CREDIT_CARD" | "BANK_STATEMENT";
export const sourceLabels = {
  CREDIT_CARD: "Fatura de cartão",
  BANK_STATEMENT: "Extrato da conta (débito, Pix e receitas)",
};
export type ImportedTransaction = {
  date: string;
  description: string;
  amountCents: string;
  type: TransactionType;
  sourceType: ImportSource;
  externalId: string | null;
};

function parseRows(input: string): string[][] {
  const delimiter = input.split(/\r?\n/, 1)[0]?.includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"' && quoted && input[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field || row.length) {
    row.push(field);
    if (row.some((cell) => cell.trim())) rows.push(row);
  }
  if (quoted) throw new Error("CSV inválido: aspas não fechadas.");
  return rows;
}

function normalizeHeader(header: string) {
  return header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

// Profiles other than the owner's parse without his personal arrangements.
export type ParseOptions = { personalRules?: boolean };

export function bankTransactionType(
  description: string,
  amount: bigint,
  personalRules = true,
): TransactionType {
  if (amount > 0n && isDebitPurchaseRefund(description)) return "REFUND";
  const mother = personalRules
    ? motherTransactionType(description, amount < 0n)
    : null;
  if (mother) return mother;
  const investment = rdbTransactionType(description, amount < 0n);
  if (investment) return investment;
  const normalized = normalizeHeader(description).replace(/\s+/g, " ");
  return amount < 0n &&
    /^(pagamento (de |da )?fatura|pagamento de cartao)(\b|$)/.test(normalized)
    ? "TRANSFER"
    : amount < 0n
      ? "EXPENSE"
      : "INCOME";
}

function parseDate(value: string) {
  const text = value.trim();
  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = br
    ? new Date(Date.UTC(Number(br[3]), Number(br[2]) - 1, Number(br[1]), 12))
    : iso
      ? new Date(
          Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12),
        )
      : null;
  return date &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) ===
      (br
        ? `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`
        : iso?.[0].slice(0, 10))
    ? date.toISOString().slice(0, 10)
    : null;
}

function parseAmount(value: string) {
  let text = value
    .trim()
    .replace(/R\$|\s/gi, "")
    .replace(/−/g, "-");
  const negative =
    text.startsWith("-") || (text.startsWith("(") && text.endsWith(")"));
  text = text.replace(/[()]/g, "").replace(/^[+-]/, "");
  if (text.includes(",")) text = text.replace(/\./g, "").replace(",", ".");
  const match = text.match(/^(\d{1,12})(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const amount =
    BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  if (amount <= 0n) return null;
  return amount * (negative ? -1n : 1n);
}

export function parseNubankCsv(
  contents: string,
  { personalRules = true }: ParseOptions = {},
): ImportedTransaction[] {
  const [headers, ...rows] = parseRows(contents);
  if (!headers) throw new Error("O arquivo CSV está vazio.");
  const normalized = headers.map(normalizeHeader);
  const sourceType: ImportSource =
    normalized.includes("title") &&
    normalized.includes("amount") &&
    normalized.includes("date")
      ? "CREDIT_CARD"
      : normalized.includes("descricao") &&
          normalized.includes("valor") &&
          normalized.includes("data")
        ? "BANK_STATEMENT"
        : (() => {
            throw new Error(
              "Formato desconhecido. Use a fatura Nubank (date,title,amount) ou o extrato da conta (Data,Valor,Descrição). Nenhuma linha foi importada.",
            );
          })();
  const dateIndex = normalized.findIndex((header) =>
    ["data", "date"].includes(header),
  );
  const amountIndex = normalized.findIndex((header) =>
    ["valor", "amount"].includes(header),
  );
  const descriptionIndex = normalized.findIndex((header) =>
    ["descricao", "description", "title"].includes(header),
  );
  if (dateIndex < 0 || amountIndex < 0 || descriptionIndex < 0)
    throw new Error(
      "Não encontrei as colunas de data, valor e descrição do CSV do Nubank.",
    );

  const idIndex = normalized.indexOf("identificador");
  return rows.map((row, index) => {
    const date = parseDate(row[dateIndex] ?? "");
    const amount = parseAmount(row[amountIndex] ?? "");
    const description = (row[descriptionIndex] ?? "").trim();
    if (
      row.length !== headers.length ||
      !date ||
      amount === null ||
      !description ||
      description.length > 300
    )
      throw new Error(
        `Linha ${index + 2} inválida: confira data, descrição e valor. Nenhuma linha foi descartada silenciosamente.`,
      );
    const normalizedDescription = normalizeHeader(description).replace(
      /\s+/g,
      " ",
    );
    const type: TransactionType =
      sourceType === "CREDIT_CARD"
        ? amount > 0n
          ? "EXPENSE"
          : normalizedDescription === "pagamento recebido"
            ? "TRANSFER"
            : "REFUND"
        : bankTransactionType(description, amount, personalRules);
    return {
      date,
      description,
      amountCents: (amount < 0n ? -amount : amount).toString(),
      type,
      sourceType,
      externalId: idIndex >= 0 ? row[idIndex].trim() || null : null,
    };
  });
}
