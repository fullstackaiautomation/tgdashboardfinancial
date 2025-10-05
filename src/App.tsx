import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

type Area = 'Full Stack' | 'S4' | '808' | 'Personal' | 'Huge Capital' | 'Golf' | 'Health'

interface Task {
  id: string
  task_name: string
  description: string
  area: Area
  task_type: string
  status: string
  priority: string
  due_date: string | null
  completed_at: string | null
  hours_projected: number | null
  effort_level: string
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
  const [activeMainTab, setActiveMainTab] = useState<'grinding'>('grinding')
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

      if (error) throw error
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

  const isToday = (dateStr: string | null) => {
    if (!dateStr) return false
    const today = new Date().toISOString().split('T')[0]
    return dateStr.startsWith(today)
  }

  const isTomorrow = (dateStr: string | null) => {
    if (!dateStr) return false
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    return dateStr.startsWith(tomorrowStr)
  }

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false
    const taskDate = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return taskDate < today
  }

  const filteredTasks = selectedArea === 'All Areas'
    ? tasks
    : tasks.filter(t => t.area === selectedArea)

  const stats = {
    active: tasks.filter(t => t.status !== 'Done').length,
    completed: tasks.filter(t => t.status === 'Done').length,
    recurring: tasks.filter(t => t.status !== 'Done').length,
    overdue: tasks.filter(t => isOverdue(t.due_date) && t.status !== 'Done').length,
    dueToday: tasks.filter(t => isToday(t.due_date) && t.status !== 'Done').length,
    completedToday: tasks.filter(t => isToday(t.due_date) && t.status === 'Done').length,
    dueTomorrow: tasks.filter(t => isTomorrow(t.due_date) && t.status !== 'Done').length,
  }

  const areaStats = {
    'All Areas': { count: tasks.length, hours: tasks.reduce((sum, t) => sum + (t.hours_projected || 0), 0) },
    'Full Stack': { count: tasks.filter(t => t.area === 'Full Stack').length, hours: tasks.filter(t => t.area === 'Full Stack').reduce((sum, t) => sum + (t.hours_projected || 0), 0) },
    'Huge Capital': { count: tasks.filter(t => t.area === 'Huge Capital').length, hours: tasks.filter(t => t.area === 'Huge Capital').reduce((sum, t) => sum + (t.hours_projected || 0), 0) },
    'S4': { count: tasks.filter(t => t.area === 'S4').length, hours: tasks.filter(t => t.area === 'S4').reduce((sum, t) => sum + (t.hours_projected || 0), 0) },
    'Personal': { count: tasks.filter(t => t.area === 'Personal').length, hours: tasks.filter(t => t.area === 'Personal').reduce((sum, t) => sum + (t.hours_projected || 0), 0) },
    '808': { count: tasks.filter(t => t.area === '808').length, hours: tasks.filter(t => t.area === '808').reduce((sum, t) => sum + (t.hours_projected || 0), 0) },
    'Health': { count: tasks.filter(t => t.area === 'Health').length, hours: tasks.filter(t => t.area === 'Health').reduce((sum, t) => sum + (t.hours_projected || 0), 0) },
    'Golf': { count: tasks.filter(t => t.area === 'Golf').length, hours: tasks.filter(t => t.area === 'Golf').reduce((sum, t) => sum + (t.hours_projected || 0), 0) },
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
    { area: 'All Areas', count: deepWorkSessions.length },
    { area: 'Personal', count: deepWorkSessions.filter(s => s.area === 'Personal').length },
    { area: 'Full Stack', count: deepWorkSessions.filter(s => s.area === 'Full Stack').length },
    { area: 'Huge Capital', count: deepWorkSessions.filter(s => s.area === 'Huge Capital').length },
    { area: 'S4', count: deepWorkSessions.filter(s => s.area === 'S4').length },
    { area: '808', count: deepWorkSessions.filter(s => s.area === '808').length },
    { area: 'Health', count: deepWorkSessions.filter(s => s.area === 'Health').length },
    { area: 'Golf', count: deepWorkSessions.filter(s => s.area === 'Golf').length }
  ]

  const effortLevelCounts = {
    'All Levels': deepWorkSessions.length,
    '$$$ MoneyMaker': deepWorkSessions.filter(s => s.effort_level === '$$$ MoneyMaker').length,
    '$ Lil Money': deepWorkSessions.filter(s => s.effort_level === '$ Lil Money').length,
    '-$ Save Dat Money': deepWorkSessions.filter(s => s.effort_level === '-$ Save Dat Money').length,
    ':( Pointless': deepWorkSessions.filter(s => s.effort_level === ':( Pointless').length,
    '8) JusVibin': deepWorkSessions.filter(s => s.effort_level === '8) JusVibin').length
  }

  // Top 5 tasks by duration
  const taskDurations: { [key: string]: { minutes: number, sessions: number, area: string, taskType: string } } = {}
  deepWorkSessions.forEach(session => {
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

    const sessions = deepWorkSessions.filter(s => {
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
          {/* Main Tab - Grinding */}
          <div style={{ marginBottom: '8px' }}>
            <button
              onClick={() => setActiveMainTab('grinding')}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: activeMainTab === 'grinding' ? '#f97316' : 'transparent',
                color: activeMainTab === 'grinding' ? 'white' : '#f97316',
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
              💪 Grinding
            </button>
          </div>

          {/* Sub Tabs */}
          {activeMainTab === 'grinding' && (
            <div style={{ marginLeft: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button
                onClick={() => setActiveSubTab('todo')}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: activeSubTab === 'todo' ? '#2a2a2a' : 'transparent',
                  color: activeSubTab === 'todo' ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: activeSubTab === 'todo' ? '500' : '400',
                  fontSize: '14px',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📋 To-Do List
              </button>
              <button
                onClick={() => setActiveSubTab('schedule')}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: activeSubTab === 'schedule' ? '#2a2a2a' : 'transparent',
                  color: activeSubTab === 'schedule' ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: activeSubTab === 'schedule' ? '500' : '400',
                  fontSize: '14px',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📅 Schedule
              </button>
              <button
                onClick={() => setActiveSubTab('deepwork')}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: activeSubTab === 'deepwork' ? '#2a2a2a' : 'transparent',
                  color: activeSubTab === 'deepwork' ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: activeSubTab === 'deepwork' ? '500' : '400',
                  fontSize: '14px',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                🎯 Deep Work
              </button>
            </div>
          )}
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
              Tyler Grassmick
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {activeSubTab === 'todo' && (
          <div style={{ display: 'flex', gap: '24px' }}>
            {/* Left Column - Stats & Tasks */}
            <div style={{ flex: 1 }}>
              {/* Stats Grid - Row 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                <div style={{ backgroundColor: '#2563eb', padding: '20px', borderRadius: '12px', border: '2px solid #3b82f6' }}>
                  <div style={{ fontSize: '12px', color: '#bfdbfe', marginBottom: '4px' }}>🔵 Active</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.active}</div>
                </div>
                <div style={{ backgroundColor: '#16a34a', padding: '20px', borderRadius: '12px', border: '2px solid #22c55e' }}>
                  <div style={{ fontSize: '12px', color: '#bbf7d0', marginBottom: '4px' }}>🟢 Completed</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.completed}</div>
                </div>
                <div style={{ backgroundColor: '#9333ea', padding: '20px', borderRadius: '12px', border: '2px solid #a855f7' }}>
                  <div style={{ fontSize: '12px', color: '#e9d5ff', marginBottom: '4px' }}>🔁 Recurring</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>5</div>
                </div>
                <div style={{ backgroundColor: '#dc2626', padding: '20px', borderRadius: '12px', border: '2px solid #ef4444' }}>
                  <div style={{ fontSize: '12px', color: '#fecaca', marginBottom: '4px' }}>🔴 Overdue</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.overdue}</div>
                </div>
              </div>

              {/* Stats Grid - Row 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                <div style={{ backgroundColor: '#eab308', padding: '20px', borderRadius: '12px', border: '2px solid #facc15' }}>
                  <div style={{ fontSize: '12px', color: '#fef3c7', marginBottom: '4px' }}>🟡 Due Today</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.dueToday}</div>
                </div>
                <div style={{ backgroundColor: '#16a34a', padding: '20px', borderRadius: '12px', border: '2px solid #22c55e' }}>
                  <div style={{ fontSize: '12px', color: '#bbf7d0', marginBottom: '4px' }}>🟢 Completed Today</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.completedToday}</div>
                </div>
                <div style={{ backgroundColor: '#f97316', padding: '20px', borderRadius: '12px', border: '2px solid #fb923c' }}>
                  <div style={{ fontSize: '12px', color: '#fed7aa', marginBottom: '4px' }}>🟠 Due Tomorrow</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.dueTomorrow}</div>
                </div>
                <button
                  onClick={() => setShowAddTaskModal(true)}
                  style={{
                    backgroundColor: '#9333ea',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '2px solid #a855f7',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '16px'
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
                      backgroundColor: selectedArea === area ? '#60a5fa' : '#2a2a2a',
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
                {filteredTasks.filter(t => isOverdue(t.due_date) && t.status !== 'Done').slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    onDoubleClick={() => setEditingTask(task)}
                    style={{
                      backgroundColor: getAreaColor(task.area as Area),
                      padding: '16px',
                      borderRadius: '12px',
                      borderLeft: '6px solid #dc2626',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                      <input
                        type="checkbox"
                        checked={task.status === 'Done'}
                        onChange={() => toggleTask(task.id, task.status)}
                        style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>{task.task_name}</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          <span style={{ backgroundColor: '#dc2626', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>OVERDUE</span>
                          <span style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{task.area}</span>
                          {task.task_type && <span style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{task.task_type}</span>}
                        </div>
                        <div style={{ fontSize: '12px', marginTop: '8px', color: 'rgba(255,255,255,0.8)' }}>
                          Hours Projected: {task.hours_projected || 0} | Hours Worked: 0
                        </div>
                      </div>
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
                <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Deep Work Session ▲</h3>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Focus Area</label>
                  <select style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#1a1a1a',
                    color: 'white',
                    border: '1px solid #444',
                    borderRadius: '6px'
                  }}>
                    <option>Select focus area</option>
                    <option>Full Stack</option>
                    <option>Huge Capital</option>
                    <option>S4</option>
                  </select>
                </div>
                <div style={{ fontSize: '48px', textAlign: 'center', margin: '32px 0', fontWeight: 'bold' }}>
                  00:00
                </div>
                <button style={{
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
                  value={taskFormData.area || (editingTask?.area || 'Personal')}
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
                <input
                  type="text"
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
                  placeholder="Select type..."
                />
              </div>
            </div>

            {/* Priority and Effort Level */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ color: '#9ca3af', display: 'block', marginBottom: '8px', fontSize: '14px' }}>Priority</label>
                <select
                  value={taskFormData.priority || (editingTask?.priority || 'Medium')}
                  onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value })}
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
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <label style={{ color: '#9ca3af', display: 'block', marginBottom: '8px', fontSize: '14px' }}>Money Maker</label>
                <select
                  value={taskFormData.effort_level || (editingTask?.effort_level || '$ Lil Money')}
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
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
      )}
    </div>
  )
}

export default App
