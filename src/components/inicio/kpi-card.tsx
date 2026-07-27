type KpiCardProps = {
  label: string;
  value: string;
};

export function KpiCard({ label, value }: KpiCardProps) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
