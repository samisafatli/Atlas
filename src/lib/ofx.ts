import {
  bankTransactionType,
  type ImportedTransaction,
  type ParseOptions,
} from "./nubank-csv";

function field(block: string, tag: string) {
  const values = [...block.matchAll(new RegExp(`<${tag}\\s*>([^<]*)`, "gi"))];
  if (values.length > 1)
    throw new Error(`OFX inválido: campo ${tag} repetido.`);
  return (values[0]?.[1] ?? "")
    .trim()
    .replace(
      /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,
      (_, entity: string) => {
        if (entity.startsWith("#")) {
          const code =
            entity[1].toLowerCase() === "x"
              ? parseInt(entity.slice(2), 16)
              : Number(entity.slice(1));
          if (code < 1 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff))
            throw new Error("Caractere inválido no OFX.");
          return String.fromCodePoint(code);
        }
        return (
          { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" } as Record<
            string,
            string
          >
        )[entity.toLowerCase()];
      },
    );
}

export function decodeOfx(buffer: ArrayBuffer): string {
  const header = new TextDecoder("ascii").decode(buffer.slice(0, 1024));
  const legacy =
    /(?:CHARSET\s*:\s*(?:1252|8859-1)|ENCODING\s*[:=]\s*["']?(?:windows-1252|iso-8859-1))/i.test(
      header,
    );
  return new TextDecoder(legacy ? "windows-1252" : "utf-8", {
    fatal: true,
  }).decode(buffer);
}

export function parseOfx(
  contents: string,
  { personalRules = true }: ParseOptions = {},
): ImportedTransaction[] {
  if (/<!DOCTYPE|<!ENTITY|<CORRECTFITID\b/i.test(contents))
    throw new Error(
      "OFX com entidades ou correções de lançamentos não é suportado.",
    );
  if (!/<OFX\s*>/i.test(contents) || !/<\/OFX\s*>\s*$/i.test(contents))
    throw new Error("Arquivo OFX inválido ou incompleto.");
  const statements = [
    ...contents.matchAll(/<STMTRS\s*>([\s\S]*?)<\/STMTRS\s*>/gi),
  ];
  if (
    statements.length !== 1 ||
    (contents.match(/<STMTRS\s*>/gi) ?? []).length !== 1 ||
    /<CCSTMTRS\b|<INVSTMTRS\b/i.test(contents)
  )
    throw new Error("Envie um OFX com um único extrato de conta bancária.");
  for (const status of contents.matchAll(
    /<STATUS\s*>([\s\S]*?)<\/STATUS\s*>/gi,
  )) {
    if (field(status[1], "CODE") !== "0")
      throw new Error("O banco informou um erro neste OFX.");
  }
  const statement = statements[0][1];
  if (field(statement, "CURDEF") !== "BRL")
    throw new Error("Somente extratos OFX em reais (BRL) são suportados.");
  const lists = [
    ...statement.matchAll(/<BANKTRANLIST\s*>([\s\S]*?)<\/BANKTRANLIST\s*>/gi),
  ];
  if (lists.length !== 1)
    throw new Error("Lista de transações OFX ausente ou inválida.");
  const blocks = [
    ...lists[0][1].matchAll(/<STMTTRN\s*>([\s\S]*?)<\/STMTTRN\s*>/gi),
  ];
  if (
    blocks.length !== (contents.match(/<STMTTRN\s*>/gi) ?? []).length ||
    blocks.length !== (contents.match(/<\/STMTTRN\s*>/gi) ?? []).length
  )
    throw new Error("OFX incompleto: há lançamentos malformados.");
  const ids = new Set<string>();
  return blocks.map(([, block], index) => {
    const invalid = () =>
      new Error(
        `Lançamento ${index + 1} inválido no OFX. Confira data, valor, descrição e identificador. Nenhum lançamento foi importado.`,
      );
    if (/<STMTTRN\b/i.test(block)) throw invalid();
    const posted = field(block, "DTPOSTED");
    if (!/^\d{8}(?:\d{6}(?:\.\d+)?)?(?:\[[^\]]+\])?$/.test(posted))
      throw invalid();
    // Preserve the bank's calendar date rather than shifting across time zones.
    const date = `${posted.slice(0, 4)}-${posted.slice(4, 6)}-${posted.slice(6, 8)}`;
    const parsedDate = new Date(`${date}T12:00:00Z`);
    const rawAmount = field(block, "TRNAMT");
    const amountMatch = rawAmount.match(/^([+-]?)(\d{1,12})(?:\.(\d{1,2}))?$/);
    const description = field(block, "MEMO") || field(block, "NAME");
    const externalId = field(block, "FITID");
    if (
      !Number.isFinite(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date ||
      !amountMatch ||
      !description ||
      description.length > 300 ||
      !externalId ||
      externalId.length > 200 ||
      ids.has(externalId)
    )
      throw invalid();
    const absolute =
      BigInt(amountMatch[2]) * 100n +
      BigInt((amountMatch[3] ?? "").padEnd(2, "0"));
    if (!absolute) throw invalid();
    ids.add(externalId);
    const signed = amountMatch[1] === "-" ? -absolute : absolute;
    return {
      date,
      description,
      amountCents: absolute.toString(),
      type: bankTransactionType(description, signed, personalRules),
      sourceType: "BANK_STATEMENT",
      externalId,
    };
  });
}
