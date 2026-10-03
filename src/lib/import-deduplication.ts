import type { prisma } from "./prisma-client";
import {
  legacyTransactionFingerprint,
  previousTransactionFingerprint,
  transactionFingerprint,
  type FingerprintTransaction,
} from "./transaction-fingerprint";

// Older imports used a hash without the transaction type. Match those hashes
// only when the stored type also agrees, preserving reimport idempotence.
export async function existingImportFingerprints(
  client: Pick<typeof prisma, "transaction">,
  candidates: FingerprintTransaction[],
) {
  const signatures = candidates.map((candidate) => ({
    current: transactionFingerprint(candidate),
    legacy: legacyTransactionFingerprint(candidate),
    previous: previousTransactionFingerprint(candidate),
    source: candidate.sourceType ?? "BANK_STATEMENT",
    type: candidate.type,
    occurrence: candidate.occurrence ?? 1,
  }));
  const keys = [
    ...new Set(
      signatures.flatMap((item) => [item.current, item.legacy, item.previous]),
    ),
  ];
  const stored = new Map<string, { type: string; sourceType: string }>();
  for (let index = 0; index < keys.length; index += 500) {
    const rows = await client.transaction.findMany({
      where: { fingerprint: { in: keys.slice(index, index + 500) } },
      select: { fingerprint: true, type: true, sourceType: true },
    });
    for (const row of rows)
      if (row.fingerprint) stored.set(row.fingerprint, row);
  }
  return new Set(
    signatures
      .filter(
        (item) =>
          stored.has(item.current) ||
          (item.occurrence === 1 &&
            item.source === "BANK_STATEMENT" &&
            [item.legacy, item.previous].some((key) => {
              const row = stored.get(key);
              return (
                row?.type === item.type &&
                ["LEGACY", "MANUAL", "BANK_STATEMENT"].includes(row.sourceType)
              );
            })),
      )
      .map((item) => item.current),
  );
}
