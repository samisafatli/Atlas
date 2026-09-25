export type ImportedTransaction = {
  date: string;
  description: string;
  amountCents: string;
  type: "INCOME" | "EXPENSE";
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
  return rows;
}

function normalizeHeader(header: string) {
  return header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
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

export function parseNubankCsv(contents: string): ImportedTransaction[] {
  const [headers, ...rows] = parseRows(contents);
  if (!headers) throw new Error("O arquivo CSV está vazio.");
  const normalized = headers.map(normalizeHeader);
  const dateIndex = normalized.findIndex((header) =>
    ["data", "date"].includes(header),
  );
  const amountIndex = normalized.findIndex((header) =>
    ["valor", "amount"].includes(header),
  );
  const descriptionIndex = normalized.findIndex((header) =>
    ["descricao", "description", "identificacao", "title"].includes(header),
  );
  if (dateIndex < 0 || amountIndex < 0 || descriptionIndex < 0)
    throw new Error(
      "Não encontrei as colunas de data, valor e descrição do CSV do Nubank.",
    );

  return rows.flatMap((row) => {
    const date = parseDate(row[dateIndex] ?? "");
    const amount = parseAmount(row[amountIndex] ?? "");
    const description = (row[descriptionIndex] ?? "").trim();
    if (!date || amount === null || !description) return [];
    return [
      {
        date,
        description,
        amountCents: (amount < 0n ? -amount : amount).toString(),
        type: amount < 0n ? ("EXPENSE" as const) : ("INCOME" as const),
      },
    ];
  });
}
