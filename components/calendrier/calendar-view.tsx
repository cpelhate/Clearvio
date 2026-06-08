'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Diamond } from 'lucide-react'
import { Task, TASK_STATUS_COLORS, TASK_STATUS_BG, TASK_STATUS_LABELS } from '@/types/task'
import { Milestone, MILESTONE_STATUS_COLORS } from '@/types/milestone'

interface CalendarViewProps {
  tasks: Task[]
  milestones: Milestone[]
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1)
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

// Returns Monday-aligned week grid (6 rows × 7 cols)
function buildCalendarGrid(year: number, month: number): (Date | null)[] {
  const firstDay = startOfMonth(year, month)
  // getDay(): 0=Sun, 1=Mon... → convert to Mon=0
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = getDaysInMonth(year, month)
  const grid: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) grid.push(null)
  for (let d = 1; d <= daysInMonth; d++) grid.push(new Date(year, month, d))
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}

interface DayPopoverProps {
  date: Date
  tasks: Task[]
  milestones: Milestone[]
  onClose: () => void
  positionStyle: React.CSSProperties
}

function DayPopover({ date, tasks, milestones, onClose, positionStyle }: DayPopoverProps) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
      <div style={{
        position: 'fixed',
        zIndex: 50,
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: 16,
        boxShadow: '0 12px 32px rgba(0,0,0,0.14)',
        minWidth: 260,
        maxWidth: 320,
        ...positionStyle,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
            {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>×</button>
        </div>

        {milestones.length > 0 && (
          <div style={{ marginBottom: tasks.length > 0 ? 10 : 0 }}>
            {milestones.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
                <Diamond size={10} strokeWidth={2} style={{ color: MILESTONE_STATUS_COLORS[m.status], flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{m.title}</span>
              </div>
            ))}
          </div>
        )}

        {tasks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {tasks.map(t => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 8px',
                background: TASK_STATUS_BG[t.status],
                borderRadius: 'var(--radius-sm)',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: TASK_STATUS_COLORS[t.status], flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--color-text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.title}
                </span>
                <span style={{ fontSize: 11, color: TASK_STATUS_COLORS[t.status], flexShrink: 0 }}>
                  {TASK_STATUS_LABELS[t.status]}
                </span>
              </div>
            ))}
          </div>
        )}

        {tasks.length === 0 && milestones.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>Aucun élément ce jour.</p>
        )}
      </div>
    </>
  )
}

export function CalendarView({ tasks, milestones }: CalendarViewProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [popover, setPopover] = useState<{ date: Date; rect: DOMRect } | null>(null)

  const grid = useMemo(() => buildCalendarGrid(year, month), [year, month])

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      if (!t.dueDate) continue
      const d = new Date(t.dueDate)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return map
  }, [tasks])

  const milestonesByDay = useMemo(() => {
    const map = new Map<string, Milestone[]>()
    for (const m of milestones) {
      const d = new Date(m.plannedDate)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    }
    return map
  }, [milestones])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }
  function goToday() { setYear(today.getFullYear()); setMonth(today.getMonth()) }

  function handleDayClick(date: Date, e: React.MouseEvent) {
    if (popover && isSameDay(popover.date, date)) { setPopover(null); return }
    setPopover({ date, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() })
  }

  // Compute popover position to stay in viewport
  function getPopoverStyle(rect: DOMRect): React.CSSProperties {
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceRight = window.innerWidth - rect.left
    const top = spaceBelow > 280 ? rect.bottom + 4 : rect.top - 4
    const transform = spaceBelow > 280
      ? spaceRight > 340 ? 'none' : 'translateX(-100%)'
      : spaceRight > 340 ? 'translateY(-100%)' : 'translate(-100%, -100%)'
    return { left: spaceRight > 340 ? rect.left : rect.right, top, transform }
  }

  return (
    <div>
      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={prevMonth} style={{ background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>
          <h2 style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text-primary)', letterSpacing: '-0.01em', minWidth: 160, textAlign: 'center' }}>
            {MONTHS[month]} {year}
          </h2>
          <button onClick={nextMonth} style={{ background: 'none', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
        </div>
        <button onClick={goToday} style={{ height: 32, padding: '0 14px', background: 'transparent', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
          Aujourd&apos;hui
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent-default)' }} />
          Tâche à rendre
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          <Diamond size={10} strokeWidth={2} style={{ color: 'var(--color-text-secondary)' }} />
          Jalon
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--color-border-subtle)' }}>
          {DAYS.map(d => (
            <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {Array.from({ length: grid.length / 7 }, (_, weekIdx) => (
          <div key={weekIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {grid.slice(weekIdx * 7, weekIdx * 7 + 7).map((date, dayIdx) => {
              if (!date) return (
                <div key={dayIdx} style={{ minHeight: 90, borderRight: dayIdx < 6 ? '1px solid var(--color-border-subtle)' : 'none', borderBottom: weekIdx < grid.length / 7 - 1 ? '1px solid var(--color-border-subtle)' : 'none', background: 'var(--color-bg-primary)', opacity: 0.4 }} />
              )

              const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
              const dayTasks = tasksByDay.get(key) ?? []
              const dayMilestones = milestonesByDay.get(key) ?? []
              const isToday = isSameDay(date, today)
              const isSelected = popover && isSameDay(popover.date, date)
              const hasItems = dayTasks.length > 0 || dayMilestones.length > 0
              const MAX_SHOWN = 3
              const extraCount = dayTasks.length + dayMilestones.length - MAX_SHOWN

              return (
                <div
                  key={dayIdx}
                  onClick={e => handleDayClick(date, e)}
                  style={{
                    minHeight: 90,
                    padding: 8,
                    borderRight: dayIdx < 6 ? '1px solid var(--color-border-subtle)' : 'none',
                    borderBottom: weekIdx < grid.length / 7 - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                    cursor: hasItems ? 'pointer' : 'default',
                    background: isSelected ? 'var(--color-accent-bg)' : 'transparent',
                    transition: 'background 0.1s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { if (hasItems && !isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-tertiary)' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  {/* Day number */}
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: isToday ? 600 : 400,
                    color: isToday ? '#fff' : 'var(--color-text-primary)',
                    background: isToday ? 'var(--color-accent-default)' : 'transparent',
                    marginBottom: 4,
                  }}>
                    {date.getDate()}
                  </div>

                  {/* Items preview */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayMilestones.slice(0, MAX_SHOWN).map(m => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '1px 4px', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-tertiary)' }}>
                        <Diamond size={8} strokeWidth={2} style={{ color: MILESTONE_STATUS_COLORS[m.status], flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</span>
                      </div>
                    ))}
                    {dayTasks.slice(0, Math.max(0, MAX_SHOWN - dayMilestones.length)).map(t => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '1px 4px', borderRadius: 'var(--radius-sm)', background: TASK_STATUS_BG[t.status] }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: TASK_STATUS_COLORS[t.status], flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                      </div>
                    ))}
                    {extraCount > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', paddingLeft: 4 }}>+{extraCount} de plus</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Popover */}
      {popover && (
        <DayPopover
          date={popover.date}
          tasks={tasksByDay.get(`${popover.date.getFullYear()}-${popover.date.getMonth()}-${popover.date.getDate()}`) ?? []}
          milestones={milestonesByDay.get(`${popover.date.getFullYear()}-${popover.date.getMonth()}-${popover.date.getDate()}`) ?? []}
          onClose={() => setPopover(null)}
          positionStyle={getPopoverStyle(popover.rect)}
        />
      )}
    </div>
  )
}
