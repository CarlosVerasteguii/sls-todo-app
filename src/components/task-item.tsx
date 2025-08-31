"use client"

import type React from "react"
import { useState } from "react"
import type { Task, Priority } from "@/types/task"
import { EditTaskForm } from "./edit-task-form"
import { PRIORITY_COLORS, PRIORITY_LABELS, getRelativeTime } from "@/lib/task-utils"
// import { CountdownTimer } from "./countdown-timer"

interface TaskItemProps {
  task: Task
  isSelected: boolean
  isEditing: boolean
  onToggleComplete: (taskId: string) => void
  onSelect: (taskId: string, multiSelect?: boolean) => void
  focusedTaskId: string | null; // New prop
  onFocus: (taskId: string) => void; // New prop
  // Edit wiring from parent (TaskList/page)
  saveEdit: (taskId: string, updates: Partial<Task>) => void
  cancelEdit: () => void
  // Delete wiring from parent (TaskList/page)
  onDelete: (taskId: string) => void
}

export function TaskItem({
  task,
  isSelected,
  isEditing,
  onToggleComplete,
  onSelect,
  focusedTaskId,
  onFocus,
  saveEdit,
  cancelEdit,
  onDelete,
}: TaskItemProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleComplete(task.id)
  }

  const isSnoozed = task.status === "snoozed"

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, [role="button"]')) {
      return
    }
    onSelect(task.id, e.ctrlKey || e.metaKey)
    // Also notify focus so Delete without selection targets this task
    onFocus(task.id)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    // onStartEdit will be called from page.tsx via global keydown
    // if (!task.completed && !isEditing) {
    //   onStartEdit(task.id)
    // }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Keyboard shortcuts will be handled by global listener in page.tsx
    // This handler will be removed or simplified
    // For now, remove the specific key handling
    // switch (e.key) {
    //   case "Enter":
    //   case " ":
    //     e.preventDefault()
    //     if (e.shiftKey) {
    //       onSelect(task.id, true)
    //     } else {
    //       onToggleComplete(task.id)
    //     }
    //     break
    //   case "e":
    //   case "E":
    //     if (!task.completed && !isEditing) {
    //       e.preventDefault()
    //       onStartEdit(task.id)
    //     }
    //     break
    //   case "p":
    //   case "P":
    //     if (!task.completed) {
    //       e.preventDefault()
    //       onCyclePriority(task.id)
    //     }
    //     break
    //   case "Delete":
    //   case "Backspace":
    //     if (isSelected) {
    //       e.preventDefault()
    //       onDeleteTask(task.id)
    //     }
    //     break
    // }
  }

  if (isEditing) {
    return (
      <div className="animate-slide-in-down">
        <EditTaskForm
          task={task}
          onSave={saveEdit}
          onCancel={cancelEdit}
        />
      </div>
    )
  }

  return (
    <div
      className={`group relative overflow-visible rounded-lg border border-white/10 bg-black/20 p-4 transition-all cursor-pointer ${isSelected ? '-translate-y-0.5 ring-2 ring-red-500' : 'hover:shadow-md'} ${task.completed ? 'opacity-80' : ''}`}
      tabIndex={task.id === focusedTaskId ? 0 : -1}
      role="listitem"
      aria-selected={isSelected}
      aria-checked={task.completed}
      onClick={handleCardClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onFocus={() => onFocus(task.id)}
      onMouseEnter={() => setShowDetails(true)}
      onMouseLeave={() => setShowDetails(false)}
    >
      {/* Main row */}
      <div className="flex items-center gap-4">
        {/* Priority Dot */}
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: PRIORITY_COLORS[task.priority as Priority] }}
          title={`Priority: ${PRIORITY_LABELS[task.priority as Priority]}`}
        />

        {/* Complete checkbox */}
        <button
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-500 ${isCompleting ? 'animate-pulse' : ''} ${task.completed ? 'bg-red-600 border-red-600' : 'border-gray-400 bg-transparent'}`}
          onClick={handleToggleComplete}
          aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
          disabled={isCompleting}
        >
          {task.completed && (
            <svg className="w-3 h-3" fill="white" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        {/* Title (centered, grows) */}
        <div className="flex-1">
          <span className={`block text-center truncate ${task.completed ? 'line-through text-gray-400' : 'text-white'} ${isSelected ? 'font-semibold' : 'font-normal'}`}>
            {task.title}
          </span>
        </div>

        {/* Right side badges + actions */}
        <div className="flex items-center gap-2">
          {isSnoozed && task.snoozedUntil && (
            <span className="px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-300 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
              {getRelativeTime(task.snoozedUntil)}
            </span>
          )}
          <button
            className="p-2 rounded-full hover:bg-white/10 transition-opacity opacity-0 group-hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            aria-label="Delete task"
            title="Delete task"
          >
            <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" />
              <path fillRule="evenodd" d="M4 6h12v1H4V6zm3-2a2 2 0 012-2h2a2 2 0 012 2h3a1 1 0 110 2H4a1 1 0 110-2h3zm1 2h4v1H8V6zM6 17a2 2 0 01-2-2V7h12v8a2 2 0 01-2 2H6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Details section */}
      <div className={`mt-4 space-y-2 transition-opacity ${showDetails || isSelected ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {task.enhanced_description && (
          <p className="text-sm italic text-gray-300">{task.enhanced_description}</p>
        )}
        {Array.isArray(task.steps) && task.steps.length > 0 && (
          <div className="mt-2">
            <h4 className="text-xs font-bold text-gray-500 mb-1">Steps:</h4>
            <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 ml-6">
              {task.steps.map((step, index) => (
                <li key={index}>{String(step)}</li>
              ))}
            </ul>
          </div>
        )}
        {task.project && (
          <p className="text-xs text-gray-500">📁 {task.project}</p>
        )}
      </div>

      {/* Mobile details toggle */}
      <button
        className="md:hidden mt-3 p-2 rounded-full hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-red-500"
        onClick={(e) => { e.stopPropagation(); setShowDetails(!showDetails); }}
        aria-label="Toggle task details"
        title="Show details"
      >
        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  )
}
