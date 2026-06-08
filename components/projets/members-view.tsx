'use client'

import { ProjectMember } from '@/types/project'

const ROLE_LABELS: Record<ProjectMember['role'], string> = {
  CO_RESPONSABLE: 'Co-responsable',
  CONTRIBUTEUR: 'Contributeur',
  OBSERVATEUR: 'Observateur',
}

const ROLE_COLORS: Record<ProjectMember['role'], { bg: string; text: string }> = {
  CO_RESPONSABLE: { bg: 'var(--color-accent-bg)', text: 'var(--color-accent-default)' },
  CONTRIBUTEUR: { bg: 'var(--color-success-bg)', text: 'var(--color-success-default)' },
  OBSERVATEUR: { bg: 'var(--color-bg-tertiary)', text: 'var(--color-text-secondary)' },
}

interface MembersViewProps {
  members: ProjectMember[]
}

export function MembersView({ members }: MembersViewProps) {
  if (members.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 8 }}>
        <p style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>Aucun membre dans ce projet.</p>
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 20 }}>
        {members.length} membre{members.length > 1 ? 's' : ''}
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 12,
      }}>
        {members.map(member => {
          const initials = member.userId.slice(0, 2).toUpperCase()
          const roleColor = ROLE_COLORS[member.role]
          return (
            <div
              key={member.id}
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: 16,
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--color-accent-bg)',
                color: 'var(--color-accent-default)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 600, flexShrink: 0,
                letterSpacing: '0.02em',
              }}>
                {initials}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {member.userId.slice(0, 8)}...
                </p>
                <span style={{
                  fontSize: 11, padding: '2px 8px',
                  background: roleColor.bg, color: roleColor.text,
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 500,
                }}>
                  {ROLE_LABELS[member.role]}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
