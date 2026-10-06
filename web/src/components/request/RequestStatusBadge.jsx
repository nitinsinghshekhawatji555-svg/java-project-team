
import Badge from '@/components/ui/Badge'
import { formatStatus } from '@/lib/utils'

export default function RequestStatusBadge({ status }) {
  return <Badge label={formatStatus(status)} variant={status} dot />
}