'use client'

import { useState, useEffect, useCallback } from 'react'
import { Task } from '@/types/task'
import { Milestone } from '@/types/milestone'

export function useGanttData(projectId: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [tRes, mRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/tasks`),
      fetch(`/api/projects/${projectId}/milestones`),
    ])
    if (tRes.ok) setTasks(await tRes.json())
    if (mRes.ok) setMilestones(await mRes.json())
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  return { tasks, milestones, loading, load }
}
