export default function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-50">{title}</h2>
        {subtitle ? (
          <p className="text-xs text-gray-500 dark:text-zinc-400">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="text-xs text-gray-500 dark:text-zinc-400">{action}</div> : null}
    </div>
  )
}
