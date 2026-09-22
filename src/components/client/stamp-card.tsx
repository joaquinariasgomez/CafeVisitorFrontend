import { GiftIcon, MapPinIcon } from 'lucide-react'
import { cn } from 'cn'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { StampCard as StampCardModel } from '@/lib/api/types'

export function StampCard({ card, compact = false }: { card: StampCardModel; compact?: boolean }) {
  const filled = Math.min(card.orderCount, card.threshold)
  const rewardReady = card.rewardsAvailable > 0 || card.orderCount >= card.threshold
  return (
    <Card size="sm" className={cn(rewardReady && 'ring-brand/60')}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="truncate">{card.cafeteria.displayName}</span>
          {rewardReady ? (
            <Badge className="bg-brand text-brand-foreground">
              <GiftIcon /> Reward ready
            </Badge>
          ) : (
            <span className="text-sm font-normal text-muted-foreground">
              {filled}/{card.threshold}
            </span>
          )}
        </CardTitle>
        {!compact ? (
          <CardDescription className="flex items-center gap-1">
            <MapPinIcon className="size-3.5" aria-hidden="true" /> {card.cafeteria.location}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-10 gap-1.5" role="img" aria-label={`${filled} of ${card.threshold} stamps`}>
          {Array.from({ length: card.threshold }, (_, i) => (
            <span
              key={i}
              className={cn(
                'aspect-square rounded-full border',
                i < filled ? 'border-primary bg-primary' : 'border-border bg-muted'
              )}
            />
          ))}
        </div>
        {card.rewardsAvailable > 1 ? (
          <p className="mt-2 text-xs text-muted-foreground">{card.rewardsAvailable} rewards available</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
