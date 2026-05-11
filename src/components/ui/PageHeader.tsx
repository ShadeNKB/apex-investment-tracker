interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="font-display font-bold text-xl sm:text-2xl text-ink-primary tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-ink-muted mt-1 truncate">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap sm:flex-shrink-0">{actions}</div>}
    </div>
  );
}
