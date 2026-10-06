import Image from 'next/image'
import { cn } from '@/lib/utils'

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
}

function getInitials(name = 'User') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U'
}

const AVATAR_PALETTE = [
  { bg: 'bg-[#E1EDD8] border-[#CADCB8]', text: 'text-[#2D4A22]' }, // Olive (8.0:1)
  { bg: 'bg-[#DCE7F6] border-[#BCD1EF]', text: 'text-[#1E3A8A]' }, // Blue (9.2:1)
  { bg: 'bg-[#FBE3E2] border-[#F6C7C5]', text: 'text-[#7F1D1D]' }, // Terracotta (12.0:1)
  { bg: 'bg-[#FEF3C7] border-[#FDE68A]', text: 'text-[#78350F]' }, // Amber (9.1:1)
  { bg: 'bg-[#1E293B] border-[#334155]', text: 'text-[#F8FAFC]' }, // Dark Ink (14.1:1)
  { bg: 'bg-[#F1F5F9] border-[#E2E8F0]', text: 'text-[#334155]' }, // Slate (10.4:1)
]

function getColorClass(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length
  return AVATAR_PALETTE[index]
}

export default function Avatar({
  src,
  name = 'User',
  size = 'md',
  online = false,
  className,
}) {
  const initials = getInitials(name)
  const sizePxMap = { sm: 32, md: 40, lg: 56 }
  const sizePx = sizePxMap[size] || sizePxMap.md
  const palette = getColorClass(name)

  return (
    <div className="relative inline-flex shrink-0">
      {src ? (
        <Image
          src={src}
          alt={name}
          width={sizePx}
          height={sizePx}
          className={cn(
            'rounded-full object-cover ring-1 ring-border',
            sizeMap[size] || sizeMap.md,
            className
          )}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center rounded-full border ring-1 ring-border/80 font-black uppercase',
            palette.bg,
            palette.text,
            sizeMap[size] || sizeMap.md,
            className
          )}
        >
          {initials}
        </div>
      )}

      {online && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-success" />
      )}
    </div>
  )
}