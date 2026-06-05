'use client'

import { useState, useEffect, useCallback } from 'react'
import { Task } from '@/types/task'

export function useTasks(projectId: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/projects/${projectId}/tasks`)
    if (res.ok) setTasks(await res.json())
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const createTask = async (data: Partial<Task> & { title: string }) => {
    const res = await fetch(`/api/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) await load()
    return res
  }

  const updateTask = async (taskId: string, data: Partial<Task>) => {
    const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) await load()
    return res
  }

  const deleteTask = async (taskId: string) => {
    const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'DELETE',
    })
    if (res.ok) await load()
    return res
  }

  return { tasks, loading, load, createTask, updateTask, deleteTask }
}
