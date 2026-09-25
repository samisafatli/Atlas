export function formatCents(amountCents: bigint, currency = "BRL") {
  const negative = amountCents < 0n;
  const absolute = negative ? -amountCents : amountCents;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  const parts = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).formatToParts(whole);
  const lastNumberPart = parts.reduce(
    (last, part, index) =>
      part.type === "integer" || part.type === "group" ? index : last,
    -1,
  );
  const decimal =
    new Intl.NumberFormat("pt-BR")
      .formatToParts(1.1)
      .find((part) => part.type === "decimal")?.value ?? ",";
  if (lastNumberPart >= 0)
    parts.splice(
      lastNumberPart + 1,
      0,
      { type: "decimal", value: decimal },
      { type: "fraction", value: fraction },
    );
  return (negative ? "−" : "") + parts.map((part) => part.value).join("");
}

export function getMonthRange(month: string) {
  const match = month.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (year < 1900 || year > 9999) return null;
  return {
    start: new Date(Date.UTC(year, monthIndex, 1)),
    end: new Date(Date.UTC(year, monthIndex + 1, 1)),
  };
}

export function shiftMonth(month: string, by: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + by, 1))
    .toISOString()
    .slice(0, 7);
}
