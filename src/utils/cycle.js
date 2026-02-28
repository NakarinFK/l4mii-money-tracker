export function deriveCycleId(dateValue) {
  const date = toDate(dateValue) || new Date()
  const year = date.getFullYear()
  const monthIndex = date.getMonth()
  const day = date.getDate()
  const endMonthIndex = day >= 27 ? monthIndex + 1 : monthIndex
  const endDate = new Date(year, endMonthIndex, 1)
  return formatCycleId(endDate.getFullYear(), endDate.getMonth())
}

export function getCurrentCycleId() {
  return deriveCycleId(new Date())
}

export function buildCycleOptions(centerCycleId, range = 3) {
  const center = parseCycleId(centerCycleId)
  if (!center) return []
  const options = []
  for (let offset = -range; offset <= range; offset += 1) {
    const date = new Date(center.year, center.monthIndex + offset, 1)
    options.push(formatCycleId(date.getFullYear(), date.getMonth()))
  }
  return options
}

function formatCycleId(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

function parseCycleId(cycleId) {
  if (!cycleId) return null
  const [yearRaw, monthRaw] = String(cycleId).split('-')
  const year = Number(yearRaw)
  const monthIndex = Number(monthRaw) - 1
  if (!year || Number.isNaN(monthIndex)) return null
  return { year, monthIndex }
}

function toDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'string') {
    const parts = value.split('-').map(Number)
    if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) {
      const date = new Date(parts[0], parts[1] - 1, parts[2])
      return Number.isNaN(date.getTime()) ? null : date
    }
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
