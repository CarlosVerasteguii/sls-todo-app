"use client"

import type { Task } from "@/types/task"
import { TaskItem } from "./task-item"

interface TaskListProps {
  tasks: Task[]
  selectedTaskIds: Set<string>
  editingTaskId: string | null
  onToggleComplete: (taskId: string) => void
  onSelect: (taskId: string, multiSelect?: boolean) => void
  onStartEdit: (taskId: string) => void
  onSaveEdit: (taskId: string, newTitle: string) => void
  onCancelEdit: () => void
  onDeleteTask: (taskId: string) => void
  onCyclePriority: (taskId: string) => void
}

export function TaskList({
  tasks,
  selectedTaskIds,
  editingTaskId,
  onToggleComplete,
  onSelect,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeleteTask,
  onCyclePriority,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-16">
        <p style={{ color: "var(--sls-muted)" }}>No tasks yet. Add your first task above.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          isSelected={selectedTaskIds.has(task.id)}
          isEditing={editingTaskId === task.id}
          onToggleComplete={onToggleComplete}
          onSelect={onSelect}
          onStartEdit={onStartEdit}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
          onDeleteTask={onDeleteTask}
          onCyclePriority={onCyclePriority}
        />
      ))}
    </div>
  )
}
