import { useState, useEffect, useMemo } from 'react'
import { Plus, Check, Trash2, Calendar as CalendarIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Task, Area } from '../types/task'
import { format, isToday, isTomorrow, isAfter } from 'date-fns'

const TodoList = () => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTodoText, setNewTodoText] = useState('')
  const [selectedArea, setSelectedArea] = useState<Area | 'All Areas'>('All Areas')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'today' | 'overdue' | 'recurring' | 'completedToday' | 'tomorrow'>('all')
  const [userId, setUserId] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editFormData, setEditFormData] = useState<Partial<Task>>({})

  // Debug: Log when filter changes
  useEffect(() => {
    console.log('Filter changed to:', filter)
  }, [filter])

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id || null)
    }
    getUser()
  }, [])

  // Fetch tasks from Supabase
  useEffect(() => {
    if (!userId) return
    fetchTasks()
  }, [userId])

  const fetchTasks = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('TG To Do List')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform Supabase data to match our Task interface
      const transformedTasks: Task[] = (data || []).map(row => ({
        id: row.id?.toString() || '',
        task_name: row.task_name || '',
        description: row.description || '',
        area: row.area as Area || 'Personal',
        task_type: row.task_type || '',
        status: row.status || 'Not started',
        automation: row.automation || 'Manual',
        priority: row.priority || 'Medium',
        effort_level: row.effort_level || '$ Lil Money',
        due_date: row.due_date ? new Date(row.due_date) : null,
        completed_at: row.completed_at ? new Date(row.completed_at) : null,
        past_due: row.past_due || false,
        created_at: row.created_at ? new Date(row.created_at) : new Date(),
        updated_at: row.updated_at ? new Date(row.updated_at) : new Date(),
        recurring_type: row.recurring_type || 'none',
        recurring_interval: row.recurring_interval || 1,
        recurring_days: row.recurring_days || null,
        last_recurring_date: row.last_recurring_date ? new Date(row.last_recurring_date) : null,
        is_recurring_template: row.is_recurring_template || false,
        original_recurring_task_id: row.original_recurring_task_id || null,
        hours_projected: row['Hours Projected'] ? Number(row['Hours Projected']) : null,
        hours_worked: row['Hours Worked'] ? Number(row['Hours Worked']) : null,
        scheduled_start: row.scheduled_start ? new Date(row.scheduled_start) : null,
        scheduled_end: row.scheduled_end ? new Date(row.scheduled_end) : null,
        checklist: row.checklist ? JSON.parse(row.checklist) : []
      }))

      setTasks(transformedTasks)
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const addTodo = async () => {
    if (!newTodoText.trim() || !userId) return

    try {
      const { error } = await supabase
        .from('TG To Do List')
        .insert({
          task_name: newTodoText,
          description: '',
          area: selectedArea === 'All Areas' ? 'Personal' : selectedArea,
          task_type: '',
          status: 'Not started',
          automation: 'Manual',
          priority: 'Medium',
          effort_level: '$ Lil Money',
          due_date: new Date().toISOString(),
          user_id: userId,
          recurring_type: 'none',
          recurring_interval: 1,
          is_recurring_template: false
        })
        .select()
        .single()

      if (error) throw error

      setNewTodoText('')
      await fetchTasks()
    } catch (error) {
      console.error('Error adding task:', error)
    }
  }

  const toggleTodo = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Done' ? 'Not started' : 'Done'
      const { error } = await supabase
        .from('TG To Do List')
        .update({
          status: newStatus,
          completed_at: newStatus === 'Done' ? new Date().toISOString() : null
        })
        .eq('id', taskId)

      if (error) throw error

      setTasks(prev => prev.map(task =>
        task.id === taskId
          ? { ...task, status: newStatus as any, completed_at: newStatus === 'Done' ? new Date() : null }
          : task
      ))
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const deleteTodo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('TG To Do List')
        .delete()
        .eq('id', id)

      if (error) throw error

      setTasks(prev => prev.filter(task => task.id !== id))
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const updateTask = async () => {
    if (!editingTask) return

    try {
      const { error } = await supabase
        .from('TG To Do List')
        .update({
          task_name: editFormData.task_name || editingTask.task_name,
          description: editFormData.description || editingTask.description,
          area: editFormData.area || editingTask.area,
          task_type: editFormData.task_type || editingTask.task_type,
          priority: editFormData.priority || editingTask.priority,
          effort_level: editFormData.effort_level || editingTask.effort_level,
          due_date: editFormData.due_date ? new Date(editFormData.due_date).toISOString() : editingTask.due_date?.toISOString(),
          recurring_type: editFormData.recurring_type || editingTask.recurring_type,
          'Hours Projected': editFormData.hours_projected ?? editingTask.hours_projected,
          'Hours Worked': editFormData.hours_worked ?? editingTask.hours_worked,
          checklist: editFormData.checklist ? JSON.stringify(editFormData.checklist) : JSON.stringify(editingTask.checklist || [])
        })
        .eq('id', editingTask.id)

      if (error) throw error

      await fetchTasks()
      setEditingTask(null)
      setEditFormData({})
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const createTask = async () => {
    if (!userId || !editFormData.task_name) return

    try {
      const { error } = await supabase
        .from('TG To Do List')
        .insert({
          task_name: editFormData.task_name,
          description: editFormData.description || '',
          area: editFormData.area || 'Personal',
          task_type: editFormData.task_type || '',
          status: 'Not started',
          automation: 'Manual',
          priority: editFormData.priority || 'Medium',
          effort_level: editFormData.effort_level || '$ Lil Money',
          due_date: editFormData.due_date ? new Date(editFormData.due_date).toISOString() : null,
          user_id: userId,
          recurring_type: editFormData.recurring_type || 'None',
          recurring_interval: 1,
          is_recurring_template: false,
          'Hours Projected': editFormData.hours_projected || 0,
          'Hours Worked': editFormData.hours_worked || 0,
          checklist: editFormData.checklist ? JSON.stringify(editFormData.checklist) : JSON.stringify([])
        })

      if (error) throw error

      await fetchTasks()
      setShowAddModal(false)
      setEditFormData({})
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const openEditModal = (task: Task) => {
    console.log('Opening edit modal for task:', task.task_name)
    setEditingTask(task)
    setEditFormData({
      task_name: task.task_name,
      description: task.description,
      area: task.area,
      task_type: task.task_type,
      priority: task.priority,
      effort_level: task.effort_level,
      due_date: task.due_date,
      recurring_type: task.recurring_type,
      hours_projected: task.hours_projected,
      hours_worked: task.hours_worked,
      checklist: task.checklist || []
    })
  }

  const openAddModal = () => {
    console.log('Opening add modal')
    setShowAddModal(true)
    setEditFormData({
      task_name: '',
      description: '',
      area: 'Personal',
      task_type: '',
      priority: 'Medium',
      effort_level: '$ Lil Money',
      due_date: null,
      recurring_type: 'None',
      hours_projected: 0,
      hours_worked: 0,
      checklist: []
    })
  }

  // Filter tasks
  const filteredTasks = useMemo(() => {
    console.log('Filtering with:', { filter, selectedArea, totalTasks: tasks.length })
    let filtered = tasks

    // Filter by area
    if (selectedArea !== 'All Areas') {
      filtered = filtered.filter(task => task.area === selectedArea)
    }

    // Filter by status
    const now = new Date()
    now.setHours(0, 0, 0, 0) // Reset to start of day for accurate comparison

    switch (filter) {
      case 'active':
        filtered = filtered.filter(task => task.status !== 'Done')
        break
      case 'completed':
        filtered = filtered.filter(task => task.status === 'Done')
        break
      case 'completedToday':
        filtered = filtered.filter(task =>
          task.status === 'Done' && task.completed_at && isToday(task.completed_at)
        )
        break
      case 'today':
        filtered = filtered.filter(task =>
          task.due_date && isToday(task.due_date) && task.status !== 'Done'
        )
        break
      case 'tomorrow':
        filtered = filtered.filter(task =>
          task.due_date && isTomorrow(task.due_date) && task.status !== 'Done'
        )
        break
      case 'overdue':
        filtered = filtered.filter(task => {
          if (!task.due_date || task.status === 'Done') return false
          const dueDate = new Date(task.due_date)
          dueDate.setHours(0, 0, 0, 0)
          return dueDate < now && !isToday(task.due_date)
        })
        break
      case 'recurring':
        filtered = filtered.filter(task =>
          task.recurring_type && task.recurring_type !== 'none'
        )
        break
    }

    console.log('Filtered tasks:', filtered.length)
    return filtered
  }, [tasks, selectedArea, filter])

  const stats = useMemo(() => {
    const areaFilteredTasks = selectedArea === 'All Areas'
      ? tasks
      : tasks.filter(t => t.area === selectedArea)

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    return {
      total: areaFilteredTasks.length,
      active: areaFilteredTasks.filter(t => t.status !== 'Done').length,
      completed: areaFilteredTasks.filter(t => t.status === 'Done').length,
      completedToday: areaFilteredTasks.filter(t => t.status === 'Done' && t.completed_at && isToday(t.completed_at)).length,
      today: areaFilteredTasks.filter(t => t.due_date && isToday(t.due_date) && t.status !== 'Done').length,
      tomorrow: areaFilteredTasks.filter(t => t.due_date && isTomorrow(t.due_date) && t.status !== 'Done').length,
      overdue: areaFilteredTasks.filter(t => {
        if (!t.due_date || t.status === 'Done') return false
        const dueDate = new Date(t.due_date)
        dueDate.setHours(0, 0, 0, 0)
        return dueDate < now && !isToday(t.due_date)
      }).length,
      recurring: areaFilteredTasks.filter(t => t.recurring_type && t.recurring_type !== 'none').length,
    }
  }, [tasks, selectedArea])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'border-l-red-500 bg-red-50'
      case 'Medium': return 'border-l-yellow-500 bg-yellow-50'
      case 'Low': return 'border-l-green-500 bg-green-50'
      default: return 'border-l-gray-300 bg-white'
    }
  }

  const getAreaColor = (area: Area) => {
    switch (area) {
      case 'Full Stack': return 'bg-green-100 text-green-700'
      case 'Huge Capital': return 'bg-purple-100 text-purple-700'
      case 'S4': return 'bg-blue-100 text-blue-700'
      case '808': return 'bg-yellow-100 text-yellow-700'
      case 'Personal': return 'bg-pink-100 text-pink-700'
      case 'Golf': return 'bg-orange-100 text-orange-700'
      case 'Health': return 'bg-emerald-100 text-emerald-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const areas: (Area | 'All Areas')[] = ['All Areas', 'Personal', 'Full Stack', 'Huge Capital', '808', 'S4', 'Golf', 'Health']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading tasks...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">To-Do List</h2>
        <p className="text-gray-600 mt-1">Connected to Supabase • {tasks.length} total tasks</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`bg-white rounded-lg shadow-sm p-4 border-2 transition-all ${
            filter === 'all' ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`bg-white rounded-lg shadow-sm p-4 border-2 transition-all ${
            filter === 'active' ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-sm text-gray-500">Active</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{stats.active}</div>
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`bg-white rounded-lg shadow-sm p-4 border-2 transition-all ${
            filter === 'completed' ? 'border-green-500' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-sm text-gray-500">Completed</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</div>
        </button>
        <button
          onClick={() => setFilter('completedToday')}
          className={`bg-white rounded-lg shadow-sm p-4 border-2 transition-all ${
            filter === 'completedToday' ? 'border-green-500' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-sm text-gray-500">Completed Today</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{stats.completedToday}</div>
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <button
          onClick={() => setFilter('today')}
          className={`bg-white rounded-lg shadow-sm p-4 border-2 transition-all ${
            filter === 'today' ? 'border-yellow-500' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-sm text-gray-500">Due Today</div>
          <div className="text-2xl font-bold text-yellow-600 mt-1">{stats.today}</div>
        </button>
        <button
          onClick={() => setFilter('tomorrow')}
          className={`bg-white rounded-lg shadow-sm p-4 border-2 transition-all ${
            filter === 'tomorrow' ? 'border-orange-500' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-sm text-gray-500">Due Tomorrow</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">{stats.tomorrow}</div>
        </button>
        <button
          onClick={() => setFilter('overdue')}
          className={`bg-white rounded-lg shadow-sm p-4 border-2 transition-all ${
            filter === 'overdue' ? 'border-red-500' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-sm text-gray-500">Overdue</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{stats.overdue}</div>
        </button>
        <button
          onClick={() => setFilter('recurring')}
          className={`bg-white rounded-lg shadow-sm p-4 border-2 transition-all ${
            filter === 'recurring' ? 'border-purple-500' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-sm text-gray-500">Recurring</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">{stats.recurring}</div>
        </button>
      </div>

      {/* Area Filter */}
      <div className="flex gap-2 flex-wrap">
        {areas.map(area => (
          <button
            key={area}
            onClick={() => setSelectedArea(area)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedArea === area
                ? area === 'All Areas'
                  ? 'bg-blue-600 text-white'
                  : `${getAreaColor(area as Area)}`
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {area}
          </button>
        ))}
      </div>

      {/* Add New Todo */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <button
          onClick={openAddModal}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add New Task
        </button>
      </div>

      {/* Todo List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 border border-gray-200 text-center">
            <p className="text-gray-500">No tasks found for this filter.</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              onDoubleClick={() => openEditModal(task)}
              className={`rounded-lg shadow-sm p-4 border-l-4 border-y border-r border-gray-200 hover:shadow-md transition-all group cursor-pointer ${getPriorityColor(task.priority)}`}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleTodo(task.id, task.status)
                  }}
                  className={`mt-1 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                    task.status === 'Done'
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-300 hover:border-blue-500'
                  }`}
                >
                  {task.status === 'Done' && <Check className="w-4 h-4 text-white" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-lg ${task.status === 'Done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {task.task_name}
                  </p>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getAreaColor(task.area)}`}>
                      {task.area}
                    </span>
                    {task.task_type && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {task.task_type}
                      </span>
                    )}
                    {task.due_date && (
                      <span className={`text-xs flex items-center gap-1 ${
                        isToday(task.due_date) ? 'text-yellow-600 font-medium' :
                        isAfter(new Date(), task.due_date) ? 'text-red-600 font-medium' :
                        'text-gray-500'
                      }`}>
                        <CalendarIcon className="w-3 h-3" />
                        {format(task.due_date, 'MMM d, yyyy')}
                      </span>
                    )}
                    {task.hours_projected && (
                      <span className="text-xs text-gray-500">
                        {task.hours_projected}h projected
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteTodo(task.id)
                  }}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit/Add Task Modal */}
      {(editingTask || showAddModal) && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setEditingTask(null)
            setShowAddModal(false)
            setEditFormData({})
          }}
        >
          <div
            className="bg-gray-900 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white mb-6">
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </h3>

            {/* Task Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Task Name</label>
              <input
                type="text"
                value={editFormData.task_name || ''}
                onChange={(e) => setEditFormData({...editFormData, task_name: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter task name..."
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                value={editFormData.description || ''}
                onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Task description..."
              />
            </div>

            {/* Area and Type */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Area</label>
                <select
                  value={editFormData.area || 'Personal'}
                  onChange={(e) => setEditFormData({...editFormData, area: e.target.value as Area})}
                  className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Personal">Personal</option>
                  <option value="Full Stack">Full Stack</option>
                  <option value="Huge Capital">Huge Capital</option>
                  <option value="S4">S4</option>
                  <option value="808">808</option>
                  <option value="Golf">Golf</option>
                  <option value="Health">Health</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                <input
                  type="text"
                  value={editFormData.task_type || ''}
                  onChange={(e) => setEditFormData({...editFormData, task_type: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Select type..."
                />
              </div>
            </div>

            {/* Priority and Money Maker */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                <select
                  value={editFormData.priority || 'Medium'}
                  onChange={(e) => setEditFormData({...editFormData, priority: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Money Maker</label>
                <select
                  value={editFormData.effort_level || '$ Lil Money'}
                  onChange={(e) => setEditFormData({...editFormData, effort_level: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="$ Lil Money">$ Lil Money</option>
                  <option value="$$ Some Money">$$ Some Money</option>
                  <option value="$$$ Big Money">$$$ Big Money</option>
                  <option value="$$$$ Huge Money">$$$$ Huge Money</option>
                </select>
              </div>
            </div>

            {/* Hours */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Hours Projected</label>
                <input
                  type="number"
                  value={editFormData.hours_projected || 0}
                  onChange={(e) => setEditFormData({...editFormData, hours_projected: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Hours Worked</label>
                <input
                  type="number"
                  value={editFormData.hours_worked || 0}
                  onChange={(e) => setEditFormData({...editFormData, hours_worked: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Due Date */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
              <input
                type="date"
                value={editFormData.due_date ? new Date(editFormData.due_date).toISOString().split('T')[0] : ''}
                onChange={(e) => setEditFormData({...editFormData, due_date: e.target.value ? new Date(e.target.value) : null})}
                className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Recurring */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Recurring</label>
              <select
                value={editFormData.recurring_type || 'None'}
                onChange={(e) => setEditFormData({...editFormData, recurring_type: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="None">None</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>

            {/* Checklist Items */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Checklist Items</label>
              <div className="text-sm text-gray-400">Click 'Add Item' to add more checklist items (max 6)</div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between gap-3">
              <button
                onClick={() => {
                  setEditingTask(null)
                  setShowAddModal(false)
                  setEditFormData({})
                }}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingTask ? updateTask : createTask}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingTask ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TodoList
