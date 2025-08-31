"use client"

import { useState, useEffect, useCallback } from "react"
import { TaskList } from "@/components/task-list"
import { AddTaskForm } from "@/components/add-task-form"
import { NotificationToast, type ToastNotification } from "@/components/notification-toast"
import { useTasks } from "@/hooks/use-tasks"
import type { Task, Priority } from '@/types/task';

export default function TodoApp() {
  const [userIdentifier, setUserIdentifier] = useState<string>("")
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null); // New state for focused task

  const [notifications, setNotifications] = useState<ToastNotification[]>([])

  const addNotification = useCallback((notification: Omit<ToastNotification, "id">) => {
    const id = Date.now().toString()
    setNotifications((prev) => [...prev, { ...notification, id }])
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

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
    togglePriority,
    bulkUpdate,
    bulkDelete,
    undo,
    canUndo,
    lastUndoAction,
    isIdentifierLocked,
    setIsIdentifierLocked,
    loading, // Use loading from useTasks
    isMutating, // ADDED
    error, // Use error from useTasks
    requestId, // Use requestId from useTasks
    beginEdit,
    saveEdit,
    cancelEdit,
  } = useTasks({ userIdentifier, addNotification }) // Pass addNotification

  useEffect(() => {
    // Este código se ejecuta solo en el cliente, después de la hidratación.
    const savedIdentifier = localStorage.getItem('todoApp:identifier');
    if (savedIdentifier) {
      setUserIdentifier(savedIdentifier);
      setIsIdentifierLocked(true);
    }
  }, [setIsIdentifierLocked]); // Dependencia para asegurar que la función esté disponible

  // Removed local loading state and its useEffect

  const [completedCollapsed, setCompletedCollapsed] = useState(true)

  const handleFocusTask = useCallback((taskId: string) => {
    setFocusedTaskId(taskId);
  }, []);

  const handleLockToggle = () => {
    if (isIdentifierLocked) {
      // Acción de Unlock: limpiar localStorage
      localStorage.removeItem('todoApp:identifier');
      setIsIdentifierLocked(false);
      setUserIdentifier(''); // Opcional: limpiar también el input
    } else if (userIdentifier) {
      // Acción de Lock: guardar en localStorage
      localStorage.setItem('todoApp:identifier', userIdentifier);
      setIsIdentifierLocked(true);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isIdentifierLocked) return; // Only active when identifier is locked

      // Ignore shortcuts if: default prevented, editable element, or IME composition
      const target = e.target as HTMLElement;
      const isEditable = target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.getAttribute('role') === 'textbox';

      if (e.defaultPrevented || isEditable || e.isComposing) {
        return;
      }

      // Handle Enter and Escape within EditTaskForm directly
      if (editingTaskId) {
        // If in editing mode, only allow Enter and Escape to be handled by the form
        // Other keys should be ignored to prevent accidental shortcuts
        if (e.key === 'Enter' || e.key === 'Escape') {
          return; // Let the form handle these
        }
        e.preventDefault(); // Prevent other keys from triggering browser defaults
        return;
      }

      switch (e.key) {
        case "Escape":
          setSelectedTaskIds(new Set());
          setFocusedTaskId(null); // Clear focused task on Escape
          break;
        case "e":
        case "E":
          if (focusedTaskId && !editingTaskId) {
            e.preventDefault();
            beginEdit(focusedTaskId);
          } else if (focusedTaskId === editingTaskId) {
            e.preventDefault();
            cancelEdit();
          }
          break;
        case "p":
        case "P":
          if (focusedTaskId && !editingTaskId) {
            e.preventDefault();
            togglePriority(focusedTaskId);
          }
          break;
        case "Delete":
        case "Backspace":
          if (selectedTaskIds.size > 0) {
            e.preventDefault();
            const idsToDelete = Array.from(selectedTaskIds);
            bulkDelete(idsToDelete);
            setSelectedTaskIds(new Set());
            setFocusedTaskId(null);
          } else if (focusedTaskId && !editingTaskId) {
            e.preventDefault();
            deleteTask(focusedTaskId);
            setFocusedTaskId(null); // Clear focused task after deletion
          }
          break;
        case "a":
        case "A":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const visibleTaskIds = new Set(
              tasks.filter((t: Task) => t.status === "active").map((t: Task) => t.id)
            );
            setSelectedTaskIds(visibleTaskIds);
          }
          break;
        case "z":
        case "Z":
          if ((e.ctrlKey || e.metaKey) && canUndo) {
            e.preventDefault();
            undo();
            addNotification({
              type: "info",
              title: "Action undone",
              message: "Previous action has been restored",
            });
          }
          break;
      }
    };

    if (isIdentifierLocked) {
      document.addEventListener("keydown", handleKeyDown);
    } else {
      document.removeEventListener("keydown", handleKeyDown);
      setFocusedTaskId(null); // Clear focused task when unlocked
      setEditingTaskId(null); // Clear editing task when unlocked
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isIdentifierLocked,
    focusedTaskId,
    editingTaskId,
    tasks,
    canUndo,
    undo,
    deleteTask,
    togglePriority,
    beginEdit,
    cancelEdit,
    setSelectedTaskIds,
    setFocusedTaskId,
    setEditingTaskId,
    addNotification,
    selectedTaskIds,
    bulkDelete,
  ]);

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
      bulkUpdate(Array.from(selectedTaskIds), { completed: true })
      setSelectedTaskIds(new Set())
      addNotification({
        type: "success",
        title: "Tasks completed",
        message: `${selectedTaskIds.size} task${selectedTaskIds.size > 1 ? "s" : ""} marked as complete`,
      })
    }
  }, [selectedTaskIds, bulkUpdate, setSelectedTaskIds, addNotification])

  const handleClearCompleted = useCallback(() => {
    const completedTasks: Task[] = allTasks.filter((t: Task) => t.status === "completed");
    completedTasks.forEach((task: Task) => deleteTask(task.id));
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
        const updates = { completed: !task.completed }

        updateTask(taskId, updates)
        addNotification({
          type: "success",
          title: !task.completed ? "Task completed" : "Task reactivated",
          message: `"${task.title}" marked as ${!task.completed ? "complete" : "active"}`,
        })
      }
    },
    [tasks, allTasks, updateTask, addNotification],
  )

  const handleCyclePriority = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        togglePriority(taskId)
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
    [tasks, togglePriority, addNotification],
  )

  const handleSaveEdit = useCallback(
    (taskId: string, updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'tags'>>) => {
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

  interface AddTaskData {
    title: string;
    description?: string;
    priority?: Priority;
    tags?: string[];
    project?: string;
  }

  const handleAddTask = useCallback(
    (taskData: AddTaskData) => {
      createTask(taskData.title, {
        description: taskData.description,
        priority: taskData.priority,
        tags: taskData.tags,
        project: taskData.project,
      })

    },
    [createTask, addNotification],
  )

  const activeTasks: Task[] = tasks.filter((t: Task) => t.status === "active")
  const completedTasks: Task[] = allTasks.filter((t: Task) => t.status === "completed")
  const snoozedTasks: Task[] = tasks.filter((t: Task) => t.status === "snoozed")

  if (loading && !isMutating) {
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
            <div className="flex gap-2">
              <input
                id="userIdentifier"
                type="text"
                value={userIdentifier}
                onChange={(e) => setUserIdentifier(e.target.value.trim())}
                placeholder="example@email.com"
                className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                style={{ color: "var(--sls-text-light)" }}
                disabled={isIdentifierLocked}
              />
              <button
                onClick={handleLockToggle}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${isIdentifierLocked
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"}
                ${!userIdentifier ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={!userIdentifier}
              >
                {isIdentifierLocked ? "Unlock" : "Lock"}
              </button>
            </div>
            {!userIdentifier && (
              <p className="text-xs mt-2" style={{ color: "var(--sls-text-secondary)" }}>
                Enter your identifier to view and create your tasks
              </p>
            )}
          </div>

          {isIdentifierLocked && (
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
                    onClick={() => setCompletedCollapsed(!completedCollapsed)}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--sls-muted)" }}></div>
                    <span className="hover:text-white transition-colors">{completedTasks.length} completed</span>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${completedCollapsed ? "" : "rotate-180"}`}
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

        {isIdentifierLocked ? (
          <>
            {/* Undo Toast */}
            {Boolean(lastUndoAction) && Date.now() - lastUndoAction!.timestamp < 5000 && (
              <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg animate-slide-in-up flex items-center gap-3">
                <span>Task deleted</span>
                <button className="text-blue-400 hover:text-blue-300 font-medium" onClick={undo}>
                  Undo
                </button>
              </div>
            )}

            <div className="animate-slide-in-up" style={{ animationDelay: "0.2s" }}>
              <AddTaskForm onAddTask={handleAddTask} disabled={!isIdentifierLocked} />
            </div>

            <div className="animate-slide-in-up" style={{ animationDelay: "0.3s" }}>
              <TaskList
                tasks={activeTasks}
                selectedTaskIds={selectedTaskIds}
                editingTaskId={editingTaskId}
                onToggleComplete={handleToggleComplete}
                onSelect={handleSelect}
                focusedTaskId={focusedTaskId}
                onFocus={handleFocusTask}
                saveEdit={saveEdit}
                cancelEdit={cancelEdit}
              />
            </div>

            {/* Completed Tasks Section - Always show, even if empty */}
            <div className="mt-8">
              <div className="animate-slide-in-up">
                <div
                  className="flex items-center justify-between p-4 bg-black/10 hover:bg-black/20 rounded-lg cursor-pointer transition-all duration-200 mb-4 border border-white/5"
                  onClick={() => setCompletedCollapsed(!completedCollapsed)}
                >
                  <h3
                    className="text-lg font-medium flex items-center gap-3"
                    style={{ color: "var(--sls-text-light)" }}
                  >
                    <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Completed Tasks ({completedTasks.length})
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium" style={{ color: "var(--sls-text-light)" }}>
                      {completedCollapsed ? "Show" : "Hide"}
                    </span>
                    <svg
                      className={`w-5 h-5 transition-transform duration-200 ${completedCollapsed ? "" : "rotate-180"}`}
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

                {!completedCollapsed && (
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
                          {completedTasks.map((task: Task) => (
                            <div key={task.id} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                              <div className="flex-1">
                                <TaskList
                                  tasks={[task]}
                                  selectedTaskIds={new Set()}
                                  editingTaskId={null}
                                  onToggleComplete={handleToggleComplete}
                                  onSelect={() => { }}
                                  focusedTaskId={focusedTaskId}
                                  onFocus={handleFocusTask}
                                  saveEdit={saveEdit}
                                  cancelEdit={cancelEdit}
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
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 010-1.414z"
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
