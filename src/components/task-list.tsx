"use client"

import type { Task } from "@/types/task"
import { TaskItem } from "./task-item"

interface TaskListProps {
  tasks: Task[]
  selectedTaskIds: Set<string>
  editingTaskId: string | null
  onToggleComplete: (taskId: string) => void
  onSelect: (taskId: string, multiSelect?: boolean) => void
  focusedTaskId: string | null; // New prop
  onFocus: (taskId: string) => void; // New prop
  saveEdit: (id: string, updates: Partial<Task>) => void;
  cancelEdit: () => void;
}

export function TaskList({
  tasks,
  selectedTaskIds,
  editingTaskId,
  onToggleComplete,
  onSelect,
  focusedTaskId,
  onFocus,
  saveEdit,
  cancelEdit,
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
          focusedTaskId={focusedTaskId}
          onFocus={onFocus}
          saveEdit={saveEdit}
          cancelEdit={cancelEdit}
        />
      ))}
    </div>
  )
}
