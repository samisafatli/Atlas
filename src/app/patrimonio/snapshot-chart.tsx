import { formatCents } from "@/lib/finance-format";

type Point = { snapshotDate: Date; totalCents: bigint };

export function SnapshotChart({ snapshots }: { snapshots: Point[] }) {
  if (snapshots.length === 0)
    return (
      <div className="rounded-xl bg-[#f7f8f5] p-6 text-sm text-[var(--muted)]">
        Ainda não há snapshots para mostrar no gráfico.
      </div>
    );
  if (snapshots.length === 1)
    return (
      <div className="rounded-xl border border-[var(--line)] bg-[#f7f8f5] p-6">
        <p className="font-medium">Um snapshot registrado</p>
        <p className="mt-2 text-sm">
          {new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "medium",
            timeZone: "UTC",
          }).format(snapshots[0].snapshotDate)}{" "}
          · {formatCents(snapshots[0].totalCents)}
        </p>
        <svg
          aria-label="Gráfico de patrimônio com um snapshot"
          className="mt-5 h-24 w-full"
          role="img"
          viewBox="0 0 600 100"
          preserveAspectRatio="none"
        >
          <circle cx="300" cy="50" r="7" fill="var(--accent)">
            <title>{formatCents(snapshots[0].totalCents)}</title>
          </circle>
          <line x1="0" y1="90" x2="600" y2="90" stroke="var(--line)" />
        </svg>
      </div>
    );
  const max = snapshots.reduce(
    (current, item) => (item.totalCents > current ? item.totalCents : current),
    snapshots[0].totalCents,
  );
  const min = snapshots.reduce(
    (current, item) => (item.totalCents < current ? item.totalCents : current),
    snapshots[0].totalCents,
  );
  const spread = max - min || 1n;
  const points = snapshots.map((item, index) => ({
    ...item,
    x: (index * 600) / (snapshots.length - 1),
    y: 90 - Number(((item.totalCents - min) * 75n) / spread),
  }));
  const pointString = points.map((point) => `${point.x},${point.y}`).join(" ");
  return (
    <div className="rounded-xl bg-[#f7f8f5] p-3">
      <svg
        aria-label="Evolução do patrimônio total"
        className="h-64 w-full"
        role="img"
        viewBox="0 0 600 110"
        preserveAspectRatio="none"
      >
        <line x1="0" y1="95" x2="600" y2="95" stroke="var(--line)" />
        <polyline
          fill="none"
          points={pointString}
          stroke="var(--accent)"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((point) => (
          <circle
            key={point.snapshotDate.toISOString()}
            cx={point.x}
            cy={point.y}
            r="5"
            fill="var(--accent)"
          >
            <title>
              {new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "medium",
                timeZone: "UTC",
              }).format(point.snapshotDate)}
              : {formatCents(point.totalCents)}
            </title>
          </circle>
        ))}
      </svg>
      <div className="mt-2 flex justify-between gap-3 text-xs text-[var(--muted)]">
        {[points[0], points[points.length - 1]].map((point) => (
          <span key={point.snapshotDate.toISOString()}>
            {new Intl.DateTimeFormat("pt-BR", {
              month: "short",
              year: "numeric",
              timeZone: "UTC",
            }).format(point.snapshotDate)}{" "}
            · {formatCents(point.totalCents)}
          </span>
        ))}
      </div>
    </div>
  );
}
