"use client"

import type React from "react"
import { useState } from "react"
import type { Task, Priority } from "@/types/task"
import { EditTaskForm } from "./edit-task-form"
import { PRIORITY_COLORS, PRIORITY_LABELS, getRelativeTime } from "@/lib/task-utils"
import { CountdownTimer } from "./countdown-timer"

interface TaskItemProps {
  task: Task
  isSelected: boolean
  isEditing: boolean
  onToggleComplete: (taskId: string) => void
  onSelect: (taskId: string, multiSelect?: boolean) => void
  onStartEdit: (taskId: string) => void
  onSaveEdit: (taskId: string, newTitle: string) => void
  onCancelEdit: () => void
  onDeleteTask: (taskId: string) => void
  onCyclePriority: (taskId: string) => void
}

export function TaskItem({
  task,
  isSelected,
  isEditing,
  onToggleComplete,
  onSelect,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeleteTask,
  onCyclePriority,
}: TaskItemProps) {
  const [isCompleting, setIsCompleting] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const isComplete = task.status === "completed" || task.is_complete
  const title = task.title
  const priority = task.priority || "P2"
  const isOverdue = task.dueAt && new Date(task.dueAt) < new Date()
  const isSnoozed = task.status === "snoozed"

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsCompleting(true)
    await new Promise((resolve) => setTimeout(resolve, 150))
    onToggleComplete(task.id)
    setIsCompleting(false)
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, [role="button"]')) {
      return
    }
    onSelect(task.id, e.ctrlKey || e.metaKey)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isComplete && !isEditing) {
      onStartEdit(task.id)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault()
        if (e.shiftKey) {
          onSelect(task.id, true)
        } else {
          onToggleComplete(task.id)
        }
        break
      case "e":
      case "E":
        if (!isComplete && !isEditing) {
          e.preventDefault()
          onStartEdit(task.id)
        }
        break
      case "p":
      case "P":
        if (!isComplete) {
          e.preventDefault()
          onCyclePriority(task.id)
        }
        break
      case "Delete":
      case "Backspace":
        if (isSelected) {
          e.preventDefault()
          onDeleteTask(task.id)
        }
        break
    }
  }

  if (isEditing) {
    return (
      <div className="animate-slide-in-down">
        <EditTaskForm task={task} onSave={onSaveEdit} onCancel={onCancelEdit} />
      </div>
    )
  }

  return (
    <div
      className={`todo-item group animate-slide-in-up cursor-pointer ${isComplete ? "completed" : ""} ${
        isSelected ? "ring-2" : ""
      } focus-ring relative overflow-visible`}
      style={{
        ringColor: isSelected ? "var(--sls-primary)" : "transparent",
        transform: isSelected ? "translateY(-2px)" : "translateY(0)",
        boxShadow: isSelected
          ? "0 8px 24px rgba(231, 55, 37, 0.15), 0 0 0 1px rgba(231, 55, 37, 0.1)"
          : isComplete
            ? "0 1px 4px rgba(0, 0, 0, 0.05)"
            : "0 2px 8px rgba(0, 0, 0, 0.08)",
        borderLeft: isOverdue ? "3px solid #E73725" : "3px solid transparent",
        zIndex: showDetails || isSelected ? 10 : 1,
      }}
      tabIndex={0}
      role="listitem"
      aria-selected={isSelected}
      aria-checked={isComplete}
      onClick={handleCardClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setShowDetails(true)}
      onMouseLeave={() => setShowDetails(false)}
    >
      {/* Priority Dot */}
      <div
        className="flex-shrink-0 w-3 h-3 rounded-full"
        style={{ backgroundColor: PRIORITY_COLORS[priority as Priority] }}
        title={`Priority: ${PRIORITY_LABELS[priority as Priority]}`}
      />

      {/* Checkbox */}
      <button
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 hover:scale-110 focus-ring ${
          isCompleting ? "animate-pulse" : ""
        }`}
        style={{
          borderColor: isComplete ? "var(--sls-primary)" : "var(--sls-muted)",
          backgroundColor: isComplete ? "var(--sls-primary)" : "transparent",
        }}
        onClick={handleToggleComplete}
        aria-label={isComplete ? "Mark as incomplete" : "Mark as complete"}
        disabled={isCompleting}
      >
        {isComplete && (
          <svg className="w-3 h-3 animate-checkmark" fill="white" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className={`transition-all duration-200 ${isComplete ? "line-through" : ""}`}
              style={{
                color: isSelected ? "var(--sls-primary)" : isComplete ? "var(--sls-muted)" : "var(--sls-text-light)",
                fontWeight: isSelected ? "600" : "400",
              }}
            >
              {title}
            </span>

            {task.tags && task.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {task.tags.slice(0, 2).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 text-xs rounded-full bg-sls-primary/20 text-sls-primary whitespace-nowrap"
                  >
                    {tag}
                  </span>
                ))}
                {task.tags.length > 2 && (
                  <div className="relative group/tags">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-sls-muted/20 text-sls-muted cursor-help whitespace-nowrap">
                      +{task.tags.length - 2}
                    </span>

                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover/tags:opacity-100 transition-opacity duration-200 pointer-events-none z-[100] whitespace-nowrap shadow-lg min-w-max">
                      All tags: {task.tags.join(", ")}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Status Badges */}
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

            {isOverdue && !isComplete && (
              <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-300">Overdue</span>
            )}

            {/* Countdown Timer - Now prominently displayed on the right */}
            {task.dueAt && !isComplete && (
              <div className="flex items-center">
                <CountdownTimer
                  dueAt={task.dueAt}
                  className="px-3 py-1 rounded-full bg-black/30 text-white font-medium text-sm border border-white/10"
                />
              </div>
            )}
          </div>
        </div>

        {(showDetails || isSelected) && (
          <div className="mt-2 space-y-1 animate-fade-in relative z-20">
            {task.description && (
              <p className="text-sm" style={{ color: "var(--sls-text-secondary)" }}>
                {task.description}
              </p>
            )}
            {task.project && (
              <p className="text-xs" style={{ color: "var(--sls-muted)" }}>
                📁 {task.project}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {!isComplete && (
          <button
            className="flex-shrink-0 p-2 rounded-full hover:bg-sls-primary/20 transition-all duration-200 focus-ring"
            onClick={(e) => {
              e.stopPropagation()
              onCyclePriority(task.id)
            }}
            aria-label={`Change priority (current: ${PRIORITY_LABELS[priority as Priority]})`}
            title="Cycle priority (P)"
          >
            <div
              className="w-4 h-4 rounded-full border-2"
              style={{ borderColor: PRIORITY_COLORS[priority as Priority] }}
            />
          </button>
        )}

        <button
          className="flex-shrink-0 p-2 rounded-full hover:bg-blue-500/20 transition-all duration-200 focus-ring"
          onClick={(e) => {
            e.stopPropagation()
            onStartEdit(task.id)
          }}
          aria-label="Edit task"
          title="Edit task (E)"
        >
          <svg
            className="w-4 h-4 text-white hover:text-blue-300 transition-colors"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>

        {isSelected && !isComplete && (
          <button
            className="flex-shrink-0 p-2 rounded-full hover:bg-red-500/20 transition-all duration-200 focus-ring animate-fade-in"
            onClick={(e) => {
              e.stopPropagation()
              onDeleteTask(task.id)
            }}
            aria-label="Delete task"
            title="Delete task (Del)"
          >
            <svg
              className="w-4 h-4 text-red-400 hover:text-red-300 transition-colors"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 011.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      <button
        className="md:hidden flex-shrink-0 p-2 rounded-full hover:bg-sls-surface-hover transition-all duration-200 focus-ring"
        onClick={(e) => {
          e.stopPropagation()
          setShowDetails(!showDetails)
        }}
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
