"use client"

import { useState, useEffect, useCallback } from "react"
import { TaskList } from "@/components/task-list"
import { AddTaskForm } from "@/components/add-task-form"
import { NotificationToast, type ToastNotification } from "@/components/notification-toast"
import { useTasks } from "@/hooks/use-tasks"

export default function TodoApp() {
  const [userIdentifier, setUserIdentifier] = useState<string>("")

  const {
    tasks,
    allTasks,
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
    canUndo,
    lastUndoAction,
  } = useTasks(userIdentifier)

  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<ToastNotification[]>([])
  const [showCompleted, setShowCompleted] = useState(false)

  const addNotification = useCallback((notification: Omit<ToastNotification, "id">) => {
    const id = Date.now().toString()
    setNotifications((prev) => [...prev, { ...notification, id }])
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  useEffect(() => {
    const initializeApp = async () => {
      if (userIdentifier && allTasks.length === 0) {
        createTask("Design the user interface", { priority: "P1" })
        createTask("Implement authentication system", {
          status: "completed",
          priority: "P0",
          completedAt: new Date().toISOString(),
        })
        createTask("Set up database integration", { priority: "P2" })
      }

      await new Promise((resolve) => setTimeout(resolve, 1200))
      setLoading(false)
    }

    initializeApp()
  }, [userIdentifier, allTasks.length, createTask])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when editing
      if (editingTaskId) {
        if (e.key === "Escape") {
          setEditingTaskId(null)
        }
        return
      }

      switch (e.key) {
        case "Escape":
          setSelectedTaskIds(new Set())
          break
        case "Delete":
        case "Backspace":
          if (selectedTaskIds.size > 0) {
            e.preventDefault()
            bulkDelete(Array.from(selectedTaskIds))
            setSelectedTaskIds(new Set())
            addNotification({
              type: "success",
              title: "Tasks deleted",
              message: `${selectedTaskIds.size} task${selectedTaskIds.size > 1 ? "s" : ""} deleted successfully`,
            })
          }
          break
        case "a":
        case "A":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            const visibleTaskIds = new Set(tasks.filter((t) => t.status === "active").map((t) => t.id))
            setSelectedTaskIds(visibleTaskIds)
          }
          break
        case "z":
        case "Z":
          if ((e.ctrlKey || e.metaKey) && canUndo) {
            e.preventDefault()
            undo()
            addNotification({
              type: "info",
              title: "Action undone",
              message: "Previous action has been restored",
            })
          }
          break
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [
    selectedTaskIds,
    editingTaskId,
    tasks,
    canUndo,
    undo,
    bulkDelete,
    setSelectedTaskIds,
    setEditingTaskId,
    addNotification,
  ])

  useEffect(() => {
    const cleanupCompletedTasks = () => {
      const now = new Date()
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

      const tasksToDelete = allTasks.filter(
        (task) => task.status === "completed" && task.completedAt && new Date(task.completedAt) < fortyEightHoursAgo,
      )

      tasksToDelete.forEach((task) => {
        deleteTask(task.id)
      })

      if (tasksToDelete.length > 0) {
        addNotification({
          type: "info",
          title: "Auto-cleanup completed",
          message: `${tasksToDelete.length} old completed task${tasksToDelete.length > 1 ? "s" : ""} automatically removed`,
        })
      }
    }

    // Run cleanup on mount and then every hour
    cleanupCompletedTasks()
    const interval = setInterval(cleanupCompletedTasks, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [allTasks, deleteTask, addNotification])

  const getTimeUntilDeletion = (completedAt: string) => {
    const completed = new Date(completedAt)
    const deletionTime = new Date(completed.getTime() + 48 * 60 * 60 * 1000)
    const now = new Date()
    const timeLeft = deletionTime.getTime() - now.getTime()

    if (timeLeft <= 0) return "Deleting soon..."

    const hours = Math.floor(timeLeft / (1000 * 60 * 60))
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`
    }
    return `${minutes}m remaining`
  }

  const handleSelect = useCallback(
    (taskId: string, multiSelect = false) => {
      setSelectedTaskIds((prev) => {
        const newSet = new Set(prev)
        if (multiSelect) {
          if (newSet.has(taskId)) {
            newSet.delete(taskId)
          } else {
            newSet.add(taskId)
          }
        } else {
          if (newSet.has(taskId) && newSet.size === 1) {
            newSet.clear()
          } else {
            newSet.clear()
            newSet.add(taskId)
          }
        }
        return newSet
      })
    },
    [setSelectedTaskIds],
  )

  const handleBulkComplete = useCallback(() => {
    if (selectedTaskIds.size > 0) {
      bulkUpdate(Array.from(selectedTaskIds), { status: "completed" })
      setSelectedTaskIds(new Set())
      addNotification({
        type: "success",
        title: "Tasks completed",
        message: `${selectedTaskIds.size} task${selectedTaskIds.size > 1 ? "s" : ""} marked as complete`,
      })
    }
  }, [selectedTaskIds, bulkUpdate, setSelectedTaskIds, addNotification])

  const handleClearCompleted = useCallback(() => {
    const completedTasks = allTasks.filter((t) => t.status === "completed")
    completedTasks.forEach((task) => deleteTask(task.id))
    addNotification({
      type: "info",
      title: "Completed tasks cleared",
      message: `${completedTasks.length} completed task${completedTasks.length > 1 ? "s" : ""} removed`,
    })
  }, [allTasks, deleteTask, addNotification])

  const handleToggleComplete = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId) || allTasks.find((t) => t.id === taskId)
      if (task) {
        const updates =
          task.status === "completed"
            ? { status: "active", completedAt: null }
            : { status: "completed", completedAt: new Date().toISOString() }

        updateTask(taskId, updates)
        addNotification({
          type: "success",
          title: task.status === "completed" ? "Task reactivated" : "Task completed",
          message: `"${task.title}" ${task.status === "completed" ? "marked as active" : "marked as complete"}`,
        })
      }
    },
    [tasks, allTasks, updateTask, addNotification],
  )

  const handleCyclePriority = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        cyclePriority(taskId)
        const priorities = ["P0", "P1", "P2", "P3"]
        const currentIndex = priorities.indexOf(task.priority)
        const nextPriority = priorities[(currentIndex + 1) % priorities.length]
        addNotification({
          type: "info",
          title: "Priority updated",
          message: `"${task.title}" priority changed to ${nextPriority}`,
        })
      }
    },
    [tasks, cyclePriority, addNotification],
  )

  const handleSaveEdit = useCallback(
    (taskId: string, updates: any) => {
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        updateTask(taskId, updates)
        setEditingTaskId(null)
        addNotification({
          type: "success",
          title: "Task updated",
          message: `"${updates.title || task.title}" has been updated`,
        })
      }
    },
    [tasks, updateTask, setEditingTaskId, addNotification],
  )

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        deleteTask(taskId)
        addNotification({
          type: "warning",
          title: "Task deleted",
          message: `"${task.title}" has been deleted`,
        })
      }
    },
    [tasks, deleteTask, addNotification],
  )

  const handleAddTask = useCallback(
    (taskData: any) => {
      createTask(taskData.title, {
        description: taskData.description,
        priority: taskData.priority,
        tags: taskData.tags,
        project: taskData.project,
        dueAt: taskData.dueAt,
      })
      addNotification({
        type: "success",
        title: "Task created",
        message: `"${taskData.title}" has been added to your list`,
      })
    },
    [createTask, addNotification],
  )

  const activeTasks = tasks.filter((t) => t.status === "active")
  const completedTasks = allTasks.filter((t) => t.status === "completed")
  const snoozedTasks = tasks.filter((t) => t.status === "snoozed")

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--sls-bg-dark)" }}>
        <div className="text-center animate-fade-in">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-transparent border-t-white mx-auto mb-6"></div>
            <div
              className="absolute inset-0 rounded-full h-12 w-12 border-2 border-transparent border-r-red-500 animate-spin mx-auto"
              style={{ animationDirection: "reverse", animationDuration: "0.8s" }}
            ></div>
          </div>
          <p className="text-lg animate-pulse-subtle" style={{ color: "var(--sls-text-light)" }}>
            Loading your tasks...
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: "0ms" }}></div>
            <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: "150ms" }}></div>
            <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: "300ms" }}></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen animate-fade-in" style={{ backgroundColor: "var(--sls-bg-dark)" }}>
      <NotificationToast notifications={notifications} onRemove={removeNotification} />

      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <header className="mb-16 animate-slide-in-down">
          <h1
            className="text-4xl font-bold mb-2 tracking-tight"
            style={{
              color: "var(--sls-text-light)",
              fontFamily: "Arial, sans-serif",
              lineHeight: "1.1",
            }}
          >
            My Tasks
          </h1>
          <p className="text-lg mb-4" style={{ color: "var(--sls-muted)" }}>
            Build a content machine that turns attention into action
          </p>

          <div className="mb-6 p-4 bg-black/20 rounded-lg border border-white/10">
            <label
              htmlFor="userIdentifier"
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--sls-text-light)" }}
            >
              Your Identifier (email or name):
            </label>
            <input
              id="userIdentifier"
              type="text"
              value={userIdentifier}
              onChange={(e) => setUserIdentifier(e.target.value.trim())}
              placeholder="example@email.com"
              className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
              style={{ color: "var(--sls-text-light)" }}
            />
            {!userIdentifier && (
              <p className="text-xs mt-2" style={{ color: "var(--sls-text-secondary)" }}>
                Enter your identifier to view and create your tasks
              </p>
            )}
          </div>

          {userIdentifier && (
            <>
              {/* Stats and Controls */}
              <div className="flex items-center justify-between mb-6">
                <div
                  className="flex items-center gap-4 text-sm animate-slide-in-up"
                  style={{ color: "var(--sls-muted)", animationDelay: "0.1s" }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--sls-primary)" }}></div>
                    <span>{activeTasks.length} active</span>
                  </div>
                  <span>•</span>
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:bg-white/5 px-2 py-1 rounded transition-colors duration-200"
                    onClick={() => setShowCompleted(!showCompleted)}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--sls-muted)" }}></div>
                    <span className="hover:text-white transition-colors">{completedTasks.length} completed</span>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${showCompleted ? "rotate-180" : ""}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  {snoozedTasks.length > 0 && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span>{snoozedTasks.length} snoozed</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Bulk Actions */}
                {selectedTaskIds.size > 0 && (
                  <div className="flex items-center gap-2 animate-fade-in">
                    <span className="text-sm" style={{ color: "var(--sls-muted)" }}>
                      {selectedTaskIds.size} selected
                    </span>
                    <button className="btn-secondary text-sm px-3 py-1" onClick={handleBulkComplete}>
                      Complete
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-black/20 rounded-lg p-3 mb-6">
                <div className="text-xs" style={{ color: "var(--sls-text-secondary)" }}>
                  <div className="font-medium mb-2" style={{ color: "var(--sls-text-light)" }}>
                    Keyboard Shortcuts:
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    <div>
                      <kbd className="kbd">E</kbd> Edit task
                    </div>
                    <div>
                      <kbd className="kbd">P</kbd> Change priority
                    </div>
                    <div>
                      <kbd className="kbd">Del</kbd> Delete selected
                    </div>
                    <div>
                      <kbd className="kbd">Ctrl+A</kbd> Select all
                    </div>
                    <div>
                      <kbd className="kbd">Ctrl+Z</kbd> Undo action
                    </div>
                    <div>
                      <kbd className="kbd">Esc</kbd> Clear selection
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </header>

        {userIdentifier ? (
          <>
            {/* Undo Toast */}
            {canUndo && lastUndoAction && (
              <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg animate-slide-in-up flex items-center gap-3">
                <span>Task deleted</span>
                <button className="text-blue-400 hover:text-blue-300 font-medium" onClick={undo}>
                  Undo
                </button>
              </div>
            )}

            <div className="animate-slide-in-up" style={{ animationDelay: "0.2s" }}>
              <AddTaskForm onAddTask={handleAddTask} />
            </div>

            <div className="animate-slide-in-up" style={{ animationDelay: "0.3s" }}>
              <TaskList
                tasks={activeTasks}
                selectedTaskIds={selectedTaskIds}
                editingTaskId={editingTaskId}
                onToggleComplete={handleToggleComplete}
                onSelect={handleSelect}
                onStartEdit={setEditingTaskId}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={() => setEditingTaskId(null)}
                onDeleteTask={handleDeleteTask}
                onCyclePriority={handleCyclePriority}
              />
            </div>

            {/* Completed Tasks Section - Always show, even if empty */}
            <div className="mt-8">
              <div className="animate-slide-in-up">
                <div
                  className="flex items-center justify-between p-4 bg-black/10 hover:bg-black/20 rounded-lg cursor-pointer transition-all duration-200 mb-4 border border-white/5"
                  onClick={() => setShowCompleted(!showCompleted)}
                >
                  <h3
                    className="text-lg font-medium flex items-center gap-3"
                    style={{ color: "var(--sls-text-light)" }}
                  >
                    <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Completed Tasks ({completedTasks.length})
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium" style={{ color: "var(--sls-text-light)" }}>
                      {showCompleted ? "Hide" : "Show"}
                    </span>
                    <svg
                      className={`w-5 h-5 transition-transform duration-200 text-white ${showCompleted ? "rotate-180" : ""}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414-1.414L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>

                {showCompleted && (
                  <div className="animate-slide-in-up">
                    {completedTasks.length > 0 ? (
                      <>
                        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                          <div
                            className="flex items-center gap-2 text-sm"
                            style={{ color: "var(--sls-text-secondary)" }}
                          >
                            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span>Completed tasks are automatically deleted after 48 hours</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {completedTasks.map((task) => (
                            <div key={task.id} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                              <div className="flex-1">
                                <TaskList
                                  tasks={[task]}
                                  selectedTaskIds={new Set()}
                                  editingTaskId={null}
                                  onToggleComplete={handleToggleComplete}
                                  onSelect={() => { }}
                                  onStartEdit={() => { }}
                                  onSaveEdit={() => { }}
                                  onCancelEdit={() => { }}
                                  onDeleteTask={handleDeleteTask}
                                  onCyclePriority={() => { }}
                                />
                              </div>
                              {task.completedAt && (
                                <div className="ml-4 text-xs" style={{ color: "var(--sls-muted)" }}>
                                  {getTimeUntilDeletion(task.completedAt)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 text-center">
                          <button className="btn-secondary text-sm" onClick={handleClearCompleted}>
                            Clear all completed tasks
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-400 mb-2">
                          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <p className="text-gray-400">No completed tasks yet</p>
                        <p className="text-sm text-gray-500 mt-1">Completed tasks will appear here</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-medium mb-2" style={{ color: "var(--sls-text-light)" }}>
              Identify yourself to start
            </h3>
            <p className="text-gray-400 max-w-md mx-auto">
              Enter your email or name in the field above to view and manage your personal tasks.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
