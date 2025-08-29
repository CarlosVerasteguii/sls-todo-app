"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import type { Task, Priority } from "@/types/task"

interface EditTaskFormProps {
  task: Task
  onSave: (taskId: string, updates: Partial<Task>) => void
  onCancel: () => void
}

export function EditTaskForm({ task, onSave, onCancel }: EditTaskFormProps) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || "")
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [project, setProject] = useState(task.project || "")
  const [tags, setTags] = useState(task.tags.join(", "))
  const [dueAt, setDueAt] = useState(task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : "")
  const [isExpanded, setIsExpanded] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }

    // Auto-expand if task has description, project, or due date
    if (task.description || task.project || task.dueAt || task.tags.length > 0) {
      setIsExpanded(true)
    }
  }, [task])

  const handleSave = () => {
    const updates: Partial<Task> = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      project: project.trim() || undefined,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    }

    onSave(task.id, updates)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      onCancel()
    }
  }

  const priorityColors = {
    P0: "bg-red-500",
    P1: "bg-orange-500",
    P2: "bg-yellow-500",
    P3: "bg-green-500",
  }

  return (
    <div className="todo-item-edit">
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyPress}
            className="todo-input flex-1"
            placeholder="Task title..."
          />
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn-ghost p-2"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {isExpanded && (
          <div className="space-y-3 pl-4 border-l-2 border-sls-accent/30">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="todo-input w-full resize-none"
              placeholder="Description..."
              rows={2}
            />

            <div className="flex gap-2 flex-wrap">
              <div className="flex gap-1">
                {(["P0", "P1", "P2", "P3"] as Priority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                      priority === p
                        ? `${priorityColors[p]} text-white ring-2 ring-white`
                        : `${priorityColors[p]} opacity-50 hover:opacity-75`
                    }`}
                  >
                    {p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="todo-input"
                placeholder="Project..."
              />
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="todo-input"
                placeholder="Tags (comma separated)..."
              />
            </div>

            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="todo-input"
            />
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn-secondary text-sm px-4 py-2">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary text-sm px-4 py-2" disabled={!title.trim()}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
