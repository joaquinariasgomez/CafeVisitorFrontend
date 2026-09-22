import { formatShortDay } from '@/lib/format'

export function OrdersPerDayChart({ data, days = 14 }: { data: Array<{ date: string; count: number }>; days?: number }) {
  const slice = data.slice(-days)
  const max = Math.max(1, ...slice.map((d) => d.count))
  return (
    <figure className="flex flex-col gap-2">
      <div className="flex h-32 items-end gap-1" role="img" aria-label={`Orders per day for the last ${slice.length} days`}>
        {slice.map((d) => (
          <div
            key={d.date}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1"
            title={`${formatShortDay(d.date)}: ${d.count}`}
          >
            <span className="text-[10px] tabular-nums text-muted-foreground">{d.count || ''}</span>
            <div className="w-full rounded-t-sm bg-primary/80" style={{ height: `${Math.max(2, (d.count / max) * 85)}%` }} />
          </div>
        ))}
      </div>
      <figcaption className="flex justify-between text-xs text-muted-foreground">
        <span>{slice[0] ? formatShortDay(slice[0].date) : ''}</span>
        <span>Today</span>
      </figcaption>
    </figure>
  )
}
