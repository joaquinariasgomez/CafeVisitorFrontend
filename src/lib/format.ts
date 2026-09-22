const timeFormatter = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' })
const dayFormatter = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' })
const shortDayFormatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })

export function formatTime(iso: string) {
  return timeFormatter.format(new Date(iso))
}

export function formatDay(iso: string) {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (isSameDay(date, today)) return 'Today'
  if (isSameDay(date, yesterday)) return 'Yesterday'
  return dayFormatter.format(date)
}

export function formatShortDay(iso: string) {
  return shortDayFormatter.format(new Date(iso))
}

export function formatRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function initials(name: string | null | undefined) {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
