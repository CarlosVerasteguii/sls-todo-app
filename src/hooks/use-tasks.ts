"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { Task, Priority, TaskFilters, UndoAction, Todo } from "@/types/task"
import { getSortedTasks, filterTasks, toTask, toTasks } from "@/lib/task-utils"
import { ToastNotification } from "@/components/notification-toast"

class UndoManager {
  private history: UndoAction[] = [];

  addAction(action: UndoAction) {
    this.history.push(action);
  }

  getLastAction(): UndoAction | undefined {
    return this.history.pop();
  }

  clear() {
    this.history = [];
  }

  get hasActions(): boolean {
    return this.history.length > 0;
  }
}

interface UseTasksOptions {
  userIdentifier?: string
  addNotification: (notification: Omit<ToastNotification, "id">) => void
}

export function useTasks({ userIdentifier, addNotification }: UseTasksOptions) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [filters, setFilters] = useState<TaskFilters>({ status: ["active", "snoozed"] })
  const [undoManager] = useState(() => new UndoManager())
  const [isIdentifierLocked, setIsIdentifierLocked] = useState<boolean>(false)
  const [lastUndoAction, setLastUndoAction] = useState<UndoAction | null>(null)

  // New states for API calls
  const [loading, setLoading] = useState<boolean>(false)
  const [isMutating, setIsMutating] = useState<boolean>(false) // ADDED
  const [error, setError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const createTask = useCallback(
    async (title: string, options: Partial<Task> = {}) => { // Made async
      if (!userIdentifier) {
        addNotification({
          type: "error",
          title: "Action Blocked",
          message: "Please lock an identifier before creating tasks.",
        });
        return { ok: false, error: "Identifier not locked." }; // Return error object
      }

      setIsMutating(true); // CHANGED
      setError(null);
      setRequestId(null);

      try {
        const payload = {
          identifier: userIdentifier,
          title: title.trim(),
          ...options,
          // Ensure tags are always an array, even if empty or undefined
          tags: options.tags || [],
        };

        const response = await fetch("/api/todos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.ok) {
          const createdTodo = data.data as Todo;
          const createdTask = toTask(createdTodo);
          setTasks((prev) => [createdTask, ...prev]); // optimistic with Task
          addNotification({
            type: "success",
            title: "Task created",
            message: `"${createdTask.title}" has been added.`,
          });
          return { ok: true, id: createdTask.id, request_id: data.request_id };
        } else {
          setError(data.error?.message || "An unknown error occurred");
          setRequestId(data.request_id || null);
          addNotification({
            type: "error",
            title: "API Error",
            message: data.error?.message || "Failed to create task.",
          });
          console.warn("API Error (createTask):", { code: data.error?.code, request_id: data.request_id });
          return { ok: false, error: data.error?.message || "Failed to create task.", request_id: data.request_id };
        }
      } catch (err: any) {
        setError(err.message || "Failed to create task");
        addNotification({
          type: "error",
          title: "Network Error",
          message: err.message || "Failed to create task.",
        });
        console.error("Failed to create task:", err);
        return { ok: false, error: err.message || "Failed to create task." };
      } finally {
        setIsMutating(false); // CHANGED
      }
    },
    [userIdentifier, addNotification, undoManager, setIsMutating, setError, setRequestId], // CHANGED
  )

  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>) => { // Made async
      if (!userIdentifier) {
        addNotification({
          type: "error",
          title: "Action Blocked",
          message: "Please lock an identifier before updating tasks.",
        });
        return null; // Return null on early exit
      }

      setIsMutating(true); // CHANGED
      setError(null);
      setRequestId(null);

      try {
        const payload = {
          identifier: userIdentifier, // Identifier is required for PATCH
          ...updates,
          // Ensure tags are always an array if present in updates
          ...(updates.tags !== undefined && { tags: updates.tags || [] }),
        };

        const response = await fetch(`/api/todos/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.ok) {
          const updatedTaskFromServer = toTask(data.data as Todo);
          setTasks((prev) =>
            prev.map((task) => (task.id === id ? updatedTaskFromServer : task))
          );
          addNotification({
            type: "success",
            title: "Task updated",
            message: `"${updatedTaskFromServer.title}" has been updated.`,
          });

          // Undo manager logic for update
          const oldTask = tasks.find(t => t.id === id); // Need to capture old state before update
          if (oldTask) {
            undoManager.addAction({
              type: "update",
              taskId: id,
              previousState: oldTask,
              timestamp: Date.now(),
            });
          }
          return { ok: true, request_id: data.request_id };
        } else {
          setError(data.error?.message || "An unknown error occurred");
          setRequestId(data.request_id || null);
          addNotification({
            type: "error",
            title: "API Error",
            message: data.error?.message || "Failed to update task.",
          });
          console.warn("API Error (updateTask):", { code: data.error?.code, request_id: data.request_id });
          return { ok: false, error: data.error?.message || "Failed to update task.", request_id: data.request_id };
        }
      } catch (err: any) {
        setError(err.message || "Failed to update task");
        addNotification({
          type: "error",
          title: "Network Error",
          message: err.message || "Failed to update task.",
        });
        console.error("Failed to update task:", err);
        return { ok: false, error: err.message || "Failed to update task." };
      } finally {
        setIsMutating(false); // CHANGED
      }
    },
    [userIdentifier, addNotification, undoManager, tasks, setIsMutating, setError, setRequestId], // CHANGED
  )

  const restoreDeleted = useCallback(
    async (task: Task) => {
      if (!userIdentifier) {
        addNotification({
          type: "error",
          title: "Action Blocked",
          message: "Please lock an identifier to restore tasks.",
        });
        return;
      }

      setLoading(true);
      setIsMutating(true);
      setError(null);
      setRequestId(null);

      try {
        // Re-create the task using POST /api/todos
        const payload = {
          identifier: userIdentifier,
          title: task.title,
          description: task.description,
          priority: task.priority,
          project: task.project,
          tags: task.tags,
          // Do not include 'id' or 'completed' as it's a new creation
        };

        const response = await fetch("/api/todos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.ok) {
          const restoredTask = toTask(data.data as Todo);
          setTasks((prev) => [restoredTask, ...prev]); // Add back to the list
          addNotification({
            type: "success",
            title: "Task Restored",
            message: `"${restoredTask.title}" has been restored.`,
          });
        } else {
          setError(data.error?.message || "An unknown error occurred");
          setRequestId(data.request_id || null);
          addNotification({
            type: "error",
            title: "API Error",
            message: data.error?.message || "Failed to restore task.",
          });
          console.warn("API Error (restoreDeleted):", { code: data.error?.code, request_id: data.request_id });
        }
      } catch (err: any) {
        setError(err.message || "Failed to restore task");
        addNotification({
          type: "error",
          title: "Network Error",
          message: err.message || "Failed to restore task.",
        });
        console.error("Failed to restore task:", err);
      } finally {
        setLoading(false);
        setIsMutating(false);
      }
    },
    [userIdentifier, addNotification, setLoading, setIsMutating, setError, setRequestId],
  );

  const restoreToggled = useCallback(
    async (task: Task, originalCompletedStatus: boolean) => {
      if (!userIdentifier) {
        addNotification({
          type: "error",
          title: "Action Blocked",
          message: "Please lock an identifier to revert task status.",
        });
        return;
      }

      setLoading(true);
      setIsMutating(true);
      setError(null);
      setRequestId(null);

      try {
        const payload = {
          identifier: userIdentifier,
          completed: originalCompletedStatus,
        };

        const response = await fetch(`/api/todos/${task.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.ok) {
          const revertedTask = toTask(data.data as Todo);
          setTasks((prev) =>
            prev.map((t) => (t.id === revertedTask.id ? revertedTask : t))
          );
          addNotification({
            type: "success",
            title: "Status Reverted",
            message: `"${revertedTask.title}" status has been reverted.`,
          });
        } else {
          setError(data.error?.message || "An unknown error occurred");
          setRequestId(data.request_id || null);
          addNotification({
            type: "error",
            title: "API Error",
            message: data.error?.message || "Failed to revert task status.",
          });
          console.warn("API Error (restoreToggled):", { code: data.error?.code, request_id: data.request_id });
        }
      } catch (err: any) {
        setError(err.message || "Failed to revert task status");
        addNotification({
          type: "error",
          title: "Network Error",
          message: err.message || "Failed to revert task status.",
        });
        console.error("Failed to revert task status:", err);
      } finally {
        setLoading(false);
        setIsMutating(false);
      }
    },
    [userIdentifier, addNotification, setLoading, setIsMutating, setError, setRequestId],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      if (!userIdentifier) {
        addNotification({
          type: "error",
          title: "Action Blocked",
          message: "Please lock an identifier before deleting tasks.",
        });
        return;
      }

      const taskToDelete = tasks.find((t) => t.id === id);
      if (!taskToDelete) return;

      // Optimistic update: remove from UI immediately
      setTasks((prev) => prev.filter((t) => t.id !== id));

      setLoading(true);
      setIsMutating(true);
      setError(null);
      setRequestId(null);

      try {
        const response = await fetch(`/api/todos/${id}?identifier=${encodeURIComponent(userIdentifier)}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (data.ok) {
          addNotification({
            type: "success",
            title: "Task Deleted",
            message: `"${taskToDelete.title}" has been deleted.`,
            action: {
              label: "Undo",
              onClick: () => restoreDeleted(taskToDelete),
            },
            duration: 5000, // 5 seconds for undo
          });
          undoManager.addAction({
            type: "delete",
            taskId: id,
            previousState: taskToDelete,
            timestamp: Date.now(),
          });
          setLastUndoAction({
            type: "delete",
            taskId: id,
            previousState: taskToDelete,
            timestamp: Date.now(),
          });
        } else {
          // Revert optimistic update
          setTasks((prev) => [...prev, taskToDelete]);
          setError(data.error?.message || "An unknown error occurred");
          setRequestId(data.request_id || null);
          addNotification({
            type: "error",
            title: "API Error",
            message: data.error?.message || "Failed to delete task.",
          });
          console.warn("API Error (deleteTask):", { code: data.error?.code, request_id: data.request_id });
        }
      } catch (err: any) {
        // Revert optimistic update
        setTasks((prev) => [...prev, taskToDelete]);
        setError(err.message || "Failed to delete task");
        addNotification({
          type: "error",
          title: "Network Error",
          message: err.message || "Failed to delete task.",
        });
        console.error("Failed to delete task:", err);
      } finally {
        setLoading(false);
        setIsMutating(false);
      }
    },
    [userIdentifier, tasks, addNotification, undoManager, restoreDeleted, setLoading, setIsMutating, setError, setRequestId],
  );

  const toggleTaskComplete = useCallback(
    async (id: string) => {
      if (!userIdentifier) {
        addNotification({
          type: "error",
          title: "Action Blocked",
          message: "Please lock an identifier before updating tasks.",
        });
        return;
      }

      const originalTask = tasks.find((t) => t.id === id);
      if (!originalTask) return;

      const newCompletedStatus = !originalTask.completed; // Toggle completed status

      // Optimistic update
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? {
              ...task,
              completed: newCompletedStatus,
              status: newCompletedStatus ? "completed" : "active",
              updatedAt: new Date().toISOString(),
            }
            : task
        )
      );

      setLoading(true);
      setIsMutating(true);
      setError(null);
      setRequestId(null);

      try {
        const payload = {
          identifier: userIdentifier,
          completed: newCompletedStatus,
        };

        const response = await fetch(`/api/todos/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.ok) {
          const updatedTask = toTask(data.data as Todo);
          setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)));
          addNotification({
            type: "success",
            title: newCompletedStatus ? "Task Completed" : "Task Uncompleted",
            message: `"${originalTask.title}" has been marked as ${newCompletedStatus ? "completed" : "uncompleted"}.`,
            action: {
              label: "Undo",
              onClick: () => restoreToggled(originalTask, originalTask.completed), // Pass original completed status
            },
            duration: 5000, // 5 seconds for undo
          });
          undoManager.addAction({
            type: "toggle",
            taskId: id,
            previousState: originalTask,
            timestamp: Date.now(),
          });
          setLastUndoAction({
            type: "toggle",
            taskId: id,
            previousState: originalTask,
            timestamp: Date.now(),
          });
        } else {
          // Revert optimistic update
          setTasks((prev) =>
            prev.map((task) =>
              task.id === id ? { ...task, completed: originalTask.completed, status: originalTask.status, updatedAt: originalTask.updatedAt } : task
            )
          );
          setError(data.error?.message || "An unknown error occurred");
          setRequestId(data.request_id || null);
          addNotification({
            type: "error",
            title: "API Error",
            message: data.error?.message || "Failed to update task status.",
          });
          console.warn("API Error (toggleTaskComplete):", { code: data.error?.code, request_id: data.request_id });
        }
      } catch (err: any) {
        // Revert optimistic update
        setTasks((prev) =>
          prev.map((task) =>
            task.id === id ? { ...task, completed: originalTask.completed, status: originalTask.status, updatedAt: originalTask.updatedAt } : task
          )
        );
        setError(err.message || "Failed to update task status");
        addNotification({
          type: "error",
          title: "Network Error",
          message: err.message || "Failed to update task status.",
        });
        console.error("Failed to update task status:", err);
      } finally {
        setLoading(false);
        setIsMutating(false);
      }
    },
    [userIdentifier, tasks, addNotification, undoManager, restoreToggled, setLoading, setIsMutating, setError, setRequestId],
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

  // Shims to reconcile API surface expected by consumers
  // TODO(doc): Confirm editing flow contract; these wrappers delegate to local state and updateTask
  const beginEdit = useCallback((id: string) => {
    setEditingTaskId(id)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingTaskId(null)
  }, [])

  const saveEdit = useCallback(
    async (id: string, updates: Partial<Task>) => {
      const result = await updateTask(id, updates)
      if (result) {
        setEditingTaskId(null)
        return { ok: true as const, request_id: undefined }
      }
      return { ok: false as const, error: "Failed to save" as const }
    },
    [updateTask]
  )

  const togglePriority = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id)
      if (!task) {
        return { ok: false as const, error: "Task not found" as const }
      }
      const priorities: Priority[] = ["P0", "P1", "P2", "P3"]
      const currentIndex = priorities.indexOf(task.priority)
      const nextPriority = priorities[(currentIndex + 1) % priorities.length]
      const result = await updateTask(id, { priority: nextPriority })
      if (result) {
        return { ok: true as const, request_id: undefined }
      }
      return { ok: false as const, error: "Failed to update priority" as const }
    },
    [tasks, updateTask]
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
      if (lastUndoAction.type === "delete" && lastUndoAction.previousState) {
        restoreDeleted(lastUndoAction.previousState as Task);
        setLastUndoAction(null);
        return;
      }
      if (lastUndoAction.type === "toggle" && lastUndoAction.previousState) {
        restoreToggled(lastUndoAction.previousState as Task, lastUndoAction.previousState.completed);
        setLastUndoAction(null);
        return;
      }
      if (lastUndoAction.type === "bulk_delete" && lastUndoAction.previousState) {
        const tasksToRestore = lastUndoAction.previousState as Task[];
        tasksToRestore.forEach(task => restoreDeleted(task));
        setLastUndoAction(null);
        return;
      }
    }

    const action = undoManager.getLastAction();
    if (!action) return;

    switch (action.type) {
      case "create":
        if (action.taskId) {
          setTasks((prev) => prev.filter((t) => t.id !== action.taskId));
        }
        break;
      case "update":
        if (action.taskId && action.previousState) {
          setTasks((prev) => prev.map((t) => (t.id === action.taskId ? (action.previousState as Task) : t)));
        }
        break;
      case "delete":
        if (action.previousState) {
          setTasks((prev) => [...prev, action.previousState as Task]);
        }
        break;
      case "toggle":
        if (action.taskId && action.previousState) {
          setTasks((prev) => prev.map((t) => (t.id === action.taskId ? (action.previousState as Task) : t)));
        }
        break;
      case "bulk_delete":
        if (action.previousState) {
          const tasksToRestore = action.previousState as Task[];
          setTasks((prev) => [...prev, ...tasksToRestore]);
        }
        break;
      case "bulk":
        if (action.taskIds && action.previousState) {
          const previousTasks = action.previousState as Task[];
          setTasks((prev) =>
            prev.map((task) => {
              const previousTask = previousTasks.find((pt) => pt.id === task.id);
              return previousTask || task;
            })
          );
        }
        break;
    }
  }, [lastUndoAction, undoManager, restoreDeleted, restoreToggled]);

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

  const loadTasks = useCallback(async (identifier: string) => {
    if (!identifier) {
      setTasks([])
      return
    }

    // Abort any ongoing fetch requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    setLoading(true)
    setError(null)
    setRequestId(null)
    setTasks([])

    try {
      const response = await fetch(`/api/todos?identifier=${encodeURIComponent(identifier)}`, { signal })
      const data = await response.json()

      if (data.ok) {
        // Normalize API envelope differences: some return items, others data
        const todos = (data.items ?? data.data ?? []) as Todo[]
        const migrated = toTasks(todos)
        setTasks(migrated)
        setRequestId(data.request_id || null)
        console.log("Loaded tasks (after migrate):", migrated.length)
      } else {
        setError(data.error?.message || "An unknown error occurred")
        setRequestId(data.request_id || null)
        addNotification({
          type: "error",
          title: "API Error",
          message: data.error?.message || "An unknown error occurred",
        })
        console.warn("API Error:", { code: data.error?.code, request_id: data.request_id })
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Fetch aborted:', err.message);
        return;
      }
      setError(err.message || "Failed to load tasks")
      addNotification({
        type: "error",
        title: "Network Error",
        message: err.message || "Failed to load tasks",
      })
      console.error("Failed to load tasks:", err)
    } finally {
      setLoading(false)
      abortControllerRef.current = null;
    }
  }, [addNotification])

  useEffect(() => {
    if (userIdentifier && isIdentifierLocked) {
      loadTasks(userIdentifier)
    } else if (!isIdentifierLocked) {
      // If unlocked, clear tasks and reset states
      setTasks([])
      setLoading(false)
      setError(null)
      setRequestId(null)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null;
      }
    }
  }, [userIdentifier, isIdentifierLocked, loadTasks])

  // tasks from state is already filtered by the API. This is our source of truth.
  const allTasksForUI = tasks
  const filteredAndSortedTasks = getSortedTasks(filterTasks(allTasksForUI, filters))

  return {
    tasks: filteredAndSortedTasks,
    allTasks: allTasksForUI,
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
    // Reconciled surface
    isMutating,
    beginEdit,
    saveEdit,
    cancelEdit,
    togglePriority,
    bulkUpdate,
    bulkDelete,
    undo,
    canUndo: Boolean(lastUndoAction) && Date.now() - lastUndoAction!.timestamp < 5000,
    lastUndoAction,
    isIdentifierLocked,
    setIsIdentifierLocked,
    loading,
    error,
    requestId,
  }
}
