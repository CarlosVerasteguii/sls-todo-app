import type { Todo, Task, TaskFilters, UndoAction } from "@/types/task"

export const PRIORITY_COLORS = {
  P0: "#E73725", // SLS red - urgent
  P1: "#F97316", // orange-500 - high
  P2: "#FFA726", // amber - medium
  P3: "#66BB6A", // green - low
} as const

export const PRIORITY_LABELS = {
  P0: "Urgent",
  P1: "High",
  P2: "Medium",
  P3: "Low",
} as const

// Converts API DB row (Todo) into UI Task shape.
export function toTask(todo: Todo): Task {
  // Some backends use `completed`, others `is_complete`; normalize.
  const isCompleted =
    (todo as any).completed ?? (todo as any).is_complete ?? false;

  const updatedAt =
    (todo as any).updated_at ?? (todo as any).updatedAt ?? undefined;

  // If DB doesn't track completed_at, fall back to updatedAt when completed.
  const completedAt =
    isCompleted
      ? (todo as any).completed_at ?? updatedAt ?? new Date().toISOString()
      : null;

  return {
    ...todo,
    status: isCompleted ? "completed" : "active",
    completedAt,
    updatedAt,
  };
}

export function toTasks(todos: Todo[] = []): Task[] {
  return todos.map(toTask);
}

export function getSortedTasks(tasks: Task[], now: Date = new Date()): Task[] {
  const score = (t: Task) => [
    // Group by status first
    t.status === "active" ? 0 : t.status === "snoozed" ? 1 : t.status === "completed" ? 2 : 3,
    // Then by priority
    { P0: 0, P1: 1, P2: 2, P3: 3 }[t.priority],
    // Finally by updated date (most recent first)
    -(t.updatedAt ? new Date(t.updatedAt).getTime() : new Date().getTime()),
  ]

  return tasks.sort((a, b) => {
    const scoreA = score(a)
    const scoreB = score(b)

    for (let i = 0; i < scoreA.length; i++) {
      if (scoreA[i] !== scoreB[i]) {
        return scoreA[i] - scoreB[i]
      }
    }
    return 0
  })
}

export function filterTasks(tasks: Task[], filters: TaskFilters, now: Date = new Date()): Task[] {
  return tasks.filter((task) => {
    // Status filter
    if (filters.status && !filters.status.includes(task.status ?? "active")) return false

    // Priority filter
    if (filters.priority && !filters.priority.includes(task.priority)) return false

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some((tag) => task.tags.includes(tag))
      if (!hasMatchingTag) return false
    }

    // Project filter
    if (filters.project && task.project !== filters.project) return false

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesTitle = task.title.toLowerCase().includes(searchLower)
      const matchesDescription = task.description?.toLowerCase().includes(searchLower)
      const matchesTags = task.tags.some((tag) => tag.toLowerCase().includes(searchLower))
      if (!matchesTitle && !matchesDescription && !matchesTags) return false
    }

    // Due date filters removed (out of scope)

    return true
  })
}

export function migrateTask(oldTask: any): Task {
  // Migrate from old format to new format
  return {
    id: oldTask.id,
    title: oldTask.title,
    description: oldTask.description_ai,
    status: oldTask.is_complete ? "completed" : "active",
    priority: "P2", // default medium priority
    tags: [],
    createdAt: oldTask.created_at || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: oldTask.is_complete ? new Date().toISOString() : undefined,
    ...oldTask,
  }
}

export function getRelativeTime(date: string): string {
  const now = new Date()
  const target = new Date(date)
  const diffMs = target.getTime() - now.getTime()
  const diffHours = Math.round(diffMs / (1000 * 60 * 60))
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffMs < 0) return "overdue"
  if (diffHours < 1) return "in less than 1 hour"
  if (diffHours < 24) return `in ${diffHours} hour${diffHours !== 1 ? "s" : ""}`
  if (diffDays < 7) return `in ${diffDays} day${diffDays !== 1 ? "s" : ""}`
  return target.toLocaleDateString()
}

export class UndoManager {
  private actions: UndoAction[] = []
  private maxActions = 20

  addAction(action: UndoAction) {
    this.actions.push(action)
    if (this.actions.length > this.maxActions) {
      this.actions.shift()
    }
  }

  getLastAction(): UndoAction | undefined {
    return this.actions.pop()
  }

  clear() {
    this.actions = []
  }
}
