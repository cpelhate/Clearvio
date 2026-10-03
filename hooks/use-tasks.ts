'use client'

import { useState, useEffect, useCallback } from 'react'
import { Task } from '@/types/task'
import { useToast } from '@/components/ui/toast'

export function useTasks(projectId: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

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
    if (res.ok) { await load(); toast('Tâche créée') }
    else toast('Impossible de créer la tâche', 'error')
    return res
  }

  const updateTask = async (taskId: string, data: Partial<Task>) => {
    const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated: Task = await res.json()
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t))
      toast('Tâche enregistrée')
    } else {
      await load()
      toast('Impossible d\'enregistrer', 'error')
    }
    return res
  }

  const deleteTask = async (taskId: string) => {
    const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'DELETE',
    })
    if (res.ok) await load()
    else toast('Impossible de supprimer la tâche', 'error')
    return res
  }

  return { tasks, loading, load, createTask, updateTask, deleteTask }
}
