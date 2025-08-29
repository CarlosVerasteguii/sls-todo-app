"use client"

import type React from "react"
import { useState } from "react"
import type { Priority } from "@/types/task"

interface AddTaskFormProps {
  onAddTask: (task: {
    title: string
    description?: string
    priority: Priority
    tags: string[]
    project?: string
  }) => void
  disabled?: boolean
}

export function AddTaskForm({ onAddTask, disabled }: AddTaskFormProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<Priority>("P2")
  const [project, setProject] = useState("")
  const [tags, setTags] = useState("")
  const [error, setError] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError("Please enter a task title")
      return
    }

    const taskData = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      tags: tags.trim()
        ? tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
      project: project.trim() || undefined,
    }

    onAddTask(taskData)

    setTitle("")
    setDescription("")
    setPriority("P2")
    setProject("")
    setTags("")
    setError("")
    setIsExpanded(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    if (error) setError("")
  }

  const priorityColors = {
    P0: "#ef4444", // red-500
    P1: "#f97316", // orange-500
    P2: "#eab308", // yellow-500
    P3: "#22c55e", // green-500
  }

  const priorityLabels = {
    P0: "Critical",
    P1: "High",
    P2: "Medium",
    P3: "Low",
  }

  return (
    <div className="mb-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Add new task..."
              className={`todo-input w-full ${error ? "border-red-500" : ""}`}
              value={title}
              onChange={handleTitleChange}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsExpanded(true)}
            />
            {error && <p className="text-red-400 text-sm mt-1 animate-fade-in">{error}</p>}
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn-secondary px-4 py-2 min-w-[44px] flex items-center justify-center"
            title={isExpanded ? "Collapse form" : "Expand form"}
            aria-label={isExpanded ? "Collapse form" : "Expand form"}
          >
            <span className="text-lg font-bold">{isExpanded ? "−" : "+"}</span>
          </button>
        </div>

        {isExpanded && (
          <div className="space-y-4 animate-slide-down bg-sls-surface/50 p-4 rounded-lg border border-sls-border">
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-sls-text-light mb-2">Description</label>
              <textarea
                placeholder="Add task description..."
                className="todo-input w-full h-20 resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Priority and Project row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-sls-text-light mb-2">Priority</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["P0", "P1", "P2", "P3"] as Priority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                        priority === p
                          ? "bg-sls-primary text-white ring-2 ring-sls-primary/50"
                          : "bg-sls-surface border border-sls-border text-sls-text-light hover:bg-sls-surface-hover hover:border-sls-primary/30"
                      }`}
                      title={`${priorityLabels[p]} Priority`}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: priorityColors[p] }} />
                      <span>{p}</span>
                      <span className="text-xs opacity-75">({priorityLabels[p]})</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-sls-text-light mb-2">Project</label>
                <input
                  type="text"
                  placeholder="Project name..."
                  className="todo-input w-full"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-sls-text-light mb-2">Tags</label>
              <input
                type="text"
                placeholder="tag1, tag2, tag3..."
                className="todo-input w-full"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <p className="text-xs text-sls-text-muted mt-1">Separate tags with commas</p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          {isExpanded && (
            <button type="button" onClick={() => setIsExpanded(false)} className="btn-secondary px-4 py-2">
              Cancel
            </button>
          )}
          <button type="submit" className="btn-primary px-6 py-2 font-medium" disabled={disabled}>
            Add Task
          </button>
        </div>
      </form>
    </div>
  )
}
