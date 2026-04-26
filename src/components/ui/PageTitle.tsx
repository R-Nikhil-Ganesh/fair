export function PageTitle({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl mb-1">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      {actions ? <div className="ml-auto">{actions}</div> : null}
    </div>
  );
}
