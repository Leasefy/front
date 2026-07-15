/** Standard admin screen header: mono section label + display title + optional slot. */
export function PageHeader({
  label,
  title,
  description,
  right,
}: {
  label: string
  title: string
  description?: string
  right?: React.ReactNode
}) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
      <div className="space-y-2">
        <div className="section-label">{label}</div>
        <h1 className="font-display text-display tracking-tight text-fg">{title}</h1>
        {description && <p className="text-sm text-fg-muted max-w-2xl">{description}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  )
}
