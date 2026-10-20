export function StatCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'positive' | 'negative' | 'warning';
}) {
  const toneClass = {
    neutral: 'text-foreground',
    positive: 'text-positive',
    negative: 'text-negative',
    warning: 'text-warning',
  }[tone];

  return (
    <div className="card">
      <p className="label-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function ProgressBar({ ratio, tone = 'accent' }: { ratio: number; tone?: 'accent' | 'positive' | 'negative' | 'warning' }) {
  const width = Math.min(Math.max(ratio, 0), 1) * 100;
  const color = {
    accent: 'bg-accent',
    positive: 'bg-positive',
    negative: 'bg-negative',
    warning: 'bg-warning',
  }[tone];

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-border">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/60 px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>
    </div>
  );
}
