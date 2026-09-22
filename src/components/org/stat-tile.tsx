import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function StatTile({
  label,
  value,
  hint,
  loading = false,
}: {
  label: string
  value: string | number
  hint?: string
  loading?: boolean
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        {loading ? <Skeleton className="h-8 w-16" /> : <span className="text-3xl font-semibold tabular-nums">{value}</span>}
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </CardContent>
    </Card>
  )
}
