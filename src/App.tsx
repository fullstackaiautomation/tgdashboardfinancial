import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

type Area = 'Full Stack' | 'S4' | '808' | 'Personal' | 'Huge Capital' | 'Golf' | 'Health'
type EffortLevel = '$$$ MoneyMaker' | '$ Lil Money' | '-$ Save Dat Money' | ':( Pointless' | '8) JusVibin'
type Priority = 'Low' | 'Medium' | 'High'
type RecurringType = 'none' | 'daily' | 'daily_weekdays' | 'weekly' | 'monthly' | 'custom'

interface Task {
  id: string
  task_name: string
  description: string
  area: Area
  task_type: string
  status: string
  priority: Priority | undefined
  due_date: string | null
  completed_at: string | null
  hours_projected: number | null
  effort_level: EffortLevel | undefined
  updated_at: string | null
  hours_worked: number | undefined
  recurring_template: string | null
  recurring_type: RecurringType | undefined
}

function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('tgrassmick@gmail.com')
  const [password, setPassword] = useState('Grassmick1')
  const [error, setError] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [deepWorkSessions, setDeepWorkSessions] = useState<any[]>([])
  const [selectedArea, setSelectedArea] = useState<Area | 'All Areas'>('All Areas')
  const [activeMainTab, setActiveMainTab] = useState<'daily'>('daily')
  const [activeSubTab, setActiveSubTab] = useState<'todo' | 'schedule' | 'deepwork'>('todo')
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<'All Time' | 'Today' | 'This Week' | 'This Month'>('All Time')
  const [selectedDWArea, setSelectedDWArea] = useState<Area | 'All Areas'>('All Areas')
  const [selectedEffortLevel, setSelectedEffortLevel] = useState<string>('All Levels')
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<any>({})
  const [chartView, setChartView] = useState<'areas' | 'effort'>('areas')
  const [chartDateRange, setChartDateRange] = useState<'all' | 'monthly' | 'weekly' | 'custom'>('all')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [taskFormData, setTaskFormData] = useState<Partial<Task>>({})
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [datePickerTask, setDatePickerTask] = useState<Task | null>(null)
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'completed' | 'recurring' | 'overdue' | 'dueToday' | 'completedToday' | 'dueTomorrow'>('all')
  const [editingField, setEditingField] = useState<{ taskId: string, field: string } | null>(null)
  const [dwSessionTask, setDwSessionTask] = useState<Task | null>(null)
  const [dwSessionTaskType, setDwSessionTaskType] = useState<string>('')
  const [dwSessionFocusArea, setDwSessionFocusArea] = useState<Area | ''>('')
  const [dwTaskSearchTerm, setDwTaskSearchTerm] = useState<string>('')
  const [showDwTaskDropdown, setShowDwTaskDropdown] = useState<boolean>(false)
  const [timerRunning, setTimerRunning] = useState<boolean>(false)
  const [timerPaused, setTimerPaused] = useState<boolean>(false)
  const [timerSeconds, setTimerSeconds] = useState<number>(0)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      if (session) {
        fetchTasks(session.user.id)
        fetchDeepWorkSessions(session.user.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchTasks(session.user.id)
        fetchDeepWorkSessions(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (timerRunning && !timerPaused) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timerRunning, timerPaused])

  const fetchTasks = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('TG To Do List')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  const fetchDeepWorkSessions = async (userId: string) => {
    console.log('🔵 fetchDeepWorkSessions called for user:', userId)
    try {
      const { data, error } = await supabase
        .from('deep_work_log')
        .select(`
          *,
          task:task_id (
            task_name
          )
        `)
        .eq('user_id', userId)
        .order('start_time', { ascending: false })

      if (error) {
        console.error('🔴 Fetch error:', error)
        throw error
      }

      console.log('✅ Fetched sessions:', data?.length || 0, 'sessions')
      console.log('📊 Sessions data:', data)
      setDeepWorkSessions(data || [])
    } catch (error) {
      console.error('Error fetching deep work sessions:', error)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (error: any) {
      setError(error.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const toggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Done' ? 'Not started' : 'Done'
    try {
      const { error } = await supabase
        .from('TG To Do List')
        .update({
          status: newStatus,
          completed_at: newStatus === 'Done' ? new Date().toISOString() : null
        })
        .eq('id', taskId)

      if (error) throw error
      if (session) fetchTasks(session.user.id)
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return

    try {
      const { error } = await supabase
        .from('TG To Do List')
        .delete()
        .eq('id', taskId)

      if (error) throw error
      if (session) fetchTasks(session.user.id)
      setEditingTask(null)
      setShowAddTaskModal(false)
      setTaskFormData({})
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const updateTaskDueDate = async (taskId: string, newDate: string, isCompleted: boolean = false) => {
    try {
      const updateData = isCompleted
        ? { completed_at: newDate, updated_at: new Date().toISOString() }
        : { due_date: newDate }

      const { error } = await supabase
        .from('TG To Do List')
        .update(updateData)
        .eq('id', taskId)

      if (error) throw error
      if (session) fetchTasks(session.user.id)
      setShowDatePicker(false)
      setDatePickerTask(null)
    } catch (error) {
      console.error('Error updating task date:', error)
    }
  }

  const startTimer = () => {
    setTimerRunning(true)
    setTimerPaused(false)
    setSessionStartTime(new Date())
  }

  const pauseTimer = () => {
    setTimerPaused(!timerPaused)
  }

  const saveSession = async () => {
    console.log('🔵 saveSession called', {
      hasSession: !!session,
      sessionStartTime,
      dwSessionFocusArea,
      timerSeconds,
      durationMinutes: Math.floor(timerSeconds / 60)
    })

    if (session && sessionStartTime && dwSessionFocusArea) {
      try {
        const sessionData = {
          user_id: session.user.id,
          task_id: dwSessionTask?.id || null,
          area: dwSessionFocusArea,
          task_type: dwSessionTaskType || null,
          start_time: sessionStartTime.toISOString(),
          end_time: new Date().toISOString(),
          duration_minutes: Math.floor(timerSeconds / 60)
        }

        console.log('🔵 Inserting session data:', sessionData)

        const { data, error } = await supabase
          .from('deep_work_log')
          .insert(sessionData)
          .select()

        if (error) {
          console.error('🔴 Insert error:', error)
          throw error
        }

        console.log('✅ Session saved successfully:', data)

        if (session) {
          console.log('🔵 Fetching updated sessions for user:', session.user.id)
          await fetchDeepWorkSessions(session.user.id)
        }
      } catch (error) {
        console.error('Error saving deep work session:', error)
      }
    } else {
      console.log('🔴 Cannot save - missing required data:', {
        hasSession: !!session,
        hasStartTime: !!sessionStartTime,
        hasFocusArea: !!dwSessionFocusArea
      })
    }

    setTimerRunning(false)
    setTimerPaused(false)
    setTimerSeconds(0)
    setSessionStartTime(null)
    setDwSessionTask(null)
    setDwSessionTaskType('')
    setDwSessionFocusArea('')
    setDwTaskSearchTerm('')
  }

  const cancelTimerSession = () => {
    setTimerRunning(false)
    setTimerPaused(false)
    setTimerSeconds(0)
    setSessionStartTime(null)
    setDwSessionTask(null)
    setDwSessionTaskType('')
    setDwSessionFocusArea('')
    setDwTaskSearchTerm('')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const startEditingSession = (sessionData: any) => {
    setEditingSessionId(sessionData.id)
    setEditFormData({
      area: sessionData.area,
      task_type: sessionData.task_type,
      task_id: sessionData.task_id,
      effort_level: sessionData.effort_level,
      notes: sessionData.notes,
      duration_minutes: sessionData.duration_minutes,
      start_time: sessionData.start_time,
      end_time: sessionData.end_time
    })
  }

  const cancelEditingSession = () => {
    setEditingSessionId(null)
    setEditFormData({})
  }

  const saveEditedSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('deep_work_log')
        .update({
          area: editFormData.area,
          task_type: editFormData.task_type,
          task_id: editFormData.task_id,
          effort_level: editFormData.effort_level,
          notes: editFormData.notes,
          duration_minutes: editFormData.duration_minutes,
          start_time: editFormData.start_time,
          end_time: editFormData.end_time
        })
        .eq('id', sessionId)

      if (error) throw error
      if (session) fetchDeepWorkSessions(session.user.id)
      setEditingSessionId(null)
      setEditFormData({})
    } catch (error) {
      console.error('Error updating session:', error)
    }
  }

  const deleteSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to delete this session?')) return

    try {
      const { error } = await supabase
        .from('deep_work_log')
        .delete()
        .eq('id', sessionId)

      if (error) throw error
      if (session) fetchDeepWorkSessions(session.user.id)
      setEditingSessionId(null)
      setEditFormData({})
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  const getAreaColor = (area: Area) => {
    const colors: Record<Area, string> = {
      'Full Stack': '#10b981',
      'Huge Capital': '#a855f7',
      'S4': '#3b82f6',
      '808': '#eab308',
      'Personal': '#ec4899',
      'Golf': '#f97316',
      'Health': '#14b8a6'
    }
    return colors[area] || '#6b7280'
  }

  const getTaskTypesByArea = (area: Area | '') => {
    if (area === 'S4') return ['Data', 'Marketing', 'New Build', 'Update Build', 'Sales', 'Planning']
    if (area === 'Huge Capital') return ['Admin', 'New Build', 'Update Build', 'Planning']
    if (area === 'Full Stack') return ['Admin', 'Internal Build', 'Client Build', 'Team', 'Internal Update', 'Client Update', 'Marketing', 'Sales']
    if (area === '808') return ['Online', 'Artists', 'Cost Savings', 'Customer Service', 'Data', 'Fulfillment', 'Automation']
    if (area === 'Personal') return ['Arya', 'Car', 'Cheypow', 'Finances', 'Friends', 'House', 'Life']
    if (area === 'Golf') return ['Content', 'Equipment', 'Practice', 'Golfing', 'Admin']
    if (area === 'Health') return ['Gym', 'Sleep', 'Stretching', 'Walk', 'Yoga']
    return []
  }

  const isToday = (dateStr: string | null) => {
    if (!dateStr) return false
    const taskDateParts = dateStr.split('T')[0].split('-')
    const taskDate = new Date(parseInt(taskDateParts[0]), parseInt(taskDateParts[1]) - 1, parseInt(taskDateParts[2]))
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    taskDate.setHours(0, 0, 0, 0)
    return taskDate.getTime() === today.getTime()
  }

  const isTomorrow = (dateStr: string | null) => {
    if (!dateStr) return false
    const taskDateParts = dateStr.split('T')[0].split('-')
    const taskDate = new Date(parseInt(taskDateParts[0]), parseInt(taskDateParts[1]) - 1, parseInt(taskDateParts[2]))
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    taskDate.setHours(0, 0, 0, 0)
    return taskDate.getTime() === tomorrow.getTime()
  }

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false
    const taskDateParts = dateStr.split('T')[0].split('-')
    const taskDate = new Date(parseInt(taskDateParts[0]), parseInt(taskDateParts[1]) - 1, parseInt(taskDateParts[2]))
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    taskDate.setHours(0, 0, 0, 0)
    return taskDate < today
  }

  let filteredTasks = selectedArea === 'All Areas'
    ? tasks
    : tasks.filter(t => t.area === selectedArea)

  // Apply status filter
  if (selectedStatusFilter !== 'all') {
    switch (selectedStatusFilter) {
      case 'active':
        filteredTasks = filteredTasks.filter(t => t.status !== 'Done')
        break
      case 'completed':
        filteredTasks = filteredTasks.filter(t => t.status === 'Done')
        break
      case 'recurring':
        filteredTasks = filteredTasks.filter(t => t.recurring_type !== null && t.recurring_type !== '' && t.recurring_type !== 'None')
        break
      case 'overdue':
        filteredTasks = filteredTasks.filter(t => isOverdue(t.due_date) && t.status !== 'Done')
        break
      case 'dueToday':
        filteredTasks = filteredTasks.filter(t => isToday(t.due_date) && t.status !== 'Done')
        break
      case 'completedToday':
        filteredTasks = filteredTasks.filter(t => t.status === 'Done' && t.updated_at && isToday(t.updated_at))
        break
      case 'dueTomorrow':
        filteredTasks = filteredTasks.filter(t => isTomorrow(t.due_date) && t.status !== 'Done')
        break
    }
  }

  const stats = {
    active: tasks.filter(t => t.status !== 'Done').length,
    completed: tasks.filter(t => t.status === 'Done').length,
    recurring: tasks.filter(t => t.recurring_type !== null && t.recurring_type !== '' && t.recurring_type !== 'None').length,
    overdue: tasks.filter(t => isOverdue(t.due_date) && t.status !== 'Done').length,
    dueToday: tasks.filter(t => isToday(t.due_date) && t.status !== 'Done').length,
    completedToday: tasks.filter(t => t.status === 'Done' && t.updated_at && isToday(t.updated_at)).length,
    dueTomorrow: tasks.filter(t => isTomorrow(t.due_date) && t.status !== 'Done').length,
  }

  const areaStats = {
    'All Areas': { count: filteredTasks.length, hours: filteredTasks.reduce((sum, t) => sum + (t.hours_projected || 0), 0) },
    'Full Stack': { count: filteredTasks.filter(t => t.area === 'Full Stack').length, hours: filteredTasks.filter(t => t.area === 'Full Stack').reduce((sum, t) => sum + (t.hours_projected || 0), 0) },
    'Huge Capital': { count: filteredTasks.filter(t => t.area === 'Huge Capital').length, hours: filteredTasks.filter(t => t.area === 'Huge Capital').reduce((sum, t) => sum + (t.hours_projected || 0), 0) },
    'S4': { count: filteredTasks.filter(t => t.area === 'S4').length, hours: filteredTasks.filter(t => t.area === 'S4').reduce((sum, t) => sum + (t.hours_projected || 0), 0) },
    'Personal': { count: filteredTasks.filter(t => t.area === 'Personal').length, hours: filteredTasks.filter(t => t.area === 'Personal').reduce((sum, t) => sum + (t.hours_projected || 0), 0) },
    '808': { count: filteredTasks.filter(t => t.area === '808').length, hours: filteredTasks.filter(t => t.area === '808').reduce((sum, t) => sum + (t.hours_projected || 0), 0) },
    'Health': { count: filteredTasks.filter(t => t.area === 'Health').length, hours: filteredTasks.filter(t => t.area === 'Health').reduce((sum, t) => sum + (t.hours_projected || 0), 0) },
    'Golf': { count: filteredTasks.filter(t => t.area === 'Golf').length, hours: filteredTasks.filter(t => t.area === 'Golf').reduce((sum, t) => sum + (t.hours_projected || 0), 0) },
  }

  // Deep Work Session Calculations
  const getFilteredSessions = () => {
    let filtered = deepWorkSessions

    // Filter by time period
    const now = new Date()
    if (selectedTimePeriod === 'Today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      filtered = filtered.filter(s => new Date(s.start_time) >= todayStart)
    } else if (selectedTimePeriod === 'This Week') {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      weekStart.setHours(0, 0, 0, 0)
      filtered = filtered.filter(s => new Date(s.start_time) >= weekStart)
    } else if (selectedTimePeriod === 'This Month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      filtered = filtered.filter(s => new Date(s.start_time) >= monthStart)
    }

    // Filter by area
    if (selectedDWArea !== 'All Areas') {
      filtered = filtered.filter(s => s.area === selectedDWArea)
    }

    // Filter by effort level
    if (selectedEffortLevel !== 'All Levels') {
      filtered = filtered.filter(s => s.effort_level === selectedEffortLevel)
    }

    return filtered
  }

  const filteredDWSessions = getFilteredSessions()

  const dwStats = {
    totalSessions: filteredDWSessions.length,
    totalMinutes: filteredDWSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0),
    avgMinutes: filteredDWSessions.length > 0
      ? Math.round(filteredDWSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / filteredDWSessions.length)
      : 0
  }

  const formatHoursMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const dwAreaCountsArray = [
    { area: 'All Areas', count: filteredDWSessions.length },
    { area: 'Personal', count: filteredDWSessions.filter(s => s.area === 'Personal').length },
    { area: 'Full Stack', count: filteredDWSessions.filter(s => s.area === 'Full Stack').length },
    { area: 'Huge Capital', count: filteredDWSessions.filter(s => s.area === 'Huge Capital').length },
    { area: 'S4', count: filteredDWSessions.filter(s => s.area === 'S4').length },
    { area: '808', count: filteredDWSessions.filter(s => s.area === '808').length },
    { area: 'Health', count: filteredDWSessions.filter(s => s.area === 'Health').length },
    { area: 'Golf', count: filteredDWSessions.filter(s => s.area === 'Golf').length }
  ]

  const effortLevelCounts = {
    'All Levels': filteredDWSessions.length,
    '$$$ MoneyMaker': filteredDWSessions.filter(s => s.effort_level === '$$$ MoneyMaker').length,
    '$ Lil Money': filteredDWSessions.filter(s => s.effort_level === '$ Lil Money').length,
    '-$ Save Dat Money': filteredDWSessions.filter(s => s.effort_level === '-$ Save Dat Money').length,
    ':( Pointless': filteredDWSessions.filter(s => s.effort_level === ':( Pointless').length,
    '8) JusVibin': filteredDWSessions.filter(s => s.effort_level === '8) JusVibin').length
  }

  // Top 5 tasks by duration
  const taskDurations: { [key: string]: { minutes: number, sessions: number, area: string, taskType: string } } = {}
  filteredDWSessions.forEach(session => {
    const taskName = session.task?.task_name || 'Unknown Task'
    if (!taskDurations[taskName]) {
      taskDurations[taskName] = { minutes: 0, sessions: 0, area: session.area, taskType: session.task_type || '' }
    }
    taskDurations[taskName].minutes += session.duration_minutes || 0
    taskDurations[taskName].sessions += 1
  })

  const top5Tasks = Object.entries(taskDurations)
    .sort((a, b) => b[1].minutes - a[1].minutes)
    .slice(0, 5)
    .map(([taskName, data]) => ({
      taskName,
      minutes: data.minutes,
      sessions: data.sessions,
      area: data.area,
      taskType: data.taskType,
      percent: dwStats.totalMinutes > 0 ? Math.round((data.minutes / dwStats.totalMinutes) * 100) : 0
    }))

  // Hours summary by area
  const getHoursByPeriod = (area: Area | 'All', period: 'today' | 'week' | 'month' | 'all') => {
    const now = new Date()
    let start: Date

    if (period === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === 'week') {
      start = new Date(now)
      start.setDate(now.getDate() - now.getDay())
      start.setHours(0, 0, 0, 0)
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
    } else {
      start = new Date(0)
    }

    const sessions = filteredDWSessions.filter(s => {
      if (area !== 'All' && s.area !== area) return false
      return new Date(s.start_time) >= start
    })

    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
    return (totalMinutes / 60).toFixed(2) + 'h'
  }

  const hoursSummary = [
    { area: 'S4', color: '#3b82f6' },
    { area: 'Full Stack', color: '#10b981' },
    { area: 'Personal', color: '#ec4899' },
    { area: 'Huge Capital', color: '#a855f7' },
    { area: '808', color: '#eab308' },
    { area: 'Golf', color: '#f97316' },
    { area: 'Health', color: '#14b8a6' },
  ].map(({ area, color }) => ({
    area,
    color,
    today: getHoursByPeriod(area as Area, 'today'),
    week: getHoursByPeriod(area as Area, 'week'),
    month: getHoursByPeriod(area as Area, 'month'),
    allTime: getHoursByPeriod(area as Area, 'all')
  }))

  if (loading && !session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' }}>
        <div style={{ color: '#9ca3af' }}>Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #3b82f6, #a855f7, #ec4899)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: '32px',
          width: '100%',
          maxWidth: '448px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{
              fontSize: '36px',
              fontWeight: 'bold',
              background: 'linear-gradient(to right, #2563eb, #9333ea)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '8px'
            }}>
              TG Dashboard
            </h1>
            <p style={{ color: '#6b7280' }}>Deep work focused task management</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
                required
              />
            </div>

            {error && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(to right, #2563eb, #9333ea)',
                color: 'white',
                borderRadius: '8px',
                fontWeight: '500',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#1a1a1a', color: '#fff' }}>
      {/* Sticky Sidebar */}
      <div style={{
        width: '240px',
        backgroundColor: '#0f0f0f',
        borderRight: '1px solid #2a2a2a',
        position: 'sticky',
        top: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto'
      }}>
        {/* Logo/Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid #2a2a2a' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            background: 'linear-gradient(to right, #f97316, #eab308)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '4px'
          }}>
            TG Dashboard
          </h1>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>Personal Command Center</p>
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, padding: '16px' }}>
          {/* Main Tab - Daily */}
          <div style={{ marginBottom: '8px' }}>
            <button
              onClick={() => setActiveMainTab('daily')}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: activeMainTab === 'daily' ? '#f97316' : 'transparent',
                color: activeMainTab === 'daily' ? 'white' : '#f97316',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '15px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="12" height="12" rx="2" />
                <path d="M5 8l2 2 4-4" />
              </svg>
              Daily
            </button>
          </div>
        </div>

        {/* User Profile / Sign Out */}
        <div style={{ padding: '16px', borderTop: '1px solid #2a2a2a' }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(to bottom right, #f97316, #eab308)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600',
              marginBottom: '8px'
            }}>
              TG
            </div>
            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
              Taylor Grassmick
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
              {session.user.email}
            </div>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              width: '100%',
              padding: '8px 16px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header with Tabs */}
        <div style={{
          backgroundColor: '#1a1a1a',
          borderBottom: '1px solid #2a2a2a',
          padding: '16px 24px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          <button
            onClick={() => setActiveSubTab('todo')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeSubTab === 'todo' ? '#f97316' : 'transparent',
              color: activeSubTab === 'todo' ? 'white' : '#9ca3af',
              border: activeSubTab === 'todo' ? '2px solid #fb923c' : '2px solid transparent',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="12" height="12" rx="2" />
              <path d="M5 8l2 2 4-4" />
            </svg>
            To-Do List
          </button>
          <button
            onClick={() => setActiveSubTab('schedule')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeSubTab === 'schedule' ? '#f97316' : 'transparent',
              color: activeSubTab === 'schedule' ? 'white' : '#9ca3af',
              border: activeSubTab === 'schedule' ? '2px solid #fb923c' : '2px solid transparent',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="12" height="12" rx="2" />
              <line x1="2" y1="5" x2="14" y2="5" />
              <line x1="5" y1="2" x2="5" y2="5" />
              <line x1="11" y1="2" x2="11" y2="5" />
            </svg>
            Schedule
          </button>
          <button
            onClick={() => setActiveSubTab('deepwork')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeSubTab === 'deepwork' ? '#f97316' : 'transparent',
              color: activeSubTab === 'deepwork' ? 'white' : '#9ca3af',
              border: activeSubTab === 'deepwork' ? '2px solid #fb923c' : '2px solid transparent',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="8" cy="8" r="6" />
              <circle cx="8" cy="8" r="3" />
            </svg>
            Deep Work
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {activeSubTab === 'todo' && (
          <div style={{ display: 'flex', gap: '24px' }}>
            {/* Left Column - Stats & Tasks */}
            <div style={{ flex: 1 }}>
              {/* Stats Grid - Row 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                <button
                  onClick={() => setSelectedStatusFilter('active')}
                  style={{
                    backgroundColor: '#1a1a1a',
                    padding: '20px',
                    borderRadius: '12px',
                    border: selectedStatusFilter === 'active' ? '3px solid #2563eb' : '2px solid #333',
                    cursor: 'pointer',
                    color: 'white',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>🔵 Active</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.active}</div>
                </button>
                <button
                  onClick={() => setSelectedStatusFilter('completed')}
                  style={{
                    backgroundColor: '#1a1a1a',
                    padding: '20px',
                    borderRadius: '12px',
                    border: selectedStatusFilter === 'completed' ? '3px solid #16a34a' : '2px solid #333',
                    cursor: 'pointer',
                    color: 'white',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>🟢 Completed</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.completed}</div>
                </button>
                <button
                  onClick={() => setSelectedStatusFilter('recurring')}
                  style={{
                    backgroundColor: '#1a1a1a',
                    padding: '20px',
                    borderRadius: '12px',
                    border: selectedStatusFilter === 'recurring' ? '3px solid #9333ea' : '2px solid #333',
                    cursor: 'pointer',
                    color: 'white',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>🔁 Recurring</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>5</div>
                </button>
                <button
                  onClick={() => setSelectedStatusFilter('overdue')}
                  style={{
                    backgroundColor: '#1a1a1a',
                    padding: '20px',
                    borderRadius: '12px',
                    border: selectedStatusFilter === 'overdue' ? '3px solid #dc2626' : '2px solid #333',
                    cursor: 'pointer',
                    color: 'white',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>🔴 Overdue</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.overdue}</div>
                </button>
              </div>

              {/* Stats Grid - Row 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                <button
                  onClick={() => setSelectedStatusFilter('dueToday')}
                  style={{
                    backgroundColor: '#1a1a1a',
                    padding: '20px',
                    borderRadius: '12px',
                    border: selectedStatusFilter === 'dueToday' ? '3px solid #eab308' : '2px solid #333',
                    cursor: 'pointer',
                    color: 'white',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>🟡 Due Today</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.dueToday}</div>
                </button>
                <button
                  onClick={() => setSelectedStatusFilter('completedToday')}
                  style={{
                    backgroundColor: '#1a1a1a',
                    padding: '20px',
                    borderRadius: '12px',
                    border: selectedStatusFilter === 'completedToday' ? '3px solid #16a34a' : '2px solid #333',
                    cursor: 'pointer',
                    color: 'white',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>🟢 Completed Today</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.completedToday}</div>
                </button>
                <button
                  onClick={() => setSelectedStatusFilter('dueTomorrow')}
                  style={{
                    backgroundColor: '#1a1a1a',
                    padding: '20px',
                    borderRadius: '12px',
                    border: selectedStatusFilter === 'dueTomorrow' ? '3px solid #f97316' : '2px solid #333',
                    cursor: 'pointer',
                    color: 'white',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>🟠 Due Tomorrow</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.dueTomorrow}</div>
                </button>
                <button
                  onClick={() => {
                    setShowAddTaskModal(true)
                    setTaskFormData({ due_date: new Date().toISOString().split('T')[0] })
                  }}
                  style={{
                    backgroundColor: '#9333ea',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '2px solid #a855f7',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  ➕ Add Task
                </button>
              </div>

              {/* Area Filters - Row 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '8px' }}>
                {(['All Areas', 'Full Stack', 'Huge Capital', 'S4'] as const).map(area => (
                  <button
                    key={area}
                    onClick={() => setSelectedArea(area)}
                    style={{
                      padding: '16px',
                      backgroundColor: selectedArea === area ? (area === 'All Areas' ? '#60a5fa' : getAreaColor(area as Area)) : '#2a2a2a',
                      color: selectedArea === area ? '#fff' : area === 'All Areas' ? '#60a5fa' : getAreaColor(area as Area),
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      textAlign: 'center'
                    }}
                  >
                    <div>{area} ({areaStats[area].count})</div>
                    <div style={{ fontSize: '12px', opacity: 0.7 }}>Hours: {areaStats[area].hours}</div>
                  </button>
                ))}
              </div>

              {/* Area Filters - Row 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '24px' }}>
                {(['Personal', '808', 'Health', 'Golf'] as const).map(area => (
                  <button
                    key={area}
                    onClick={() => setSelectedArea(area)}
                    style={{
                      padding: '16px',
                      backgroundColor: selectedArea === area ? getAreaColor(area) : '#2a2a2a',
                      color: selectedArea === area ? '#fff' : getAreaColor(area),
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      textAlign: 'center'
                    }}
                  >
                    <div>{area} ({areaStats[area].count})</div>
                    <div style={{ fontSize: '12px', opacity: 0.7 }}>Hours: {areaStats[area].hours}</div>
                  </button>
                ))}
              </div>

              {/* Task List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredTasks.sort((a, b) => {
                  if (!a.due_date) return 1
                  if (!b.due_date) return -1
                  return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                }).map((task) => (
                  <div
                    key={task.id}
                    onDoubleClick={() => setEditingTask(task)}
                    style={{
                      background: `${getAreaColor(task.area as Area)}66`,
                      padding: '20px',
                      borderRadius: '12px',
                      border: `2px solid ${isOverdue(task.due_date) ? '#dc2626' : isToday(task.due_date) ? '#eab308' : isTomorrow(task.due_date) ? '#f97316' : '#6b7280'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      gap: '20px'
                    }}
                  >
                    {/* Left Column - Date & Checkbox */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '16px',
                      minWidth: '70px'
                    }}>
                      {/* Due Date Box */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          setDatePickerTask(task)
                          setShowDatePicker(true)
                        }}
                        style={{
                          borderRadius: '8px',
                          padding: '10px 14px',
                          backgroundColor: '#4a4a4a',
                          border: `1px solid ${task.status === 'Done' ? '#10b981' : isOverdue(task.due_date) ? '#dc2626' : isToday(task.due_date) ? '#eab308' : 'white'}`,
                          color: task.status === 'Done' ? '#10b981' : isOverdue(task.due_date) ? '#dc2626' : isToday(task.due_date) ? '#eab308' : 'white',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          cursor: 'pointer',
                          minWidth: '80px'
                        }}
                      >
                        <div style={{ fontSize: '10px', marginBottom: '2px', opacity: 0.9 }}>
                          {task.status === 'Done' ? 'COMPLETED' : isOverdue(task.due_date) ? 'OVERDUE' : isToday(task.due_date) ? 'DUE TODAY' : isTomorrow(task.due_date) ? 'DUE' : 'UPCOMING'}
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                          {task.status === 'Done' && task.completed_at
                            ? (() => {
                                const parts = task.completed_at.split('T')[0].split('-')
                                const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              })()
                            : task.due_date ? (isTomorrow(task.due_date) ? 'Tomorrow' : isToday(task.due_date) ? 'Today' : (() => {
                                const parts = task.due_date.split('T')[0].split('-')
                                const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              })()) : 'No Date'}
                        </div>
                      </div>

                      {/* Completed Checkbox */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <input
                          type="checkbox"
                          checked={task.status === 'Done'}
                          onChange={() => toggleTask(task.id, task.status)}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: '#10b981'
                          }}
                        />
                      </div>
                    </div>

                    {/* Task Content */}
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        marginBottom: '12px',
                        color: 'white',
                        textDecoration: task.status === 'Done' ? 'line-through' : 'none'
                      }}>
                        {task.task_name}
                      </h3>

                      {/* Badges */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        <span style={{
                          backgroundColor: getAreaColor(task.area as Area),
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {task.area}
                        </span>
                        {task.task_type && (
                          <span style={{
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {task.task_type}
                          </span>
                        )}
                        {task.priority && (
                          <span style={{
                            backgroundColor: task.priority === 'High' ? '#dc2626' : task.priority === 'Medium' ? '#f59e0b' : '#10b981',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            ⏰ {task.due_date ? new Date(task.due_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase() : ''}
                          </span>
                        )}
                        <span style={{
                          backgroundColor: '#16a34a',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {task.effort_level || 'Money Maker: $$$ MoneyMaker'}
                        </span>
                      </div>

                      {/* Hours Info */}
                      <div style={{
                        display: 'flex',
                        gap: '20px',
                        fontSize: '13px',
                        color: '#9ca3af'
                      }}>
                        <div>Hours Projected: {task.hours_projected || 1}</div>
                        <div>Hours Worked: {task.hours_worked || 0}</div>
                      </div>

                      {/* Status */}
                      <div style={{
                        marginTop: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: task.status === 'Done' ? '#10b981' : '#dc2626',
                          display: 'inline-block'
                        }}></span>
                        <span style={{ fontSize: '13px', color: '#9ca3af' }}>{task.status || 'Not started'}</span>
                      </div>

                      {/* Description hint */}
                      {task.description && (
                        <div style={{
                          marginTop: '8px',
                          fontSize: '13px',
                          color: '#6b7280',
                          fontStyle: 'italic'
                        }}>
                          Click to add description...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Deep Work & Schedule */}
            <div style={{ width: '400px' }}>
              {/* Deep Work Session */}
              <div style={{
                backgroundColor: '#2a2a2a',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '16px'
              }}>
                <h3 style={{ marginBottom: '0px', fontSize: '18px', textAlign: 'center', color: '#fbbf24' }}>Deep Work Session</h3>

                <div style={{ fontSize: '48px', textAlign: 'center', margin: '0 0 16px 0', fontWeight: 'bold', color: '#fbbf24' }}>
                  {formatTime(timerSeconds)}
                </div>

                {/* Task Dropdown (Searchable) */}
                <div style={{ marginBottom: '16px', position: 'relative' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Task (Optional)</label>
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={dwTaskSearchTerm}
                    onChange={(e) => {
                      setDwTaskSearchTerm(e.target.value)
                      setShowDwTaskDropdown(true)
                    }}
                    onFocus={() => setShowDwTaskDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDwTaskDropdown(false), 200)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#1a1a1a',
                      color: 'white',
                      border: '1px solid #444',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  {showDwTaskDropdown && dwTaskSearchTerm && tasks.filter(t => t.status !== 'Done' && t.task_name.toLowerCase().includes(dwTaskSearchTerm.toLowerCase())).length > 0 && (
                    <div style={{
                      position: 'absolute',
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #444',
                      borderRadius: '6px',
                      marginTop: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      width: '100%',
                      zIndex: 1000
                    }}>
                      {tasks
                        .filter(t => t.status !== 'Done' && t.task_name.toLowerCase().includes(dwTaskSearchTerm.toLowerCase()))
                        .sort((a, b) => a.area.localeCompare(b.area))
                        .slice(0, 10)
                        .map(task => (
                          <div
                            key={task.id}
                            onClick={() => {
                              setDwSessionTask(task)
                              setDwSessionFocusArea(task.area)
                              setDwSessionTaskType(task.task_type)
                              setDwTaskSearchTerm(task.task_name)
                              setShowDwTaskDropdown(false)
                            }}
                            style={{
                              padding: '10px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #333',
                              borderLeft: `4px solid ${getAreaColor(task.area)}`,
                              fontSize: '14px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div style={{ fontWeight: '500' }}>{task.task_name}</div>
                            <div style={{ fontSize: '12px', color: getAreaColor(task.area), marginTop: '2px' }}>
                              {task.area} • {task.task_type}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Focus Area */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Focus Area</label>
                  <select
                    value={dwSessionFocusArea}
                    onChange={(e) => {
                      setDwSessionFocusArea(e.target.value as Area)
                      setDwSessionTaskType('')
                    }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#1a1a1a',
                      color: 'white',
                      border: '1px solid #444',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}>
                    <option value="">Select focus area</option>
                    <option value="Full Stack">Full Stack</option>
                    <option value="Huge Capital">Huge Capital</option>
                    <option value="S4">S4</option>
                    <option value="808">808</option>
                    <option value="Personal">Personal</option>
                    <option value="Golf">Golf</option>
                    <option value="Health">Health</option>
                  </select>
                </div>

                {/* Task Type */}
                {dwSessionFocusArea && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Task Type</label>
                    <select
                      value={dwSessionTaskType}
                      onChange={(e) => setDwSessionTaskType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#1a1a1a',
                        color: 'white',
                        border: '1px solid #444',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}>
                      <option value="">Select task type</option>
                      {getTaskTypesByArea(dwSessionFocusArea).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                )}

                {!timerRunning ? (
                  <button
                    onClick={startTimer}
                    style={{
                      width: '100%',
                      padding: '16px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '16px'
                    }}>
                    ▶ Start Session
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={saveSession}
                      style={{
                        flex: 1,
                        padding: '16px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '16px'
                      }}>
                      💾 Save
                    </button>
                    <button
                      onClick={pauseTimer}
                      style={{
                        flex: 1,
                        padding: '16px',
                        backgroundColor: timerPaused ? '#3b82f6' : '#eab308',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '16px'
                      }}>
                      {timerPaused ? '▶ Resume' : '⏸ Pause'}
                    </button>
                    <button
                      onClick={cancelTimerSession}
                      style={{
                        flex: 1,
                        padding: '16px',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '16px'
                      }}>
                      🗑 Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Task Brain Dump */}
              <div style={{
                backgroundColor: '#2a2a2a',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '16px'
              }}>
                <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Task Brain Dump 🧠</h3>
                <textarea
                  placeholder="Quick notes, ideas, tasks to add later..."
                  style={{
                    width: '100%',
                    minHeight: '150px',
                    padding: '12px',
                    backgroundColor: '#1a1a1a',
                    color: 'white',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Today's Schedule */}
              <div style={{
                backgroundColor: '#2a2a2a',
                padding: '20px',
                borderRadius: '12px'
              }}>
                <h3 style={{ marginBottom: '16px', fontSize: '18px', color: '#eab308' }}>Today's Schedule</h3>
                <div style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>
                  No scheduled tasks for today
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'schedule' && (
          <div style={{ textAlign: 'center', padding: '80px', color: '#6b7280' }}>
            <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>📅 Schedule View</h2>
            <p>Drag and drop scheduling coming soon!</p>
          </div>
        )}

        {activeSubTab === 'deepwork' && (
          <div>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>Deep Work Sessions</h2>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Track your focused work sessions and productivity</p>
            </div>

            {/* Time Period Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
              {(['All Time', 'Today', 'This Week', 'This Month'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedTimePeriod(period)}
                  style={{
                    padding: '16px 20px',
                    backgroundColor: selectedTimePeriod === period ? '#3b82f6' : '#2a2a2a',
                    color: 'white',
                    border: selectedTimePeriod === period ? '2px solid #60a5fa' : '2px solid transparent',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '15px',
                    transition: 'all 0.2s ease',
                    boxShadow: selectedTimePeriod === period ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
                  }}
                >
                  {period}
                </button>
              ))}
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
              <div style={{
                backgroundColor: '#2a2a2a',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #3a3a3a',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}>
                <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '12px', fontWeight: '500', letterSpacing: '0.5px' }}>⏱️ TOTAL SESSIONS</div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff' }}>{dwStats.totalSessions}</div>
              </div>
              <div style={{
                backgroundColor: '#2a2a2a',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #3a3a3a',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}>
                <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '12px', fontWeight: '500', letterSpacing: '0.5px' }}>⏰ TOTAL TIME</div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff' }}>{formatHoursMinutes(dwStats.totalMinutes)}</div>
              </div>
              <div style={{
                backgroundColor: '#2a2a2a',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #3a3a3a',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}>
                <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '12px', fontWeight: '500', letterSpacing: '0.5px' }}>📊 AVG SESSION</div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff' }}>{dwStats.avgMinutes}m</div>
              </div>
              <div style={{
                backgroundColor: '#2a2a2a',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #3a3a3a',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}>
                <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '12px', fontWeight: '500', letterSpacing: '0.5px' }}>📈 % OF TOTAL HOURS</div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff' }}>100%</div>
              </div>
            </div>

            {/* Area Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '12px', marginBottom: '16px' }}>
              {dwAreaCountsArray.map(({ area, count }) => {
                const getAreaButtonColor = (areaName: string) => {
                  if (areaName === 'All Areas') return '#60a5fa'
                  if (areaName === 'Personal') return '#ec4899'
                  if (areaName === 'Full Stack') return '#10b981'
                  if (areaName === 'Huge Capital') return '#a855f7'
                  if (areaName === '808') return '#eab308'
                  if (areaName === 'S4') return '#3b82f6'
                  if (areaName === 'Golf') return '#f97316'
                  if (areaName === 'Health') return '#14b8a6'
                  return '#9ca3af'
                }

                return (
                  <button
                    key={area}
                    onClick={() => setSelectedDWArea(area as Area | 'All Areas')}
                    style={{
                      padding: '12px 20px',
                      backgroundColor: selectedDWArea === area ? getAreaButtonColor(area) : '#2a2a2a',
                      color: selectedDWArea === area ? 'white' : getAreaButtonColor(area),
                      border: selectedDWArea === area ? `2px solid ${getAreaButtonColor(area)}` : '2px solid #3a3a3a',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: selectedDWArea === area ? '600' : '500',
                      transition: 'all 0.2s ease',
                      boxShadow: selectedDWArea === area ? `0 4px 12px ${getAreaButtonColor(area)}40` : 'none'
                    }}
                  >
                    {area} ({count})
                  </button>
                )
              })}
            </div>

            {/* Effort Level Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '32px' }}>
              {Object.entries(effortLevelCounts).map(([level, count]) => {
                const getEffortLevelColor = (levelName: string) => {
                  if (levelName === 'All Levels') return '#60a5fa'
                  if (levelName === '$$$ MoneyMaker') return '#10b981'
                  if (levelName === '$ Lil Money') return '#3b82f6'
                  if (levelName === '-$ Save Dat Money') return '#f97316'
                  if (levelName === ':( Pointless') return '#ef4444'
                  if (levelName === '8) JusVibin') return '#a855f7'
                  return '#9ca3af'
                }

                return (
                  <button
                    key={level}
                    onClick={() => setSelectedEffortLevel(level)}
                    style={{
                      padding: '12px 20px',
                      backgroundColor: selectedEffortLevel === level ? getEffortLevelColor(level) : '#2a2a2a',
                      color: selectedEffortLevel === level ? 'white' : getEffortLevelColor(level),
                      border: selectedEffortLevel === level ? `2px solid ${getEffortLevelColor(level)}` : '2px solid #3a3a3a',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: selectedEffortLevel === level ? '600' : '500',
                      transition: 'all 0.2s ease',
                      boxShadow: selectedEffortLevel === level ? `0 4px 12px ${getEffortLevelColor(level)}40` : 'none'
                    }}
                  >
                    {level} ({count})
                  </button>
                )
              })}
            </div>

            {/* Top 5 Tasks Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
              {top5Tasks.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: getAreaColor(item.area as Area),
                    padding: '16px',
                    borderRadius: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px' }}>#{idx + 1}</span>
                    <span style={{ fontSize: '12px', backgroundColor: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px' }}>{item.area}</span>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>{formatHoursMinutes(item.minutes)}</div>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>{item.percent}%</div>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>{item.sessions} sessions</div>
                  <div style={{ fontSize: '11px', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.taskName}>{item.taskName}</div>
                </div>
              ))}
              {top5Tasks.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#6b7280', padding: '20px' }}>
                  No tasks found
                </div>
              )}
            </div>

            {/* Chart and Summary Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
              {/* Chart */}
              <div style={{ backgroundColor: '#2a2a2a', padding: '24px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Deep Work Hours by {chartView === 'areas' ? 'Task Areas' : 'Money Maker Level'}</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setChartView('areas')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: chartView === 'areas' ? '#3b82f6' : '#2a2a2a',
                        color: chartView === 'areas' ? 'white' : '#9ca3af',
                        border: chartView === 'areas' ? 'none' : '1px solid #444',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      By Task Areas
                    </button>
                    <button
                      onClick={() => setChartView('effort')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: chartView === 'effort' ? '#3b82f6' : '#2a2a2a',
                        color: chartView === 'effort' ? 'white' : '#9ca3af',
                        border: chartView === 'effort' ? 'none' : '1px solid #444',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      By Money Maker Level
                    </button>
                  </div>
                </div>

                {/* Date Range Selector */}
                <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '500' }}>Date Range:</span>
                  <button
                    onClick={() => {
                      setChartDateRange('all')
                      setShowCustomDatePicker(false)
                    }}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: chartDateRange === 'all' ? '#3b82f6' : '#1a1a1a',
                      color: chartDateRange === 'all' ? 'white' : '#9ca3af',
                      border: '1px solid #444',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: chartDateRange === 'all' ? '600' : '400'
                    }}
                  >
                    All Dates
                  </button>
                  <button
                    onClick={() => {
                      setChartDateRange('monthly')
                      setShowCustomDatePicker(false)
                    }}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: chartDateRange === 'monthly' ? '#3b82f6' : '#1a1a1a',
                      color: chartDateRange === 'monthly' ? 'white' : '#9ca3af',
                      border: '1px solid #444',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: chartDateRange === 'monthly' ? '600' : '400'
                    }}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => {
                      setChartDateRange('weekly')
                      setShowCustomDatePicker(false)
                    }}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: chartDateRange === 'weekly' ? '#3b82f6' : '#1a1a1a',
                      color: chartDateRange === 'weekly' ? 'white' : '#9ca3af',
                      border: '1px solid #444',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: chartDateRange === 'weekly' ? '600' : '400'
                    }}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => {
                      setChartDateRange('custom')
                      setShowCustomDatePicker(true)
                    }}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: chartDateRange === 'custom' ? '#3b82f6' : '#1a1a1a',
                      color: chartDateRange === 'custom' ? 'white' : '#9ca3af',
                      border: '1px solid #444',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: chartDateRange === 'custom' ? '600' : '400'
                    }}
                  >
                    Custom
                  </button>
                </div>

                {/* Custom Date Picker */}
                {showCustomDatePicker && chartDateRange === 'custom' && (
                  <div style={{
                    marginBottom: '16px',
                    padding: '16px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '8px',
                    border: '1px solid #444'
                  }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>Start Date</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: '#2a2a2a',
                            color: 'white',
                            border: '1px solid #444',
                            borderRadius: '6px',
                            fontSize: '13px'
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>End Date</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: '#2a2a2a',
                            color: 'white',
                            border: '1px solid #444',
                            borderRadius: '6px',
                            fontSize: '13px'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Stacked Bar Chart by Date */}
                <div style={{ padding: '20px 0' }}>
                  {(() => {
                    // Determine date range
                    const now = new Date()
                    let startDate: Date
                    let endDate: Date = new Date(now)

                    if (chartDateRange === 'weekly') {
                      startDate = new Date(now)
                      startDate.setDate(now.getDate() - 6) // Last 7 days including today
                    } else if (chartDateRange === 'monthly') {
                      startDate = new Date(now)
                      startDate.setDate(now.getDate() - 29) // Last 30 days including today
                    } else if (chartDateRange === 'custom' && customStartDate && customEndDate) {
                      startDate = new Date(customStartDate)
                      endDate = new Date(customEndDate)
                    } else {
                      // All dates - get earliest session date
                      const allDates = filteredDWSessions.map(s => new Date(s.start_time))
                      if (allDates.length > 0) {
                        startDate = new Date(Math.min(...allDates.map(d => d.getTime())))
                      } else {
                        startDate = new Date(now)
                        startDate.setDate(now.getDate() - 13)
                      }
                    }

                    // Generate all dates in range
                    const dates: string[] = []
                    const currentDate = new Date(startDate)
                    currentDate.setHours(0, 0, 0, 0)
                    const end = new Date(endDate)
                    end.setHours(0, 0, 0, 0)

                    while (currentDate <= end) {
                      dates.push(currentDate.toISOString().split('T')[0])
                      currentDate.setDate(currentDate.getDate() + 1)
                    }

                    // Group sessions by date
                    const sessionsByDate: { [key: string]: any[] } = {}
                    filteredDWSessions.forEach(session => {
                      const date = new Date(session.start_time).toISOString().split('T')[0]
                      if (dates.includes(date)) {
                        if (!sessionsByDate[date]) sessionsByDate[date] = []
                        sessionsByDate[date].push(session)
                      }
                    })

                    // Initialize all dates with empty arrays if no sessions
                    dates.forEach(date => {
                      if (!sessionsByDate[date]) {
                        sessionsByDate[date] = []
                      }
                    })

                    // Calculate max total hours for scaling
                    const maxTotalHours = Math.max(...dates.map(date => {
                      const dayTotal = sessionsByDate[date].reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60
                      return dayTotal
                    }), 1)

                    return (
                      <div>
                        {/* Chart Area */}
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '280px', padding: '10px 0' }}>
                          {dates.map(date => {
                            const daySessions = sessionsByDate[date]
                            const dateLabel = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

                            if (chartView === 'areas') {
                              // Group by area
                              const areaData: { [key: string]: number } = {}
                              daySessions.forEach(s => {
                                if (!areaData[s.area]) areaData[s.area] = 0
                                areaData[s.area] += (s.duration_minutes || 0) / 60
                              })

                              const totalHours = Object.values(areaData).reduce((sum, h) => sum + h, 0)
                              const barHeight = totalHours > 0 ? (totalHours / maxTotalHours) * 100 : 0

                              return (
                                <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                  <div style={{
                                    width: '100%',
                                    height: totalHours > 0 ? `${barHeight}%` : '10px',
                                    display: 'flex',
                                    flexDirection: 'column-reverse',
                                    backgroundColor: '#1a1a1a',
                                    borderRadius: '6px 6px 0 0',
                                    overflow: 'hidden',
                                    border: totalHours === 0 ? '1px dashed #444' : 'none'
                                  }}>
                                    {['Full Stack', 'S4', '808', 'Personal', 'Huge Capital', 'Golf', 'Health'].map(area => {
                                      const hours = areaData[area] || 0
                                      if (hours === 0) return null
                                      const segmentHeight = (hours / totalHours) * 100
                                      const areaColor = area === 'Personal' ? '#ec4899' :
                                        area === 'Full Stack' ? '#10b981' :
                                        area === 'Huge Capital' ? '#a855f7' :
                                        area === '808' ? '#eab308' :
                                        area === 'S4' ? '#3b82f6' :
                                        area === 'Golf' ? '#f97316' :
                                        area === 'Health' ? '#14b8a6' : '#9ca3af'

                                      return (
                                        <div
                                          key={area}
                                          style={{
                                            height: `${segmentHeight}%`,
                                            backgroundColor: areaColor,
                                            transition: 'all 0.3s ease'
                                          }}
                                          title={`${area}: ${hours.toFixed(1)}h`}
                                        />
                                      )
                                    })}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>{dateLabel}</div>
                                </div>
                              )
                            } else {
                              // Group by effort level
                              const effortData: { [key: string]: number } = {}
                              daySessions.forEach(s => {
                                const level = s.effort_level || 'No Level'
                                if (!effortData[level]) effortData[level] = 0
                                effortData[level] += (s.duration_minutes || 0) / 60
                              })

                              const totalHours = Object.values(effortData).reduce((sum, h) => sum + h, 0)
                              const barHeight = totalHours > 0 ? (totalHours / maxTotalHours) * 100 : 0

                              return (
                                <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                  <div style={{
                                    width: '100%',
                                    height: totalHours > 0 ? `${barHeight}%` : '10px',
                                    display: 'flex',
                                    flexDirection: 'column-reverse',
                                    backgroundColor: '#1a1a1a',
                                    borderRadius: '6px 6px 0 0',
                                    overflow: 'hidden',
                                    border: totalHours === 0 ? '1px dashed #444' : 'none'
                                  }}>
                                    {['$$$ MoneyMaker', '$ Lil Money', '-$ Save Dat Money', ':( Pointless', '8) JusVibin', 'No Level'].map(level => {
                                      const hours = effortData[level] || 0
                                      if (hours === 0) return null
                                      const segmentHeight = (hours / totalHours) * 100
                                      const effortColor = level === '$$$ MoneyMaker' ? '#10b981' :
                                        level === '$ Lil Money' ? '#3b82f6' :
                                        level === '-$ Save Dat Money' ? '#f97316' :
                                        level === ':( Pointless' ? '#ef4444' :
                                        level === '8) JusVibin' ? '#a855f7' : '#6b7280'

                                      return (
                                        <div
                                          key={level}
                                          style={{
                                            height: `${segmentHeight}%`,
                                            backgroundColor: effortColor,
                                            transition: 'all 0.3s ease'
                                          }}
                                          title={`${level}: ${hours.toFixed(1)}h`}
                                        />
                                      )
                                    })}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>{dateLabel}</div>
                                </div>
                              )
                            }
                          })}
                        </div>

                        {/* Legend */}
                        <div style={{ marginTop: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          {chartView === 'areas' ? (
                            ['Full Stack', 'S4', '808', 'Personal', 'Huge Capital', 'Golf', 'Health'].map(area => {
                              const areaColor = area === 'Personal' ? '#ec4899' :
                                area === 'Full Stack' ? '#10b981' :
                                area === 'Huge Capital' ? '#a855f7' :
                                area === '808' ? '#eab308' :
                                area === 'S4' ? '#3b82f6' :
                                area === 'Golf' ? '#f97316' :
                                area === 'Health' ? '#14b8a6' : '#9ca3af'

                              return (
                                <div key={area} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ width: '12px', height: '12px', backgroundColor: areaColor, borderRadius: '3px' }} />
                                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>{area}</span>
                                </div>
                              )
                            })
                          ) : (
                            ['$$$ MoneyMaker', '$ Lil Money', '-$ Save Dat Money', ':( Pointless', '8) JusVibin', 'No Level'].map(level => {
                              const effortColor = level === '$$$ MoneyMaker' ? '#10b981' :
                                level === '$ Lil Money' ? '#3b82f6' :
                                level === '-$ Save Dat Money' ? '#f97316' :
                                level === ':( Pointless' ? '#ef4444' :
                                level === '8) JusVibin' ? '#a855f7' : '#6b7280'

                              return (
                                <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ width: '12px', height: '12px', backgroundColor: effortColor, borderRadius: '3px' }} />
                                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>{level}</span>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Hours Summary Table */}
              <div style={{ backgroundColor: '#2a2a2a', padding: '24px', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Hours Summary</h3>
                <table style={{ width: '100%', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #444' }}>
                      <th style={{ textAlign: 'left', padding: '8px 0', color: '#9ca3af' }}>Area</th>
                      <th style={{ textAlign: 'right', padding: '8px 0', color: '#9ca3af' }}>Today</th>
                      <th style={{ textAlign: 'right', padding: '8px 0', color: '#9ca3af' }}>Week</th>
                      <th style={{ textAlign: 'right', padding: '8px 0', color: '#9ca3af' }}>Month</th>
                      <th style={{ textAlign: 'right', padding: '8px 0', color: '#9ca3af' }}>All Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hoursSummary.map((row) => (
                      <tr key={row.area} style={{ borderBottom: '1px solid #333' }}>
                        <td style={{ padding: '12px 0' }}>
                          <span style={{ color: row.color, fontWeight: '500' }}>{row.area}</span>
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px 0' }}>{row.today}</td>
                        <td style={{ textAlign: 'right', padding: '12px 0' }}>{row.week}</td>
                        <td style={{ textAlign: 'right', padding: '12px 0' }}>{row.month}</td>
                        <td style={{ textAlign: 'right', padding: '12px 0', fontWeight: 'bold' }}>{row.allTime}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '2px solid #444', fontWeight: 'bold' }}>
                      <td style={{ padding: '12px 0' }}>Total</td>
                      <td style={{ textAlign: 'right', padding: '12px 0' }}>{getHoursByPeriod('All', 'today')}</td>
                      <td style={{ textAlign: 'right', padding: '12px 0' }}>{getHoursByPeriod('All', 'week')}</td>
                      <td style={{ textAlign: 'right', padding: '12px 0' }}>{getHoursByPeriod('All', 'month')}</td>
                      <td style={{ textAlign: 'right', padding: '12px 0' }}>{getHoursByPeriod('All', 'all')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Deep Work Session Log */}
            <div style={{ backgroundColor: '#2a2a2a', padding: '24px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Deep Work Session Log</h3>
                <button style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px'
                }}>
                  ➕ Add Deep Work Session
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredDWSessions.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                    No sessions found for the selected filters
                  </div>
                ) : (
                  filteredDWSessions.map((sessionItem, idx) => {
                    const startTime = new Date(sessionItem.start_time)
                    const endTime = sessionItem.end_time ? new Date(sessionItem.end_time) : null
                    const dateStr = startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    const timeStr = endTime
                      ? `${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                      : startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

                    return (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: getAreaColor(sessionItem.area as Area),
                          padding: '16px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px'
                        }}
                      >
                        <div style={{ flex: '0 0 120px' }}>
                          <div style={{ fontSize: '13px', opacity: 0.9 }}>📅 {dateStr}</div>
                        </div>
                        <div style={{ flex: '0 0 150px' }}>
                          <div style={{ fontSize: '13px', opacity: 0.9 }}>🕐 {timeStr}</div>
                        </div>
                        <div style={{ flex: '0 0 80px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 'bold' }}>⏱️ {formatHoursMinutes(sessionItem.duration_minutes || 0)}</div>
                        </div>
                        <div style={{ flex: '0 0 100px' }}>
                          <span style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: '4px', fontSize: '12px' }}>{sessionItem.area}</span>
                        </div>
                        <div style={{ flex: '0 0 120px' }}>
                          <span style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: '4px', fontSize: '12px' }}>{sessionItem.task_type || 'N/A'}</span>
                        </div>
                        <div style={{ flex: '0 0 200px' }}>
                          <span style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#000', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '500' }}>
                            {sessionItem.task?.task_name || 'Unknown Task'}
                          </span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: '4px', fontSize: '12px' }}>{sessionItem.effort_level || 'N/A'}</span>
                        </div>
                        <div style={{ fontSize: '13px', opacity: 0.7, fontStyle: 'italic' }}>{sessionItem.notes || 'No notes'}</div>
                        <button
                          onClick={() => startEditingSession(sessionItem)}
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            opacity: 0.7,
                            fontSize: '16px'
                          }}
                        >
                          ✏️
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

      {/* Edit Deep Work Session Modal */}
      {editingSessionId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={cancelEditingSession}
        >
          <div
            style={{
              backgroundColor: '#1f1f1f',
              borderRadius: '12px',
              width: '500px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #333',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>Edit Deep Work Session</h3>
              <button
                onClick={cancelEditingSession}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {/* Focus Area */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#fff', marginBottom: '8px', fontWeight: '500' }}>
                  Focus Area
                </label>
                <select
                  value={editFormData.area || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, area: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#2a2a2a',
                    color: 'white',
                    border: '1px solid #444',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                >
                  <option value="Full Stack">Full Stack</option>
                  <option value="Huge Capital">Huge Capital</option>
                  <option value="S4">S4</option>
                  <option value="808">808</option>
                  <option value="Personal">Personal</option>
                  <option value="Golf">Golf</option>
                  <option value="Health">Health</option>
                </select>
              </div>

              {/* Task Type */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#fff', marginBottom: '8px', fontWeight: '500' }}>
                  Task Type
                </label>
                <input
                  type="text"
                  value={editFormData.task_type || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, task_type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#2a2a2a',
                    color: 'white',
                    border: '1px solid #444',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Task (Optional) */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#fff', marginBottom: '8px', fontWeight: '500' }}>
                  Task (Optional)
                </label>
                <input
                  type="text"
                  value={editFormData.task_id || ''}
                  placeholder="Task name..."
                  onChange={(e) => setEditFormData({ ...editFormData, task_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#2a2a2a',
                    color: 'white',
                    border: '1px solid #444',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Money Maker Level */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#fff', marginBottom: '8px', fontWeight: '500' }}>
                  Money Maker Level (Optional)
                </label>
                <select
                  value={editFormData.effort_level || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, effort_level: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#2a2a2a',
                    color: 'white',
                    border: '1px solid #444',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select level...</option>
                  <option value="$$$ MoneyMaker">$$$ MoneyMaker</option>
                  <option value="$ Lil Money">$ Lil Money</option>
                  <option value="-$ Save Dat Money">-$ Save Dat Money</option>
                  <option value=":( Pointless">:( Pointless</option>
                  <option value="8) JusVibin">8) JusVibin</option>
                </select>
              </div>

              {/* Duration */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#fff', marginBottom: '8px', fontWeight: '500' }}>
                  Duration (minutes) - Auto-calculated
                </label>
                <input
                  type="number"
                  value={editFormData.duration_minutes || 0}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#2a2a2a',
                    color: '#9ca3af',
                    border: '1px solid #444',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>
                  Duration is automatically calculated from start and end times
                </div>
              </div>

              {/* Start Time */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#fff', marginBottom: '8px', fontWeight: '500' }}>
                  Start Time
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input
                    type="date"
                    value={editFormData.start_time ? new Date(editFormData.start_time).toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const date = new Date(editFormData.start_time || new Date())
                      const newDate = new Date(e.target.value)
                      date.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate())
                      setEditFormData({ ...editFormData, start_time: date.toISOString() })
                    }}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#2a2a2a',
                      color: 'white',
                      border: '1px solid #444',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                  <input
                    type="time"
                    value={editFormData.start_time ? new Date(editFormData.start_time).toTimeString().slice(0, 5) : ''}
                    onChange={(e) => {
                      const date = new Date(editFormData.start_time || new Date())
                      const [hours, minutes] = e.target.value.split(':')
                      date.setHours(parseInt(hours), parseInt(minutes))
                      setEditFormData({ ...editFormData, start_time: date.toISOString() })
                    }}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#2a2a2a',
                      color: 'white',
                      border: '1px solid #444',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                  Current: {editFormData.start_time ? new Date(editFormData.start_time).toLocaleString() : 'N/A'}
                </div>
              </div>

              {/* End Time */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#fff', marginBottom: '8px', fontWeight: '500' }}>
                  End Time
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input
                    type="date"
                    value={editFormData.end_time ? new Date(editFormData.end_time).toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const date = new Date(editFormData.end_time || new Date())
                      const newDate = new Date(e.target.value)
                      date.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate())
                      setEditFormData({ ...editFormData, end_time: date.toISOString() })
                    }}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#2a2a2a',
                      color: 'white',
                      border: '1px solid #444',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                  <input
                    type="time"
                    value={editFormData.end_time ? new Date(editFormData.end_time).toTimeString().slice(0, 5) : ''}
                    onChange={(e) => {
                      const date = new Date(editFormData.end_time || new Date())
                      const [hours, minutes] = e.target.value.split(':')
                      date.setHours(parseInt(hours), parseInt(minutes))
                      setEditFormData({ ...editFormData, end_time: date.toISOString() })
                    }}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#2a2a2a',
                      color: 'white',
                      border: '1px solid #444',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                  Current: {editFormData.end_time ? new Date(editFormData.end_time).toLocaleString() : 'N/A'}
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#fff', marginBottom: '8px', fontWeight: '500' }}>
                  Notes
                </label>
                <textarea
                  value={editFormData.notes || ''}
                  placeholder="Session notes..."
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#2a2a2a',
                    color: 'white',
                    border: '1px solid #444',
                    borderRadius: '8px',
                    fontSize: '14px',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #333',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <button
                onClick={() => deleteSession(editingSessionId)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Delete Session
              </button>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={cancelEditingSession}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'transparent',
                    color: '#9ca3af',
                    border: '1px solid #444',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveEditedSession(editingSessionId)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Edit/Add Modal */}
      {(editingTask || showAddTaskModal) && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => {
            setEditingTask(null)
            setShowAddTaskModal(false)
            setTaskFormData({})
          }}
        >
          <div
            style={{
              backgroundColor: '#0f1419',
              borderRadius: '12px',
              padding: '28px',
              width: '600px',
              maxHeight: '90vh',
              overflow: 'auto',
              border: 'none'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '600', margin: 0 }}>
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h2>
              <button
                onClick={() => {
                  setEditingTask(null)
                  setShowAddTaskModal(false)
                  setTaskFormData({})
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  fontSize: '28px',
                  cursor: 'pointer',
                  padding: '0',
                  lineHeight: '1'
                }}
              >
                ×
              </button>
            </div>

            {/* Task Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#9ca3af', display: 'block', marginBottom: '8px', fontSize: '14px' }}>Task Name</label>
              <input
                type="text"
                value={taskFormData.task_name || (editingTask?.task_name || '')}
                onChange={(e) => setTaskFormData({ ...taskFormData, task_name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#1a1f2e',
                  border: '1px solid #2d3748',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none'
                }}
                placeholder="Enter task name..."
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#9ca3af', display: 'block', marginBottom: '8px', fontSize: '14px' }}>Description</label>
              <textarea
                value={taskFormData.description || (editingTask?.description || '')}
                onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#1a1f2e',
                  border: '1px solid #2d3748',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px',
                  minHeight: '70px',
                  outline: 'none',
                  resize: 'vertical'
                }}
                placeholder="Task description..."
              />
            </div>

            {/* Area and Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ color: '#9ca3af', display: 'block', marginBottom: '8px', fontSize: '14px' }}>Area</label>
                <select
                  value={taskFormData.area || (editingTask?.area || '')}
                  onChange={(e) => setTaskFormData({ ...taskFormData, area: e.target.value as Area })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#1a1f2e',
                    border: '1px solid #2d3748',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="">Select area...</option>
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
                <label style={{ color: '#9ca3af', display: 'block', marginBottom: '8px', fontSize: '14px' }}>Type</label>
                <select
                  value={taskFormData.task_type || (editingTask?.task_type || '')}
                  onChange={(e) => setTaskFormData({ ...taskFormData, task_type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#1a1f2e',
                    border: '1px solid #2d3748',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="">Select type...</option>
                  {(taskFormData.area || editingTask?.area) === 'Health' && (
                    <>
                      <option value="Admin">Admin</option>
                      <option value="Meditation">Meditation</option>
                      <option value="Workout">Workout</option>
                      <option value="Walk">Walk</option>
                      <option value="Yoga">Yoga</option>
                    </>
                  )}
                  {(taskFormData.area || editingTask?.area) === 'S4' && (
                    <>
                      <option value="Data">Data</option>
                      <option value="Marketing">Marketing</option>
                      <option value="New Build">New Build</option>
                      <option value="Update Build">Update Build</option>
                      <option value="Sales">Sales</option>
                      <option value="Planning">Planning</option>
                    </>
                  )}
                  {(taskFormData.area || editingTask?.area) === 'Huge Capital' && (
                    <>
                      <option value="Admin">Admin</option>
                      <option value="New Build">New Build</option>
                      <option value="Update Build">Update Build</option>
                      <option value="Planning">Planning</option>
                    </>
                  )}
                  {(taskFormData.area || editingTask?.area) === 'Golf' && (
                    <>
                      <option value="Content">Content</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Practice">Practice</option>
                      <option value="Golfing">Golfing</option>
                      <option value="Admin">Admin</option>
                    </>
                  )}
                  {(taskFormData.area || editingTask?.area) === 'Full Stack' && (
                    <>
                      <option value="Admin">Admin</option>
                      <option value="Internal Build">Internal Build</option>
                      <option value="Client Build">Client Build</option>
                      <option value="Team">Team</option>
                      <option value="Internal Update">Internal Update</option>
                      <option value="Client Update">Client Update</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Sales">Sales</option>
                    </>
                  )}
                  {(taskFormData.area || editingTask?.area) === '808' && (
                    <>
                      <option value="Online">Online</option>
                      <option value="Artists">Artists</option>
                      <option value="Cost Savings">Cost Savings</option>
                      <option value="Customer Service">Customer Service</option>
                      <option value="Data">Data</option>
                      <option value="Fulfillment">Fulfillment</option>
                      <option value="Automation">Automation</option>
                    </>
                  )}
                  {(taskFormData.area || editingTask?.area) === 'Personal' && (
                    <>
                      <option value="Arya">Arya</option>
                      <option value="Car">Car</option>
                      <option value="Cheypow">Cheypow</option>
                      <option value="Finances">Finances</option>
                      <option value="Friends">Friends</option>
                      <option value="House">House</option>
                      <option value="Life">Life</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Priority and Effort Level */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ color: '#9ca3af', display: 'block', marginBottom: '8px', fontSize: '14px' }}>Priority</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {['Low', 'Medium', 'High'].map((level) => (
                    <label key={level} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'white' }}>
                      <input
                        type="radio"
                        name="priority"
                        value={level}
                        checked={(taskFormData.priority || editingTask?.priority) === level}
                        onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value })}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '14px' }}>{level}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ color: '#9ca3af', display: 'block', marginBottom: '8px', fontSize: '14px' }}>Money Maker</label>
                <select
                  value={taskFormData.effort_level || (editingTask?.effort_level || '')}
                  onChange={(e) => setTaskFormData({ ...taskFormData, effort_level: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#1a1f2e',
                    border: '1px solid #2d3748',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="">Select money maker...</option>
                  <option value="$ Lil Money">$ Lil Money</option>
                  <option value="$$ Some Money">$$ Some Money</option>
                  <option value="$$$ Big Money">$$$ Big Money</option>
                  <option value="$$$$ Huge Money">$$$$ Huge Money</option>
                </select>
              </div>
            </div>

            {/* Hours */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ color: '#9ca3af', display: 'block', marginBottom: '8px', fontSize: '14px' }}>Hours Projected</label>
                <input
                  type="number"
                  value={taskFormData.hours_projected ?? (editingTask?.hours_projected || 0)}
                  onChange={(e) => setTaskFormData({ ...taskFormData, hours_projected: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#1a1f2e',
                    border: '1px solid #2d3748',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ color: '#9ca3af', display: 'block', marginBottom: '8px', fontSize: '14px' }}>Hours Worked</label>
                <input
                  type="number"
                  value={taskFormData.hours_worked ?? (editingTask?.hours_worked || 0)}
                  onChange={(e) => setTaskFormData({ ...taskFormData, hours_worked: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#1a1f2e',
                    border: '1px solid #2d3748',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Due Date */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ color: '#9ca3af', display: 'block', marginBottom: '8px', fontSize: '14px' }}>Due Date</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  value={taskFormData.due_date ? new Date(taskFormData.due_date).toISOString().split('T')[0] : (editingTask?.due_date ? new Date(editingTask.due_date).toISOString().split('T')[0] : '')}
                  onChange={(e) => setTaskFormData({ ...taskFormData, due_date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 40px',
                    backgroundColor: '#1a1f2e',
                    border: '1px solid #2d3748',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}>📅</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              {editingTask && (
                <button
                  onClick={() => deleteTask(editingTask.id)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#dc2626',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '14px'
                  }}
                >
                  Delete Task
                </button>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setEditingTask(null)
                    setShowAddTaskModal(false)
                    setTaskFormData({})
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#e5e7eb',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (editingTask) {
                      // Update task
                      await supabase.from('TG To Do List').update({
                        task_name: taskFormData.task_name || editingTask.task_name,
                        description: taskFormData.description || editingTask.description,
                        area: taskFormData.area || editingTask.area,
                        task_type: taskFormData.task_type || editingTask.task_type,
                        priority: taskFormData.priority || editingTask.priority,
                        effort_level: taskFormData.effort_level || editingTask.effort_level,
                        due_date: taskFormData.due_date || editingTask.due_date,
                        'Hours Projected': taskFormData.hours_projected ?? editingTask.hours_projected,
                        'Hours Worked': taskFormData.hours_worked ?? editingTask.hours_worked
                      }).eq('id', editingTask.id)
                      if (session) fetchTasks(session.user.id)
                    } else {
                      // Create new task
                      await supabase.from('TG To Do List').insert({
                        task_name: taskFormData.task_name,
                        description: taskFormData.description || '',
                        area: taskFormData.area || 'Personal',
                        task_type: taskFormData.task_type || '',
                        status: 'Not started',
                        automation: 'Manual',
                        priority: taskFormData.priority || 'Medium',
                        effort_level: taskFormData.effort_level || '$ Lil Money',
                        due_date: taskFormData.due_date || null,
                        user_id: session?.user.id,
                        'Hours Projected': taskFormData.hours_projected || 0,
                        'Hours Worked': taskFormData.hours_worked || 0
                      })
                      if (session) fetchTasks(session.user.id)
                    }
                    setEditingTask(null)
                    setShowAddTaskModal(false)
                    setTaskFormData({})
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#60a5fa',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '14px'
                  }}
                >
                  {editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Picker Modal */}
      {showDatePicker && datePickerTask && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => {
            setShowDatePicker(false)
            setDatePickerTask(null)
          }}
        >
          <div
            style={{
              backgroundColor: '#0f1419',
              borderRadius: '12px',
              padding: '28px',
              width: '400px',
              border: 'none'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '600', margin: 0 }}>
                {datePickerTask.status === 'Done' ? 'Change Completion Date' : 'Change Due Date'}
              </h2>
              <button
                onClick={() => {
                  setShowDatePicker(false)
                  setDatePickerTask(null)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  fontSize: '28px',
                  cursor: 'pointer',
                  padding: '0',
                  lineHeight: '1'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ color: '#9ca3af', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                Task: {datePickerTask.task_name}
              </label>
              <label style={{ color: '#9ca3af', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                {datePickerTask.status === 'Done' ? 'New Completion Date' : 'New Due Date'}
              </label>
              <input
                type="date"
                defaultValue={datePickerTask.status === 'Done' ? (datePickerTask.completed_at?.split('T')[0] || '') : (datePickerTask.due_date || '')}
                onChange={(e) => {
                  if (e.target.value) {
                    updateTaskDueDate(datePickerTask.id, e.target.value, datePickerTask.status === 'Done')
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1a1f2e',
                  border: '1px solid #2d3748',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
            </div>

            <button
              onClick={() => {
                setShowDatePicker(false)
                setDatePickerTask(null)
              }}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#60a5fa',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

