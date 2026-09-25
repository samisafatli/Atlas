import Link from "next/link";
import { formatCents } from "@/lib/finance-format";

type Transaction = { occurredAt: Date; amountCents: bigint; type: string };
const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function SpendingCalendar({
  month,
  transactions,
  selectedDay,
}: {
  month: string;
  transactions: Transaction[];
  selectedDay?: string;
}) {
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const offset =
    (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const daily = new Map<number, bigint>();
  for (const transaction of transactions)
    if (transaction.type === "EXPENSE") {
      const day = transaction.occurredAt.getUTCDate();
      daily.set(day, (daily.get(day) ?? 0n) + transaction.amountCents);
    }
  const max = [...daily.values()].reduce(
    (highest, value) => (value > highest ? value : highest),
    0n,
  );
  const cells = [
    ...Array(offset).fill(0),
    ...Array.from({ length: days }, (_, index) => index + 1),
  ];
  return (
    <section
      className="rounded-2xl border border-[var(--line)] bg-white/80 p-5"
      aria-labelledby="calendar-title"
    >
      <div className="mb-4">
        <h2 className="font-medium" id="calendar-title">
          Gastos por dia
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Intensidade pelo valor das despesas. Os números mostram o dia e o
          total.
        </p>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {weekdays.map((day) => (
          <div
            className="py-1 text-center text-xs text-[var(--muted)]"
            key={day}
          >
            {day}
          </div>
        ))}
        {cells.map((day, index) => {
          if (day === 0)
            return (
              <div
                aria-hidden="true"
                className="min-h-[4.6rem]"
                key={`empty-${index}`}
              />
            );
          const amount = daily.get(day) ?? 0n;
          const intensity =
            amount === 0n || max === 0n
              ? 0
              : amount * 4n >= max * 3n
                ? 4
                : amount * 4n >= max * 2n
                  ? 3
                  : amount * 4n >= max
                    ? 2
                    : 1;
          const date = `${month}-${String(day).padStart(2, "0")}`;
          const tones = [
            "bg-[#f7f8f5]",
            "bg-[#e5efe8]",
            "bg-[#c6ddcd]",
            "bg-[#94c2a2]",
            "bg-[#5e9a75]",
          ];
          return (
            <Link
              aria-current={selectedDay === date ? "date" : undefined}
              aria-label={`${day}, gasto de ${formatCents(amount)}`}
              className={`flex min-h-[4.6rem] flex-col justify-between rounded-lg p-2 text-left transition hover:ring-2 hover:ring-[var(--accent)] ${tones[intensity]} ${selectedDay === date ? "ring-2 ring-[var(--foreground)]" : ""}`}
              href={`/transacoes?month=${month}&dia=${date}`}
              key={date}
              title={`${day}: ${formatCents(amount)}`}
            >
              <span className="text-xs font-medium">{day}</span>
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {amount ? formatCents(amount) : "—"}
              </span>
            </Link>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-[var(--muted)]">
        Tom neutro indica dia sem gastos; tons mais escuros indicam maior valor.
      </p>
    </section>
  );
}
