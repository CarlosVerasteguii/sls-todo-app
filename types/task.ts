export type TaskStatus = "active" | "completed" | "snoozed" | "archived" | "deleted"
export type Priority = "P0" | "P1" | "P2" | "P3" // P0 = urgent

export interface ChecklistItem {
  id: string
  title: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  tags: string[]
  project?: string
  dueAt?: string // ISO
  snoozedUntil?: string // ISO
  recurrence?: "none" | "daily" | "weekly" | "monthly"
  checklist?: ChecklistItem[]
  estimatedMin?: number
  actualMin?: number
  createdAt: string // ISO
  updatedAt: string
  completedAt?: string
  userIdentifier?: string

  // Legacy fields for backward compatibility
  is_complete?: boolean
  created_at?: string
  user_key?: string
  description_ai?: string
  steps_ai?: any[]
}

export interface TaskFilters {
  status?: TaskStatus[]
  priority?: Priority[]
  tags?: string[]
  project?: string
  search?: string
  showOverdue?: boolean
  showToday?: boolean
}

export interface UndoAction {
  type: "create" | "update" | "delete" | "bulk"
  taskId?: string
  taskIds?: string[]
  previousState?: Task | Task[]
  timestamp: number
}
