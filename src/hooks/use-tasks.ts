"use client"

import { useState, useEffect, useCallback } from "react"
import type { Task, Priority, TaskFilters, UndoAction } from "@/types/task"
import { getSortedTasks, filterTasks, migrateTask, UndoManager } from "@/lib/task-utils"

const STORAGE_KEY = "sls.todo.v1"
const METRICS_KEY = "sls.todo.metrics.v1"

interface TaskMetrics {
  createdToday: number
  completedToday: number
  totalEstimatedMin: number
  totalActualMin: number
}

export function useTasks(userIdentifier?: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [filters, setFilters] = useState<TaskFilters>({ status: ["active", "snoozed"] })
  const [undoManager] = useState(() => new UndoManager())
  const [lastUndoAction, setLastUndoAction] = useState<UndoAction | null>(null)

  // Load tasks from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        const migratedTasks = data.tasks?.map(migrateTask) || []
        setTasks(migratedTasks)
      }
    } catch (error) {
      console.error("Failed to load tasks:", error)
    }
  }, [])

  // Save tasks to localStorage whenever tasks change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, version: 1 }))
    } catch (error) {
      console.error("Failed to save tasks:", error)
    }
  }, [tasks])

  const createTask = useCallback(
    (title: string, options: Partial<Task> = {}) => {
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: title.trim(),
        status: "active",
        priority: "P2",
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userIdentifier: userIdentifier,
        ...options,
      }

      setTasks((prev) => [...prev, newTask])

      undoManager.addAction({
        type: "create",
        taskId: newTask.id,
        timestamp: Date.now(),
      })

      return newTask
    },
    [undoManager, userIdentifier],
  )

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      setTasks((prev) => {
        const taskIndex = prev.findIndex((t) => t.id === id)
        if (taskIndex === -1) return prev

        const oldTask = prev[taskIndex]
        const updatedTask = {
          ...oldTask,
          ...updates,
          updatedAt: new Date().toISOString(),
          completedAt:
            updates.status === "completed"
              ? new Date().toISOString()
              : updates.status === "active"
                ? undefined
                : oldTask.completedAt,
        }

        undoManager.addAction({
          type: "update",
          taskId: id,
          previousState: oldTask,
          timestamp: Date.now(),
        })

        const newTasks = [...prev]
        newTasks[taskIndex] = updatedTask
        return newTasks
      })
    },
    [undoManager],
  )

  const deleteTask = useCallback(
    (id: string) => {
      setTasks((prev) => {
        const task = prev.find((t) => t.id === id)
        if (!task) return prev

        undoManager.addAction({
          type: "delete",
          taskId: id,
          previousState: task,
          timestamp: Date.now(),
        })

        setLastUndoAction({
          type: "delete",
          taskId: id,
          previousState: task,
          timestamp: Date.now(),
        })

        return prev.filter((t) => t.id !== id)
      })
    },
    [undoManager],
  )

  const toggleTaskComplete = useCallback(
    (id: string) => {
      const task = tasks.find((t) => t.id === id)
      if (!task) return

      updateTask(id, {
        status: task.status === "completed" ? "active" : "completed",
      })
    },
    [tasks, updateTask],
  )

  const snoozeTask = useCallback(
    (id: string, until: Date) => {
      updateTask(id, {
        status: "snoozed",
        snoozedUntil: until.toISOString(),
      })
    },
    [updateTask],
  )

  const cyclePriority = useCallback(
    (id: string) => {
      const task = tasks.find((t) => t.id === id)
      if (!task) return

      const priorities: Priority[] = ["P0", "P1", "P2", "P3"]
      const currentIndex = priorities.indexOf(task.priority)
      const nextPriority = priorities[(currentIndex + 1) % priorities.length]

      updateTask(id, { priority: nextPriority })
    },
    [tasks, updateTask],
  )

  const bulkUpdate = useCallback(
    (taskIds: string[], updates: Partial<Task>) => {
      const previousStates = tasks.filter((t) => taskIds.includes(t.id))

      setTasks((prev) =>
        prev.map((task) =>
          taskIds.includes(task.id) ? { ...task, ...updates, updatedAt: new Date().toISOString() } : task,
        ),
      )

      undoManager.addAction({
        type: "bulk",
        taskIds,
        previousState: previousStates,
        timestamp: Date.now(),
      })
    },
    [tasks, undoManager],
  )

  const bulkDelete = useCallback(
    (taskIds: string[]) => {
      const tasksToDelete = tasks.filter((t) => taskIds.includes(t.id))

      setTasks((prev) => prev.filter((t) => !taskIds.includes(t.id)))

      undoManager.addAction({
        type: "bulk_delete",
        taskIds,
        previousState: tasksToDelete,
        timestamp: Date.now(),
      })

      setLastUndoAction({
        type: "bulk_delete",
        taskIds,
        previousState: tasksToDelete,
        timestamp: Date.now(),
      })
    },
    [tasks, undoManager],
  )

  const undo = useCallback(() => {
    if (lastUndoAction && Date.now() - lastUndoAction.timestamp < 5000) {
      if (lastUndoAction.type === "bulk_delete" && lastUndoAction.previousState) {
        const tasksToRestore = lastUndoAction.previousState as Task[]
        setTasks((prev) => [...prev, ...tasksToRestore])
        setLastUndoAction(null)
        return
      }
      // Restore from recent delete
      if (lastUndoAction.type === "delete" && lastUndoAction.previousState) {
        setTasks((prev) => [...prev, lastUndoAction.previousState as Task])
        setLastUndoAction(null)
        return
      }
    }

    const action = undoManager.getLastAction()
    if (!action) return

    switch (action.type) {
      case "create":
        if (action.taskId) {
          setTasks((prev) => prev.filter((t) => t.id !== action.taskId))
        }
        break
      case "update":
        if (action.taskId && action.previousState) {
          setTasks((prev) => prev.map((t) => (t.id === action.taskId ? (action.previousState as Task) : t)))
        }
        break
      case "delete":
        if (action.previousState) {
          setTasks((prev) => [...prev, action.previousState as Task])
        }
        break
      case "bulk_delete":
        if (action.previousState) {
          const tasksToRestore = action.previousState as Task[]
          setTasks((prev) => [...prev, ...tasksToRestore])
        }
        break
      case "bulk":
        if (action.taskIds && action.previousState) {
          const previousTasks = action.previousState as Task[]
          setTasks((prev) =>
            prev.map((task) => {
              const previousTask = previousTasks.find((pt) => pt.id === task.id)
              return previousTask || task
            }),
          )
        }
        break
    }
  }, [lastUndoAction, undoManager])

  // Process snoozed tasks
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setTasks((prev) =>
        prev.map((task) => {
          if (task.status === "snoozed" && task.snoozedUntil && new Date(task.snoozedUntil) <= now) {
            return { ...task, status: "active", snoozedUntil: undefined, updatedAt: now.toISOString() }
          }
          return task
        }),
      )
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  const userFilteredTasks = userIdentifier ? tasks.filter((task) => task.userIdentifier === userIdentifier) : []

  const filteredAndSortedTasks = getSortedTasks(filterTasks(userFilteredTasks, filters))

  return {
    tasks: filteredAndSortedTasks,
    allTasks: userFilteredTasks,
    selectedTaskIds,
    setSelectedTaskIds,
    editingTaskId,
    setEditingTaskId,
    filters,
    setFilters,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    snoozeTask,
    cyclePriority,
    bulkUpdate,
    bulkDelete,
    undo,
    canUndo: lastUndoAction && Date.now() - lastUndoAction.timestamp < 5000,
    lastUndoAction,
  }
}
