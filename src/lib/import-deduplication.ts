import type { prisma } from "./prisma";
import {
  legacyTransactionFingerprint,
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
    type: candidate.type,
  }));
  const keys = [
    ...new Set(signatures.flatMap((item) => [item.current, item.legacy])),
  ];
  const stored = new Map<string, string>();
  for (let index = 0; index < keys.length; index += 500) {
    const rows = await client.transaction.findMany({
      where: { fingerprint: { in: keys.slice(index, index + 500) } },
      select: { fingerprint: true, type: true },
    });
    for (const row of rows)
      if (row.fingerprint) stored.set(row.fingerprint, row.type);
  }
  return new Set(
    signatures
      .filter(
        (item) =>
          stored.get(item.current) === item.type ||
          stored.get(item.legacy) === item.type,
      )
      .map((item) => item.current),
  );
}
