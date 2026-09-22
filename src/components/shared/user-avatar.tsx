import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/lib/format'

export function UserAvatar({
  name,
  avatarUrl,
  size = 'default',
  className,
}: {
  name: string | null
  avatarUrl: string | null
  size?: 'default' | 'sm' | 'lg'
  className?: string
}) {
  return (
    <Avatar size={size} className={className}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
      <AvatarFallback className="bg-secondary font-medium text-secondary-foreground">{initials(name)}</AvatarFallback>
    </Avatar>
  )
}
