import { formatCents } from "@/lib/finance-format";

type Point = { snapshotDate: Date; totalCents: bigint };

// Positioned in percent of the chart box, matching the SVG's viewBox.
function Dot({
  label,
  left,
  top,
}: {
  label: string;
  left: number;
  top: number;
}) {
  return (
    <span
      className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
      style={{ left: `${left}%`, top: `${top}%` }}
      title={label}
    />
  );
}

export function SnapshotChart({ snapshots }: { snapshots: Point[] }) {
  if (snapshots.length === 0)
    return (
      <div className="rounded-xl bg-surface-2 p-6 text-sm text-[var(--muted)]">
        Ainda não há snapshots para mostrar no gráfico.
      </div>
    );
  if (snapshots.length === 1)
    return (
      <div className="rounded-xl border border-[var(--line)] bg-surface-2 p-6">
        <p className="font-medium">Um snapshot registrado</p>
        <p className="mt-2 text-sm">
          {new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "medium",
            timeZone: "UTC",
          }).format(snapshots[0].snapshotDate)}{" "}
          · {formatCents(snapshots[0].totalCents)}
        </p>
        <div
          aria-label="Gráfico de patrimônio com um snapshot"
          className="relative mt-5 h-24"
          role="img"
        >
          <svg
            aria-hidden="true"
            className="absolute inset-0 size-full"
            viewBox="0 0 600 100"
            preserveAspectRatio="none"
          >
            <line x1="0" y1="90" x2="600" y2="90" stroke="var(--line)" />
          </svg>
          <Dot
            label={formatCents(snapshots[0].totalCents)}
            left={50}
            top={50}
          />
        </div>
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
    <div className="rounded-xl bg-surface-2 p-3">
      <div
        aria-label="Evolução do patrimônio total"
        className="relative h-64"
        role="img"
      >
        {/* The stretched SVG draws only lines; dots sit on top so they stay round. */}
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full"
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
        </svg>
        {points.map((point) => (
          <Dot
            key={point.snapshotDate.toISOString()}
            label={`${new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "medium",
              timeZone: "UTC",
            }).format(point.snapshotDate)}: ${formatCents(point.totalCents)}`}
            left={(point.x / 600) * 100}
            top={(point.y / 110) * 100}
          />
        ))}
      </div>
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
