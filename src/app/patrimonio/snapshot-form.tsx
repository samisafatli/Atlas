import { saveAssetSnapshot } from "./actions";

type AccountValue = { accountId: string; amountCents: bigint };
type Snapshot = { id: string; snapshotDate: Date; values: AccountValue[] };

export function AssetSnapshotForm({
  accounts,
  snapshot,
}: {
  accounts: { id: string; name: string; institution: string; type: string }[];
  snapshot?: Snapshot;
}) {
  const action = saveAssetSnapshot.bind(null, snapshot?.id ?? "");
  const values = new Map(
    snapshot?.values.map((value) => [value.accountId, value.amountCents]),
  );
  return (
    <form
      action={action}
      className="grid gap-5 rounded-2xl border border-[var(--line)] bg-white/80 p-5"
    >
      <label className="grid max-w-xs gap-2 text-sm font-medium">
        Data do snapshot
        <input
          className="min-h-11 rounded-lg border border-[var(--line)] px-3 font-normal"
          defaultValue={
            snapshot?.snapshotDate.toISOString().slice(0, 10) ??
            new Date().toISOString().slice(0, 10)
          }
          name="snapshotDate"
          required
          type="date"
        />
      </label>
      <div>
        <h2 className="mb-3 font-medium">Saldo por conta</h2>
        <div className="grid gap-3">
          {accounts.map((account) => (
            <label
              className="grid gap-2 rounded-lg bg-[#f7f8f5] p-3 text-sm sm:grid-cols-[1fr_10rem] sm:items-center"
              key={account.id}
            >
              <span>
                {account.name}
                <span className="block text-xs text-[var(--muted)]">
                  {account.institution} · saldo em BRL
                </span>
              </span>
              <input
                aria-label={`Valor de ${account.name}`}
                className="min-h-10 rounded border border-[var(--line)] bg-white px-3 text-right"
                min="0"
                name={`amount:${account.id}`}
                placeholder="0,00"
                step="0.01"
                type="number"
                defaultValue={
                  values.has(account.id)
                    ? (Number(values.get(account.id)) / 100).toFixed(2)
                    : ""
                }
              />
            </label>
          ))}
        </div>
      </div>
      <p className="text-xs text-[var(--muted)]">
        O total é calculado automaticamente a partir dos valores informados.
        Contas sem valor são consideradas R$ 0,00.
      </p>
      <button
        className="min-h-11 justify-self-start rounded-lg bg-[var(--foreground)] px-5 text-sm font-medium text-white"
        type="submit"
      >
        {snapshot ? "Salvar edição explícita" : "Salvar snapshot"}
      </button>
    </form>
  );
}
