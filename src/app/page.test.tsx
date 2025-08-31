import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock useTasks to avoid real fetches and control state
const mockedBulkDelete = vi.fn()
const mockedDeleteTask = vi.fn()
const mockedTogglePriority = vi.fn()

// Expose setter spy to assert selection clearing
let setSelectedTaskIdsSpy: ReturnType<typeof vi.fn> | null = null

const activeTasks = [
  {
    id: 'id-task-1',
    title: 'Task 1',
    description: null,
    priority: 'P2',
    project: null,
    tags: [],
    completed: false,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    identifier_raw: 'john@example.com',
    identifier_norm: 'john@example.com',
  },
  {
    id: 'id-task-2',
    title: 'Task 2',
    description: null,
    priority: 'P2',
    project: null,
    tags: [],
    completed: false,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    identifier_raw: 'john@example.com',
    identifier_norm: 'john@example.com',
  },
]

const completedTask = {
  id: 'id-task-3',
  title: 'Task 3 (done)',
  description: null,
  priority: 'P2',
  project: null,
  tags: [],
  completed: true,
  status: 'completed',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  identifier_raw: 'john@example.com',
  identifier_norm: 'john@example.com',
}

vi.mock('@/hooks/use-tasks', async () => {
  // Use React state inside the mocked hook to emulate real re-renders
  const React = await import('react')
  const { useState } = React
  return {
    useTasks: () => {
      const [selected, setSelected] = useState<Set<string>>(new Set())
      const [focused, setFocused] = useState<string | null>(null)
      const setSelectedTaskIds = vi.fn((next: any) => {
        setSelected((prev) => (typeof next === 'function' ? next(prev) : next))
      })
      const setFocusedTaskId = vi.fn((id: string | null) => setFocused(id))
      setSelectedTaskIdsSpy = setSelectedTaskIds

      return {
        tasks: [...activeTasks],
        allTasks: [...activeTasks, completedTask],
        selectedTaskIds: selected,
        setSelectedTaskIds,
        focusedTaskId: focused,
        setFocusedTaskId,
        editingTaskId: null,
        setEditingTaskId: vi.fn(),
        filters: {},
        setFilters: vi.fn(),
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: mockedDeleteTask,
        toggleTaskComplete: vi.fn(),
        snoozeTask: vi.fn(),
        togglePriority: mockedTogglePriority,
        bulkUpdate: vi.fn(),
        bulkDelete: mockedBulkDelete,
        undo: vi.fn(),
        canUndo: false,
        lastUndoAction: null,
        isIdentifierLocked: true,
        setIsIdentifierLocked: vi.fn(),
        loading: false,
        isMutating: false,
        error: null,
        requestId: null,
        beginEdit: vi.fn(),
        saveEdit: vi.fn(),
        cancelEdit: vi.fn(),
      }
    },
  }
})

// Import after mocking
import TodoApp from '@/app/page'

describe('TodoApp Page', () => {
  beforeEach(() => {
    mockedBulkDelete.mockClear()
    mockedDeleteTask.mockClear()
    mockedTogglePriority.mockClear()
    setSelectedTaskIdsSpy && setSelectedTaskIdsSpy.mockClear()
    // Ensure no input is focused to avoid shortcut suppression
    // Also simulate locked identifier present in storage
    window.localStorage.setItem('todoApp:identifier', 'john@example.com')
  })

  it('should delete all active tasks when user presses CTRL+A then Delete', async () => {
    const user = userEvent.setup()

    render(<TodoApp />)

    // Sanity: page header renders
    expect(await screen.findByText('My Tasks')).toBeInTheDocument()

    // Act: Select all visible (active) tasks, then press Delete
    await user.keyboard('{Control>}{a}{/Control}')
    await user.keyboard('{Delete}')

    // Assert (expected by spec): bulk deletion should trigger with active task IDs
    // This is the failing expectation with current implementation.
    expect(mockedBulkDelete).toHaveBeenCalledTimes(1)
    expect(mockedBulkDelete).toHaveBeenCalledWith(['id-task-1', 'id-task-2'])
  })

  it("should only delete the focused task with 'Delete' if no tasks are selected", async () => {
    const user = userEvent.setup()
    render(<TodoApp />)

    // Click first task to focus + select it, then click again to clear selection while keeping focus
    const task1 = await screen.findByText('Task 1')
    await user.click(task1)
    await user.click(task1)

    await user.keyboard('{Delete}')

    expect(mockedDeleteTask).toHaveBeenCalledTimes(1)
    expect(mockedDeleteTask).toHaveBeenCalledWith('id-task-1')
    expect(mockedBulkDelete).not.toHaveBeenCalled()
  })

  it("should do nothing with 'Delete' if no task is focused and no tasks are selected", async () => {
    const user = userEvent.setup()
    render(<TodoApp />)

    await user.keyboard('{Delete}')

    expect(mockedDeleteTask).not.toHaveBeenCalled()
    expect(mockedBulkDelete).not.toHaveBeenCalled()
  })

  it("should clear selection with 'Escape' key", async () => {
    const user = userEvent.setup()
    render(<TodoApp />)

    // Select all (shows X selected chip)
    await user.keyboard('{Control>}{a}{/Control}')
    expect(await screen.findByText('2 selected')).toBeInTheDocument()

    // Clear selection
    await user.keyboard('{Escape}')
    expect(screen.queryByText('2 selected')).not.toBeInTheDocument()
  })

  it("should not trigger shortcuts if an input field is focused", async () => {
    const user = userEvent.setup()
    render(<TodoApp />)

    const input = screen.getByPlaceholderText('Add new task...') as HTMLInputElement
    await user.click(input)
    await user.type(input, 'Hello')

    await user.keyboard('{Control>}{a}{/Control}')
    await user.keyboard('p')
    await user.keyboard('{Delete}')

    expect(mockedBulkDelete).not.toHaveBeenCalled()
    expect(mockedTogglePriority).not.toHaveBeenCalled()
    expect(mockedDeleteTask).not.toHaveBeenCalled()
    // After Ctrl+A in an input, typing 'p' replaces the content
    expect(input.value).toBe('p')
  })
})
