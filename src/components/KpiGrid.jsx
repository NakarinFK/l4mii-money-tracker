export default function KpiGrid({ items }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-gray-200/90 bg-white/65 p-5 shadow-md backdrop-blur-md dark:border-[#373F4E]/60 dark:bg-[#212631]/55 dark:backdrop-blur-md dark:shadow-black/30"
        >
          <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">
            {item.label}
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-zinc-50">
            {item.value}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
            {item.note}
          </p>
        </div>
      ))}
    </section>
  )
}
