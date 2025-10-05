import { useState, useEffect, useMemo } from 'react'
import { Plus, Check, Trash2, Calendar as CalendarIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Task, Area } from '../types/task.tsx'
import { format, isToday, isTomorrow } from 'date-fns'

const TodoList = () => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTodoText, setNewTodoText] = useState('')
  const [selectedArea, setSelectedArea] = useState<Area | 'All Areas'>('All Areas')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'today' | 'overdue' | 'recurring' | 'completedToday' | 'tomorrow'>('all')
  const [userId, setUserId] = useState<string | null>(null)

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

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let filtered = tasks

    // Filter by area
    if (selectedArea !== 'All Areas') {
      filtered = filtered.filter(task => task.area === selectedArea)
    }

    // Filter by status
    const now = new Date()
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
        filtered = filtered.filter(task =>
          task.due_date && task.due_date < now && !isToday(task.due_date) && task.status !== 'Done'
        )
        break
      case 'recurring':
        filtered = filtered.filter(task =>
          task.recurring_type && task.recurring_type !== 'none'
        )
        break
    }

    return filtered
  }, [tasks, selectedArea, filter])

  const stats = useMemo(() => {
    const areaFilteredTasks = selectedArea === 'All Areas'
      ? tasks
      : tasks.filter(t => t.area === selectedArea)

    const now = new Date()
    return {
      total: areaFilteredTasks.length,
      active: areaFilteredTasks.filter(t => t.status !== 'Done').length,
      completed: areaFilteredTasks.filter(t => t.status === 'Done').length,
      completedToday: areaFilteredTasks.filter(t => t.status === 'Done' && t.completed_at && isToday(t.completed_at)).length,
      today: areaFilteredTasks.filter(t => t.due_date && isToday(t.due_date) && t.status !== 'Done').length,
      tomorrow: areaFilteredTasks.filter(t => t.due_date && isTomorrow(t.due_date) && t.status !== 'Done').length,
      overdue: areaFilteredTasks.filter(t => t.due_date && t.due_date < now && !isToday(t.due_date) && t.status !== 'Done').length,
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
        <div className="flex gap-3">
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTodo()}
            placeholder="Add a new task..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={addTodo}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Task
          </button>
        </div>
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
              className={`rounded-lg shadow-sm p-4 border-l-4 border-y border-r border-gray-200 hover:shadow-md transition-all group ${getPriorityColor(task.priority)}`}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <button
                  onClick={() => toggleTodo(task.id, task.status)}
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
                  onClick={() => deleteTodo(task.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default TodoList
