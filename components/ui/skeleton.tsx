import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'text-sm' | 'heading' | 'circle' | 'block'
  width?: number | string
  height?: number | string
}

function Skeleton({ variant = 'block', width, height, className, style, ...props }: SkeletonProps) {
  const variantClass =
    variant === 'text'    ? 'skeleton-text' :
    variant === 'text-sm' ? 'skeleton-text-sm' :
    variant === 'heading' ? 'skeleton-heading' :
    variant === 'circle'  ? 'skeleton-circle' :
    ''

  return (
    <div
      className={cn('skeleton', variantClass, className)}
      style={{ width, height, ...style }}
      aria-hidden="true"
      {...props}
    />
  )
}

/* ─── Compositions prêtes à l'emploi ─────────────────────── */

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('card', className)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Skeleton variant="circle" width={32} height={32} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton variant="heading" width="60%" />
          <Skeleton variant="text-sm" width="40%" />
        </div>
      </div>
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="80%" />
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <Skeleton variant="text-sm" width={60} height={22} style={{ borderRadius: 'var(--radius-full)' }} />
        <Skeleton variant="text-sm" width={80} height={22} style={{ borderRadius: 'var(--radius-full)' }} />
      </div>
    </div>
  )
}

function SkeletonRow({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        height: 48,
        padding: '0 16px',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}
      aria-hidden="true"
    >
      <Skeleton variant="text" width="25%" />
      <Skeleton variant="text-sm" width={70} height={22} style={{ borderRadius: 'var(--radius-full)' }} />
      <Skeleton variant="text" width="15%" style={{ marginLeft: 'auto' }} />
      <Skeleton variant="text" width="10%" />
    </div>
  )
}

function SkeletonPage({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton variant="heading" width={200} />
        <Skeleton variant="text-sm" width={300} />
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        {[1,2,3,4].map(i => (
          <Skeleton key={i} height={72} style={{ flex: 1, borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>
      <div>
        {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    </div>
  )
}

export { Skeleton, SkeletonCard, SkeletonRow, SkeletonPage }
export type { SkeletonProps }
