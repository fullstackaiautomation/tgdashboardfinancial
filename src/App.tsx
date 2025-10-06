import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'
import ContentLibrary from './components/ContentLibrary'

type Area = 'Full Stack' | 'S4' | '808' | 'Personal' | 'Huge Capital' | 'Golf' | 'Health'
type EffortLevel = '$$$ Printer $$$' | '$ Makes Money $' | '-$ Save Dat $-' | ':( No Money ):' | '8) Vibing (8'
type Priority = 'Low' | 'Medium' | 'High'
type RecurringType = 'none' | 'daily' | 'daily_weekdays' | 'weekly' | 'monthly' | 'custom'

interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}

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
  created_at: string | null
  checklist: ChecklistItem[]
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
  const [scheduledTasks, setScheduledTasks] = useState<{[hour: number]: {task: Task, duration: number}[]}>({})  // Track tasks with duration (in 30-min slots)
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<string>(new Date().toISOString().split('T')[0]) // YYYY-MM-DD format
  const [activeMainTab, setActiveMainTab] = useState<'daily' | 'content'>('daily')
  const [activeSubTab, setActiveSubTab] = useState<'todo' | 'schedule' | 'deepwork'>('todo')
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<'All Time' | 'Today' | 'This Week' | 'This Month'>('All Time')
  const [selectedDWArea, setSelectedDWArea] = useState<Area | 'All Areas'>('All Areas')
  const [selectedEffortLevel, setSelectedEffortLevel] = useState<string>('All Levels')
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<any>({})
  // const [chartView, setChartView] = useState<'areas' | 'effort'>('areas')
  // const [chartDateRange, setChartDateRange] = useState<'all' | 'monthly' | 'weekly' | 'custom'>('all')
  // const [customStartDate, setCustomStartDate] = useState<string>('')
  // const [customEndDate, setCustomEndDate] = useState<string>('')
  // const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [taskFormData, setTaskFormData] = useState<Partial<Task>>({})
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [datePickerTask, setDatePickerTask] = useState<Task | null>(null)
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'completed' | 'recurring' | 'overdue' | 'dueToday' | 'completedToday' | 'dueTomorrow'>('dueToday')
  const [dwSessionTask, setDwSessionTask] = useState<Task | null>(null)
  const [dwSessionTaskType, setDwSessionTaskType] = useState<string>('')
  const [dwSessionFocusArea, setDwSessionFocusArea] = useState<Area | ''>('')
  const [dwTaskSearchTerm, setDwTaskSearchTerm] = useState<string>('')
  const [showDwTaskDropdown, setShowDwTaskDropdown] = useState<boolean>(false)
  const [timerRunning, setTimerRunning] = useState<boolean>(false)
  const [timerPaused, setTimerPaused] = useState<boolean>(false)
  const [timerSeconds, setTimerSeconds] = useState<number>(0)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [pausedDuration, setPausedDuration] = useState<number>(0)
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null)
  const [editTaskSearchTerm, setEditTaskSearchTerm] = useState<string>('')
  const [showEditTaskDropdown, setShowEditTaskDropdown] = useState<boolean>(false)
  const [editingTaskField, setEditingTaskField] = useState<{taskId: string, field: string} | null>(null)

  // Ref to track latest scheduledTasks without causing re-renders
  const scheduledTasksRef = useRef(scheduledTasks)
  const selectedScheduleDateRef = useRef(selectedScheduleDate)

  // Update refs whenever values change
  useEffect(() => {
    scheduledTasksRef.current = scheduledTasks
  }, [scheduledTasks])

  useEffect(() => {
    selectedScheduleDateRef.current = selectedScheduleDate
  }, [selectedScheduleDate])

  // Load persisted timer state and schedule on mount
  useEffect(() => {
    // Load Deep Work session
    const storedSession = localStorage.getItem('deepWorkSession')
    if (storedSession) {
      const sessionData = JSON.parse(storedSession)
      if (sessionData.isRunning) {
        setTimerRunning(true)
        setSessionStartTime(new Date(sessionData.startTime))
        setDwSessionTask(sessionData.task)
        setDwSessionTaskType(sessionData.taskType || '')
        setDwSessionFocusArea(sessionData.focusArea)
        setPausedDuration(sessionData.pausedDuration || 0)

        if (sessionData.isPaused) {
          setTimerPaused(true)
          setPauseStartTime(sessionData.pauseStartTime ? new Date(sessionData.pauseStartTime) : null)
        }
      }
    }

    // Load today's schedule
    const today = new Date().toISOString().split('T')[0]
    const storedSchedule = localStorage.getItem(`schedule_${today}`)
    if (storedSchedule) {
      const scheduleData = JSON.parse(storedSchedule)
      if (scheduleData.tasks) {
        setScheduledTasks(scheduleData.tasks)
      }
    }
  }, [])

  // Save and load schedule when date changes
  useEffect(() => {
    // Save current schedule before switching (using previous date from ref)
    return () => {
      const currentDate = selectedScheduleDateRef.current
      const currentTasks = scheduledTasksRef.current
      if (Object.keys(currentTasks).length > 0) {
        localStorage.setItem(`schedule_${currentDate}`, JSON.stringify({
          date: currentDate,
          tasks: currentTasks
        }))
      }
    }
  }, [selectedScheduleDate])

  // Load schedule when date changes
  useEffect(() => {
    const storedSchedule = localStorage.getItem(`schedule_${selectedScheduleDate}`)
    if (storedSchedule) {
      const scheduleData = JSON.parse(storedSchedule)
      if (scheduleData.tasks) {
        setScheduledTasks(scheduleData.tasks)
      } else {
        setScheduledTasks({})
      }
    } else {
      setScheduledTasks({})
    }
  }, [selectedScheduleDate])

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
      // Calculate elapsed time based on actual timestamps
      interval = setInterval(() => {
        if (sessionStartTime) {
          const now = new Date()
          const elapsed = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000)
          setTimerSeconds(elapsed - pausedDuration)
        }
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timerRunning, timerPaused, sessionStartTime, pausedDuration])

  // Save session state to localStorage whenever it changes
  useEffect(() => {
    if (timerRunning) {
      const sessionData = {
        isRunning: timerRunning,
        isPaused: timerPaused,
        startTime: sessionStartTime?.toISOString(),
        pauseStartTime: pauseStartTime?.toISOString(),
        pausedDuration,
        task: dwSessionTask,
        taskType: dwSessionTaskType,
        focusArea: dwSessionFocusArea
      }
      localStorage.setItem('deepWorkSession', JSON.stringify(sessionData))
    } else {
      localStorage.removeItem('deepWorkSession')
    }
  }, [timerRunning, timerPaused, sessionStartTime, pauseStartTime, pausedDuration, dwSessionTask, dwSessionTaskType, dwSessionFocusArea])

  const fetchTasks = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('TG To Do List')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // For now, just set the tasks directly without transformation
      // We'll handle checklist parsing when displaying
      setTasks(data || [])
      console.log('Fetched tasks:', data?.length || 0, 'tasks')
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  const toggleChecklistItem = async (taskId: string, checklistItemId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId)
      if (!task) return

      const updatedChecklist = task.checklist.map(item =>
        item.id === checklistItemId ? { ...item, completed: !item.completed } : item
      )

      const { error } = await supabase
        .from('TG To Do List')
        .update({
          checklist: JSON.stringify(updatedChecklist)
        })
        .eq('id', taskId)

      if (error) throw error

      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, checklist: updatedChecklist } : t
      ))
    } catch (error) {
      console.error('Error toggling checklist item:', error)
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

  const updateTaskFieldInline = async (taskId: string, field: string, value: any) => {
    try {
      const updateData: any = {}

      // Map field names to database column names
      if (field === 'hours_projected') {
        updateData['Hours Projected'] = value ? Number(value) : null
      } else if (field === 'hours_worked') {
        updateData['Hours Worked'] = value ? Number(value) : null
      } else {
        updateData[field] = value
      }

      const { error } = await supabase
        .from('TG To Do List')
        .update(updateData)
        .eq('id', taskId)

      if (error) throw error

      if (session) fetchTasks(session.user.id)
      setEditingTaskField(null)
    } catch (error) {
      console.error('Error updating task field:', error)
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
    const now = new Date()
    setTimerRunning(true)
    setTimerPaused(false)
    setSessionStartTime(now)
    setPausedDuration(0)
    setPauseStartTime(null)
  }

  const pauseTimer = () => {
    if (timerPaused) {
      // Resuming from pause
      if (pauseStartTime) {
        const pauseEnd = new Date()
        const pauseDiff = Math.floor((pauseEnd.getTime() - pauseStartTime.getTime()) / 1000)
        setPausedDuration(prev => prev + pauseDiff)
      }
      setPauseStartTime(null)
      setTimerPaused(false)
    } else {
      // Pausing
      setPauseStartTime(new Date())
      setTimerPaused(true)
    }
  }

  const saveSession = async () => {
    // Calculate final elapsed time
    let finalSeconds = timerSeconds
    if (sessionStartTime) {
      const now = new Date()
      finalSeconds = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000) - pausedDuration

      // If currently paused, add the current pause duration
      if (timerPaused && pauseStartTime) {
        const currentPauseDuration = Math.floor((now.getTime() - pauseStartTime.getTime()) / 1000)
        finalSeconds -= currentPauseDuration
      }
    }

    console.log('🔵 saveSession called', {
      hasSession: !!session,
      sessionStartTime,
      dwSessionFocusArea,
      finalSeconds,
      durationMinutes: Math.floor(finalSeconds / 60)
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
          duration_minutes: Math.floor(finalSeconds / 60)
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
    setPausedDuration(0)
    setPauseStartTime(null)
    setDwSessionTask(null)
    setDwSessionTaskType('')
    setDwSessionFocusArea('')
    setDwTaskSearchTerm('')
    localStorage.removeItem('deepWorkSession')
  }

  const cancelTimerSession = () => {
    setTimerRunning(false)
    setTimerPaused(false)
    setTimerSeconds(0)
    setSessionStartTime(null)
    setPausedDuration(0)
    setPauseStartTime(null)
    setDwSessionTask(null)
    setDwSessionTaskType('')
    setDwSessionFocusArea('')
    setDwTaskSearchTerm('')
    localStorage.removeItem('deepWorkSession')
  }

  const saveScheduleLog = async () => {
    if (!session) {
      alert('You must be logged in to save schedules.')
      return
    }

    if (Object.keys(scheduledTasks).length === 0) {
      alert('No tasks scheduled. Add tasks to the schedule first.')
      return
    }

    try {
      // Format scheduled tasks for storage
      const scheduleData = Object.entries(scheduledTasks).map(([slotIndex, items]) => {
        const slot = parseInt(slotIndex)
        const totalMinutes = slot * 30
        const hours = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60
        const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
        const ampm = hours < 12 ? 'AM' : 'PM'
        const timeLabel = `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`

        return items.map(item => ({
          time_slot: timeLabel,
          slot_index: slot,
          task_id: item.task.id,
          task_name: item.task.task_name,
          duration_slots: item.duration,
          area: item.task.area
        }))
      }).flat()

      const { data, error } = await supabase
        .from('schedule_log')
        .insert({
          user_id: session.user.id,
          date: selectedScheduleDate,
          schedule_data: scheduleData,
          created_at: new Date().toISOString()
        })
        .select()

      if (error) throw error

      console.log('✅ Schedule saved to log:', data)
      // Optional: Show success message to user
      alert(`Schedule for ${selectedScheduleDate} saved successfully!`)

    } catch (error: any) {
      console.error('Error saving schedule:', error)
      const errorMessage = error?.message || error?.toString() || 'Unknown error'
      alert(`Failed to save schedule: ${errorMessage}`)
    }
  }

  // Auto-save schedule at end of day (11:59 PM)
  useEffect(() => {
    const checkEndOfDay = () => {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()

      // Check if it's 11:59 PM
      if (hours === 23 && minutes === 59) {
        saveScheduleLog()
      }
    }

    // Check every minute
    const interval = setInterval(checkEndOfDay, 60000)

    return () => {
      clearInterval(interval)
    }
  }, [session])

  // Separate effect for localStorage auto-save (runs once, uses ref for latest value)
  useEffect(() => {
    const saveInterval = setInterval(() => {
      const currentScheduledTasks = scheduledTasksRef.current
      const currentDate = selectedScheduleDateRef.current
      if (Object.keys(currentScheduledTasks).length > 0) {
        localStorage.setItem(`schedule_${currentDate}`, JSON.stringify({
          date: currentDate,
          tasks: currentScheduledTasks
        }))
      }
    }, 30000) // Every 30 seconds

    return () => {
      clearInterval(saveInterval)
    }
  }, [])

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
      task_name: sessionData.task?.task_name || '',  // Store the task name
      effort_level: sessionData.effort_level,
      notes: sessionData.notes,
      duration_minutes: sessionData.duration_minutes,
      start_time: sessionData.start_time,
      end_time: sessionData.end_time
    })
    setEditTaskSearchTerm(sessionData.task?.task_name || '')
  }

  const roundToQuarterHour = (date: Date): Date => {
    const roundedDate = new Date(date)
    const minutes = roundedDate.getMinutes()
    const remainder = minutes % 15
    const roundedMinutes = remainder < 8 ? minutes - remainder : minutes + (15 - remainder)
    roundedDate.setMinutes(roundedMinutes, 0, 0)
    return roundedDate
  }

  const startAddingNewSession = () => {
    const now = roundToQuarterHour(new Date())
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    setEditingSessionId('new')
    setEditFormData({
      area: 'Full Stack',
      task_type: '',
      task_name: '',
      task_id: null,
      effort_level: '',
      duration_minutes: 60,
      start_time: oneHourAgo.toISOString(),
      end_time: now.toISOString(),
      notes: ''
    })
    setEditTaskSearchTerm('')
  }

  const cancelEditingSession = () => {
    setEditingSessionId(null)
    setEditFormData({})
    setEditTaskSearchTerm('')
    setShowEditTaskDropdown(false)
  }

  const saveEditedSession = async (sessionId: string) => {
    try {
      // Calculate duration from start and end times
      const startTime = new Date(editFormData.start_time)
      const endTime = new Date(editFormData.end_time)
      const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60))

      const sessionData = {
        area: editFormData.area,
        task_type: editFormData.task_type,
        task_id: editFormData.task_id,
        effort_level: editFormData.effort_level,
        notes: editFormData.notes,
        duration_minutes: durationMinutes,
        start_time: editFormData.start_time,
        end_time: editFormData.end_time
      }

      if (sessionId === 'new') {
        // Create new session
        const { error } = await supabase
          .from('deep_work_log')
          .insert({
            ...sessionData,
            user_id: session?.user.id
          })

        if (error) throw error
      } else {
        // Update existing session
        const { error } = await supabase
          .from('deep_work_log')
          .update(sessionData)
          .eq('id', sessionId)

        if (error) throw error
      }

      if (session) fetchDeepWorkSessions(session.user.id)
      setEditingSessionId(null)
      setEditFormData({})
      setEditTaskSearchTerm('')
      setShowEditTaskDropdown(false)
    } catch (error) {
      console.error('Error saving session:', error)
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
      setEditTaskSearchTerm('')
      setShowEditTaskDropdown(false)
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

  const getEffortLevelColor = (effortLevel: EffortLevel | undefined | string) => {
    const colors: Record<string, string> = {
      '$$$ Printer $$$': '#22c55e',  // Bright Green
      '$ Makes Money $': '#15803d',   // Dark Green
      '-$ Save Dat $-': '#fb923c',    // Orange
      ':( No Money ):': '#ef4444',    // Red
      '8) Vibing (8': '#a855f7'       // Purple
    }
    return colors[effortLevel || ''] || '#6b7280'
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
        filteredTasks = filteredTasks.filter(t => t.recurring_type !== undefined && t.recurring_type !== null && t.recurring_type !== 'none')
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
    recurring: tasks.filter(t => t.recurring_type !== undefined && t.recurring_type !== null && t.recurring_type !== 'none').length,
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
    '$$$ Printer $$$': filteredDWSessions.filter(s => s.effort_level === '$$$ Printer $$$').length,
    '$ Makes Money $': filteredDWSessions.filter(s => s.effort_level === '$ Makes Money $').length,
    '-$ Save Dat $-': filteredDWSessions.filter(s => s.effort_level === '-$ Save Dat $-').length,
    ':( No Money ):': filteredDWSessions.filter(s => s.effort_level === ':( No Money ):').length,
    '8) Vibing (8': filteredDWSessions.filter(s => s.effort_level === '8) Vibing (8').length
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

          {/* Main Tab - Content Library */}
          <div style={{ marginBottom: '8px' }}>
            <button
              onClick={() => setActiveMainTab('content')}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: activeMainTab === 'content' ? '#10b981' : 'transparent',
                color: activeMainTab === 'content' ? 'white' : '#10b981',
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
                <path d="M2 3h12M2 8h12M2 13h12" />
                <circle cx="5" cy="3" r="1" fill="currentColor" />
                <circle cx="5" cy="8" r="1" fill="currentColor" />
                <circle cx="5" cy="13" r="1" fill="currentColor" />
              </svg>
              Content Library
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
        {activeMainTab === 'daily' && (
          <>
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
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', height: 'calc(100vh - 120px)' }}>
          {activeSubTab === 'todo' && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            gap: '24px',
            padding: '24px'
          }}>
            {/* Left Column - Stats & Tasks */}
            <div
              className="custom-scrollbar"
              style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingRight: '10px'
            }}>
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
                    backgroundColor: '#f97316',
                    padding: '20px',
                    borderRadius: '12px',
                    border: 'none',
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
                  Add Task
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
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('task', JSON.stringify(task))
                      e.currentTarget.style.opacity = '0.5'
                    }}
                    onDragEnd={(e) => {
                      e.currentTarget.style.opacity = '1'
                    }}
                    onDoubleClick={() => setEditingTask(task)}
                    style={{
                      background: `${getAreaColor(task.area as Area)}66`,
                      padding: '20px',
                      borderRadius: '12px',
                      border: `2px solid ${isOverdue(task.due_date) ? '#dc2626' : isToday(task.due_date) ? '#eab308' : isTomorrow(task.due_date) ? '#f97316' : '#6b7280'}`,
                      cursor: 'grab',
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
                          border: `1px solid ${task.status === 'Done' ? '#10b981' : isOverdue(task.due_date) ? '#dc2626' : isToday(task.due_date) ? '#eab308' : isTomorrow(task.due_date) ? '#f97316' : 'white'}`,
                          color: task.status === 'Done' ? '#10b981' : isOverdue(task.due_date) ? '#dc2626' : isToday(task.due_date) ? '#eab308' : isTomorrow(task.due_date) ? '#f97316' : 'white',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          cursor: 'pointer',
                          minWidth: '80px'
                        }}
                      >
                        <div style={{ fontSize: '10px', marginBottom: '2px', opacity: 0.9 }}>
                          {task.status === 'Done' ? 'COMPLETED' : isOverdue(task.due_date) ? 'OVERDUE' : isToday(task.due_date) ? 'DUE' : isTomorrow(task.due_date) ? 'DUE' : 'UPCOMING'}
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                          {task.status === 'Done' && task.completed_at
                            ? (() => {
                                const parts = task.completed_at.split('T')[0].split('-')
                                const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              })()
                            : task.due_date ? (() => {
                                if (isToday(task.due_date)) {
                                  return 'Today'
                                } else if (isTomorrow(task.due_date)) {
                                  return 'Tomorrow'
                                } else {
                                  const parts = task.due_date.split('T')[0].split('-')
                                  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
                                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                }
                              })() : 'No Date'}
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

                    {/* Three Column Content Area */}
                    <div style={{ flex: 1, display: 'flex', gap: '15px' }}>
                      {/* Column 1: Main Task Content */}
                      <div style={{ minWidth: '320px' }}>
                      {/* Editable Task Name */}
                      {editingTaskField?.taskId === task.id && editingTaskField?.field === 'task_name' ? (
                        <input
                          type="text"
                          defaultValue={task.task_name}
                          autoFocus
                          onBlur={(e) => updateTaskFieldInline(task.id, 'task_name', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateTaskFieldInline(task.id, 'task_name', e.currentTarget.value)
                            } else if (e.key === 'Escape') {
                              setEditingTaskField(null)
                            }
                          }}
                          style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            marginBottom: '12px',
                            color: 'white',
                            backgroundColor: '#2d3748',
                            border: '2px solid #3b82f6',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            width: '100%',
                            outline: 'none'
                          }}
                        />
                      ) : (
                        <h3
                          onClick={() => setEditingTaskField({taskId: task.id, field: 'task_name'})}
                          style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            marginBottom: '12px',
                            color: 'white',
                            textDecoration: task.status === 'Done' ? 'line-through' : 'none',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d3748'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          {task.task_name}
                        </h3>
                      )}

                      {/* Badges */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        {/* Editable Area */}
                        {editingTaskField?.taskId === task.id && editingTaskField?.field === 'area' ? (
                          <select
                            defaultValue={task.area}
                            autoFocus
                            onBlur={(e) => updateTaskFieldInline(task.id, 'area', e.target.value)}
                            onChange={(e) => updateTaskFieldInline(task.id, 'area', e.target.value)}
                            onClick={(e) => e.currentTarget.focus()}
                            style={{
                              backgroundColor: getAreaColor(task.area as Area),
                              color: 'white',
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              border: '2px solid #3b82f6',
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            <option value="Full Stack" style={{backgroundColor: getAreaColor('Full Stack'), color: 'white', padding: '4px'}}>Full Stack</option>
                            <option value="S4" style={{backgroundColor: getAreaColor('S4'), color: 'white', padding: '4px'}}>S4</option>
                            <option value="808" style={{backgroundColor: getAreaColor('808'), color: 'white', padding: '4px'}}>808</option>
                            <option value="Personal" style={{backgroundColor: getAreaColor('Personal'), color: 'white', padding: '4px'}}>Personal</option>
                            <option value="Huge Capital" style={{backgroundColor: getAreaColor('Huge Capital'), color: 'white', padding: '4px'}}>Huge Capital</option>
                            <option value="Golf" style={{backgroundColor: getAreaColor('Golf'), color: 'white', padding: '4px'}}>Golf</option>
                            <option value="Health" style={{backgroundColor: getAreaColor('Health'), color: 'white', padding: '4px'}}>Health</option>
                          </select>
                        ) : (
                          <span
                            onClick={() => setEditingTaskField({taskId: task.id, field: 'area'})}
                            style={{
                              backgroundColor: getAreaColor(task.area as Area),
                              color: 'white',
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            {task.area}
                          </span>
                        )}

                        {/* Editable Task Type */}
                        {editingTaskField?.taskId === task.id && editingTaskField?.field === 'task_type' ? (
                          <select
                            defaultValue={task.task_type || ''}
                            autoFocus
                            onBlur={(e) => updateTaskFieldInline(task.id, 'task_type', e.target.value)}
                            onChange={(e) => updateTaskFieldInline(task.id, 'task_type', e.target.value)}
                            onClick={(e) => e.currentTarget.focus()}
                            style={{
                              backgroundColor: '#f59e0b',
                              color: 'white',
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              border: '2px solid #3b82f6',
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            <option value="" style={{backgroundColor: '#1a1f2e', color: 'white', padding: '4px'}}>Select type...</option>
                            {getTaskTypesByArea(task.area as Area).map(type => (
                              <option key={type} value={type} style={{backgroundColor: '#f59e0b', color: 'white', padding: '4px'}}>{type}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            onClick={() => setEditingTaskField({taskId: task.id, field: 'task_type'})}
                            style={{
                              backgroundColor: '#f59e0b',
                              color: 'white',
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            {task.task_type || 'Add Type'}
                          </span>
                        )}

                        {/* Editable Effort Level */}
                        {editingTaskField?.taskId === task.id && editingTaskField?.field === 'effort_level' ? (
                          <select
                            defaultValue={task.effort_level}
                            autoFocus
                            onBlur={(e) => updateTaskFieldInline(task.id, 'effort_level', e.target.value)}
                            onChange={(e) => updateTaskFieldInline(task.id, 'effort_level', e.target.value)}
                            onClick={(e) => e.currentTarget.focus()}
                            style={{
                              backgroundColor: getEffortLevelColor(task.effort_level) + '20',
                              color: getEffortLevelColor(task.effort_level),
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              border: `2px solid #3b82f6`,
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            <option value="$$$ Printer $$$" style={{backgroundColor: getEffortLevelColor('$$$ Printer $$$'), color: 'white', padding: '4px'}}>$$$ Printer $$$</option>
                            <option value="$ Makes Money $" style={{backgroundColor: getEffortLevelColor('$ Makes Money $'), color: 'white', padding: '4px'}}>$ Makes Money $</option>
                            <option value="-$ Save Dat $-" style={{backgroundColor: getEffortLevelColor('-$ Save Dat $-'), color: 'white', padding: '4px'}}>-$ Save Dat $-</option>
                            <option value=":( No Money ):" style={{backgroundColor: getEffortLevelColor(':( No Money ):'), color: 'white', padding: '4px'}}>:( No Money ):</option>
                            <option value="8) Vibing (8" style={{backgroundColor: getEffortLevelColor('8) Vibing (8'), color: 'white', padding: '4px'}}>8) Vibing (8</option>
                          </select>
                        ) : (
                          <span
                            onClick={() => setEditingTaskField({taskId: task.id, field: 'effort_level'})}
                            style={{
                              backgroundColor: getEffortLevelColor(task.effort_level),
                              color: 'white',
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              border: `1px solid ${getEffortLevelColor(task.effort_level)}`,
                              cursor: 'pointer',
                              transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            {task.effort_level || '$ Makes Money $'}
                          </span>
                        )}
                      </div>

                      {/* Editable Hours Info */}
                      <div style={{
                        display: 'flex',
                        gap: '20px',
                        fontSize: '13px',
                        color: '#9ca3af'
                      }}>
                        {editingTaskField?.taskId === task.id && editingTaskField?.field === 'hours_projected' ? (
                          <div>
                            Hours Projected:{' '}
                            <input
                              type="number"
                              defaultValue={task.hours_projected || 1}
                              autoFocus
                              onBlur={(e) => updateTaskFieldInline(task.id, 'hours_projected', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateTaskFieldInline(task.id, 'hours_projected', e.currentTarget.value)
                                } else if (e.key === 'Escape') {
                                  setEditingTaskField(null)
                                }
                              }}
                              style={{
                                width: '60px',
                                backgroundColor: '#2d3748',
                                border: '2px solid #3b82f6',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                color: 'white',
                                fontSize: '13px',
                                outline: 'none'
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            onClick={() => setEditingTaskField({taskId: task.id, field: 'hours_projected'})}
                            style={{ cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', transition: 'background-color 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d3748'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            Hours Projected: {task.hours_projected || 1}
                          </div>
                        )}

                        {editingTaskField?.taskId === task.id && editingTaskField?.field === 'hours_worked' ? (
                          <div>
                            Hours Worked:{' '}
                            <input
                              type="number"
                              defaultValue={task.hours_worked || 0}
                              autoFocus
                              onBlur={(e) => updateTaskFieldInline(task.id, 'hours_worked', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateTaskFieldInline(task.id, 'hours_worked', e.currentTarget.value)
                                } else if (e.key === 'Escape') {
                                  setEditingTaskField(null)
                                }
                              }}
                              style={{
                                width: '60px',
                                backgroundColor: '#2d3748',
                                border: '2px solid #3b82f6',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                color: 'white',
                                fontSize: '13px',
                                outline: 'none'
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            onClick={() => setEditingTaskField({taskId: task.id, field: 'hours_worked'})}
                            style={{ cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', transition: 'background-color 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d3748'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            Hours Worked: {task.hours_worked || 0}
                          </div>
                        )}
                      </div>

                      {/* Created Date and Time */}
                      <div style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        color: '#9ca3af',
                        fontWeight: '500',
                        display: 'flex',
                        gap: '15px'
                      }}>
                        {task.created_at && (
                          <span>Created: {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        )}
                      </div>


                      {/* Scheduled Time */}
                      {(() => {
                        let scheduledInfo = null
                        for (const [slotIndex, items] of Object.entries(scheduledTasks)) {
                          const foundItem = items.find((item: any) => item.task.id === task.id)
                          if (foundItem) {
                            const slot = parseInt(slotIndex)
                            const startMinutes = slot * 30
                            const endMinutes = startMinutes + (foundItem.duration * 30)
                            const startHours = Math.floor(startMinutes / 60)
                            const startMins = startMinutes % 60
                            const endHours = Math.floor(endMinutes / 60)
                            const endMins = endMinutes % 60
                            const formatTime = (hours: number, mins: number) => {
                              const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
                              const ampm = hours < 12 ? 'AM' : 'PM'
                              return `${displayHour}:${mins.toString().padStart(2, '0')} ${ampm}`
                            }
                            const scheduleDate = new Date(selectedScheduleDate)
                            const dayName = scheduleDate.toLocaleDateString('en-US', { weekday: 'long' })
                            const dateStr = scheduleDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
                            scheduledInfo = `${dayName} ${dateStr} ${formatTime(startHours, startMins)}-${formatTime(endHours, endMins)}`
                            break
                          }
                        }
                        if (scheduledInfo) {
                          return (
                            <div style={{ marginTop: '8px', fontSize: '13px', color: '#9ca3af' }}>
                              Scheduled: {scheduledInfo}
                            </div>
                          )
                        }
                        return null
                      })()}

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

                    {/* Column 2: Checklist */}
                    <div style={{
                      flex: 1,
                      minWidth: '180px',
                      paddingRight: '15px'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#e5e7eb',
                        marginBottom: '10px'
                      }}>
                        Checklist
                      </div>
                      {(() => {
                        let checklistItems = []
                        try {
                          if (task.checklist) {
                            checklistItems = typeof task.checklist === 'string'
                              ? JSON.parse(task.checklist)
                              : task.checklist
                          }
                        } catch (e) {
                          // Silently fail if checklist can't be parsed
                        }

                        // Show at least one item (existing or placeholder)
                        if (!checklistItems || checklistItems.length === 0) {
                          checklistItems = [{
                            id: 'placeholder-1',
                            text: '',
                            completed: false
                          }]
                        }

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {checklistItems.slice(0, 3).map((item: any) => (
                              <div key={item.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (item.id !== 'placeholder-1') {
                                      toggleChecklistItem(task.id, item.id)
                                    }
                                  }}
                                  style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    border: '2px solid white',
                                    backgroundColor: item.completed ? '#3b82f6' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    flexShrink: 0
                                  }}
                                >
                                  {item.completed && (
                                    <div style={{
                                      width: '8px',
                                      height: '8px',
                                      borderRadius: '50%',
                                      backgroundColor: 'white'
                                    }}></div>
                                  )}
                                </button>
                                <input
                                  type="text"
                                  defaultValue={item.text}
                                  placeholder="Enter item..."
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => {
                                    // Delete item on backspace if empty
                                    if (e.key === 'Backspace' && e.currentTarget.value === '' && item.id !== 'placeholder-1') {
                                      const updatedChecklist = checklistItems.filter((ci: any) => ci.id !== item.id)
                                      supabase
                                        .from('TG To Do List')
                                        .update({ checklist: JSON.stringify(updatedChecklist) })
                                        .eq('id', task.id)
                                        .then(() => {
                                          setTasks(prev => prev.map(t =>
                                            t.id === task.id ? { ...t, checklist: updatedChecklist } : t
                                          ))
                                        })
                                    }
                                  }}
                                  onBlur={(e) => {
                                    // Update the checklist item text on blur
                                    if (e.target.value && e.target.value !== item.text) {
                                      const updatedChecklist = checklistItems.map((ci: any) =>
                                        ci.id === item.id ? { ...ci, text: e.target.value } : ci
                                      )
                                      // Save to database
                                      supabase
                                        .from('TG To Do List')
                                        .update({ checklist: JSON.stringify(updatedChecklist) })
                                        .eq('id', task.id)
                                        .then(() => {
                                          // Update local state
                                          setTasks(prev => prev.map(t =>
                                            t.id === task.id ? { ...t, checklist: updatedChecklist } : t
                                          ))
                                        })
                                    }
                                  }}
                                  style={{
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    borderBottom: '1px solid transparent',
                                    color: 'white',
                                    fontSize: '13px',
                                    outline: 'none',
                                    width: '100%',
                                    textDecoration: item.completed ? 'line-through' : 'none',
                                    opacity: item.completed ? 0.6 : 1,
                                    fontStyle: item.id === 'placeholder-1' ? 'italic' : 'normal',
                                    cursor: 'text',
                                    padding: '2px 0'
                                  }}
                                  onFocus={(e) => {
                                    e.currentTarget.style.borderBottom = '1px solid white'
                                  }}
                                />
                              </div>
                            ))}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                // Add new checklist item
                                const newItem = {
                                  id: `checklist-${Date.now()}`,
                                  text: '',
                                  completed: false
                                }
                                const updatedChecklist = [...checklistItems.filter((item: any) => item.id !== 'placeholder-1'), newItem]
                                supabase
                                  .from('TG To Do List')
                                  .update({ checklist: JSON.stringify(updatedChecklist) })
                                  .eq('id', task.id)
                                  .then(() => {
                                    setTasks(prev => prev.map(t =>
                                      t.id === task.id ? { ...t, checklist: updatedChecklist } : t
                                    ))
                                  })
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 8px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderRadius: '4px',
                                color: 'white',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                marginTop: '4px'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.8'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1'
                              }}
                            >
                              <span style={{ fontSize: '14px' }}>+</span>
                              Add new item
                            </button>
                          </div>
                        )
                      })()}
                    </div>

                    {/* Column 3: Think Thru Notes */}
                    <div style={{
                      width: '320px',
                      paddingLeft: '15px',
                      borderLeft: '1px solid #374151'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#e5e7eb',
                        marginBottom: '10px'
                      }}>
                        Think Thru
                      </div>
                      <textarea
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation()
                          // Here we would update the notes in the database
                          // For now it's just a placeholder
                        }}
                        placeholder="Add notes..."
                        style={{
                          width: '100%',
                          height: 'calc(100% - 30px)',
                          minHeight: '100px',
                          padding: '8px',
                          backgroundColor: '#374151',
                          border: '1px solid #4b5563',
                          borderRadius: '6px',
                          color: 'white',
                          fontSize: '12px',
                          resize: 'none',
                          outline: 'none'
                        }}
                        defaultValue={task.description || ''}
                      />
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Deep Work & Schedule */}
            <div
              className="custom-scrollbar"
              style={{
              width: '400px',
              flexShrink: 0,
              overflowY: 'auto',
              overflowX: 'hidden'
            }}>
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
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Task</label>
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
                borderRadius: '12px',
                height: '700px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
                  {/* Title with Date Navigation */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center' }}>
                    <button
                      onClick={() => {
                        const currentDate = new Date(selectedScheduleDate)
                        currentDate.setDate(currentDate.getDate() - 1)
                        setSelectedScheduleDate(currentDate.toISOString().split('T')[0])
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#374151',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      ←
                    </button>

                    <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#eab308', margin: 0 }}>
                      {(() => {
                        const date = new Date(selectedScheduleDate + 'T00:00:00')
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const tomorrow = new Date(today)
                        tomorrow.setDate(tomorrow.getDate() + 1)

                        if (date.toDateString() === today.toDateString()) {
                          return "Today's Schedule"
                        } else if (date.toDateString() === tomorrow.toDateString()) {
                          return "Tomorrow's Schedule"
                        } else {
                          return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
                        }
                      })()}
                    </h3>

                    <button
                      onClick={() => {
                        const currentDate = new Date(selectedScheduleDate)
                        currentDate.setDate(currentDate.getDate() + 1)
                        setSelectedScheduleDate(currentDate.toISOString().split('T')[0])
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#374151',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      →
                    </button>
                  </div>

                  <button
                    onClick={saveScheduleLog}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                  </button>
                </div>
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  border: '1px solid #444',
                  borderRadius: '8px',
                  backgroundColor: '#1a1a1a'
                }}>
                  {/* Time slots in 30-minute increments */}
                  {Array.from({ length: 48 }, (_, i) => {
                    const totalMinutes = i * 30
                    const hours = Math.floor(totalMinutes / 60)
                    const minutes = totalMinutes % 60
                    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
                    const ampm = hours < 12 ? 'AM' : 'PM'
                    const timeLabel = `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`

                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          borderBottom: '1px solid #333',
                          minHeight: '32px',
                          position: 'relative'
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.currentTarget.style.backgroundColor = '#374151'
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          e.currentTarget.style.backgroundColor = 'transparent'
                          const taskData = e.dataTransfer.getData('task')
                          const fromHour = e.dataTransfer.getData('fromHour')
                          const fromIndex = e.dataTransfer.getData('fromIndex')

                          if (taskData) {
                            const task = JSON.parse(taskData)

                            // If moving from another time slot, remove it from there first
                            if (fromHour !== '' && fromIndex !== '') {
                              const hour = parseInt(fromHour)
                              const index = parseInt(fromIndex)
                              const existingDuration = e.dataTransfer.getData('duration') || '2'
                              setScheduledTasks(prev => {
                                const newScheduled = { ...prev }
                                if (newScheduled[hour]) {
                                  newScheduled[hour] = newScheduled[hour].filter((_, idx) => idx !== index)
                                }
                                // Add to new time slot with duration
                                newScheduled[i] = [...(newScheduled[i] || []), { task, duration: parseInt(existingDuration) }]
                                return newScheduled
                              })
                            } else {
                              // Just adding new task from todo list with default 1 hour (2 slots) duration
                              setScheduledTasks(prev => ({
                                ...prev,
                                [i]: [...(prev[i] || []), { task, duration: 2 }]
                              }))
                            }
                          }
                        }}
                      >
                        <div style={{
                          width: '65px',
                          padding: '6px',
                          borderRight: '1px solid #333',
                          fontSize: '10px',
                          color: '#9ca3af',
                          fontWeight: '500'
                        }}>
                          {timeLabel}
                        </div>
                        <div style={{
                          flex: 1,
                          padding: '4px 8px',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          {/* Display scheduled tasks for this hour */}
                          {scheduledTasks[i]?.map((item, index) => {
                            const { task, duration } = item
                            // Calculate height based on duration (each slot is 32px)
                            const taskHeight = duration * 32 - 8 // Subtract padding

                            return (
                              <div
                                key={`${task.id}-${index}`}
                                style={{
                                  position: 'absolute',
                                  top: '4px',
                                  left: '4px',
                                  right: '4px',
                                  height: `${taskHeight}px`,
                                  backgroundColor: getAreaColor(task.area as Area),
                                  borderRadius: '4px',
                                  border: 'none',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  overflow: 'hidden',
                                  zIndex: 10,
                                  opacity: task.status === 'Done' ? 0.5 : 1
                                }}
                              >
                                {/* Top resize/drag handle */}
                                <div
                                  style={{
                                    height: '8px',
                                    backgroundColor: `${getAreaColor(task.area as Area)}`,
                                    cursor: 'move',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('task', JSON.stringify(task))
                                    e.dataTransfer.setData('fromHour', i.toString())
                                    e.dataTransfer.setData('fromIndex', index.toString())
                                    e.dataTransfer.setData('duration', duration.toString())
                                  }}
                                >
                                  <div style={{
                                    width: '30px',
                                    height: '2px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.5)',
                                    borderRadius: '1px'
                                  }} />
                                </div>

                                {/* Main task content */}
                                <div
                                  style={{
                                    flex: 1,
                                    padding: '4px 8px',
                                    color: 'white',
                                    fontSize: '11px',
                                    display: 'flex',
                                    alignItems: 'stretch',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    minHeight: 0
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <span style={{
                                      fontWeight: '500',
                                      wordBreak: 'break-word',
                                      textDecoration: task.status === 'Done' ? 'line-through' : 'none',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}>
                                      {task.status === 'Done' && '✓ '}
                                      {task.task_name}
                                    </span>
                                    <button
                                      onClick={() => {
                                        // Remove task from this time slot
                                        setScheduledTasks(prev => ({
                                          ...prev,
                                          [i]: prev[i].filter((_, idx) => idx !== index)
                                        }))
                                      }}
                                      style={{
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        padding: '0 2px',
                                        minWidth: '16px'
                                      }}
                                    >
                                      ×
                                    </button>
                                  </div>

                                  {/* Checklist items */}
                                  {(() => {
                                    try {
                                      const checklistItems = task.checklist ? (typeof task.checklist === 'string' ? JSON.parse(task.checklist) : task.checklist) : []
                                      if (checklistItems.length > 0) {
                                        return (
                                          <div style={{
                                            fontSize: '10px',
                                            color: '#d1d5db',
                                            paddingLeft: '4px',
                                            lineHeight: '1.3'
                                          }}>
                                            {checklistItems.map((item: any, idx: number) => (
                                              <span key={idx} style={{ textDecoration: item.completed ? 'line-through' : 'none' }}>
                                                {item.text}
                                                {idx < checklistItems.length - 1 ? ', ' : ''}
                                              </span>
                                            ))}
                                          </div>
                                        )
                                      }
                                      return null
                                    } catch {
                                      return null
                                    }
                                  })()}
                                </div>

                                {/* Bottom resize handle */}
                                <div
                                  style={{
                                    height: '8px',
                                    backgroundColor: `${getAreaColor(task.area as Area)}`,
                                    cursor: 'ns-resize',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    const startY = e.clientY
                                    const startDuration = duration

                                    const handleMouseMove = (moveEvent: MouseEvent) => {
                                      const deltaY = moveEvent.clientY - startY
                                      const slotChange = Math.round(deltaY / 32)
                                      const newDuration = Math.max(1, Math.min(8, startDuration + slotChange))

                                      setScheduledTasks(prev => ({
                                        ...prev,
                                        [i]: prev[i].map((t, idx) =>
                                          idx === index ? { ...t, duration: newDuration } : t
                                        )
                                      }))
                                    }

                                    const handleMouseUp = () => {
                                      document.removeEventListener('mousemove', handleMouseMove)
                                      document.removeEventListener('mouseup', handleMouseUp)
                                    }

                                    document.addEventListener('mousemove', handleMouseMove)
                                    document.addEventListener('mouseup', handleMouseUp)
                                  }}
                                >
                                  <div style={{
                                    width: '30px',
                                    height: '2px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.5)',
                                    borderRadius: '1px'
                                  }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'schedule' && (
          <div>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>📅 Daily Schedule</h2>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Plan your day and track your schedule history</p>
            </div>

            {/* Today's Schedule Section */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{
                backgroundColor: '#2a2a2a',
                padding: '24px',
                borderRadius: '12px',
                height: '700px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
                  {/* Title with Date Navigation */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'center' }}>
                    <button
                      onClick={() => {
                        const currentDate = new Date(selectedScheduleDate)
                        currentDate.setDate(currentDate.getDate() - 1)
                        setSelectedScheduleDate(currentDate.toISOString().split('T')[0])
                      }}
                      style={{
                        padding: '8px 14px',
                        backgroundColor: '#374151',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '16px'
                      }}
                    >
                      ←
                    </button>

                    <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#eab308', margin: 0 }}>
                      {(() => {
                        const date = new Date(selectedScheduleDate + 'T00:00:00')
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const tomorrow = new Date(today)
                        tomorrow.setDate(tomorrow.getDate() + 1)

                        if (date.toDateString() === today.toDateString()) {
                          return "Today's Schedule"
                        } else if (date.toDateString() === tomorrow.toDateString()) {
                          return "Tomorrow's Schedule"
                        } else {
                          return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
                        }
                      })()}
                    </h3>

                    <button
                      onClick={() => {
                        const currentDate = new Date(selectedScheduleDate)
                        currentDate.setDate(currentDate.getDate() + 1)
                        setSelectedScheduleDate(currentDate.toISOString().split('T')[0])
                      }}
                      style={{
                        padding: '8px 14px',
                        backgroundColor: '#374151',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '16px'
                      }}
                    >
                      →
                    </button>
                  </div>

                  <button
                    onClick={saveScheduleLog}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    💾 Save
                  </button>
                </div>
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  border: '1px solid #444',
                  borderRadius: '8px',
                  backgroundColor: '#1a1a1a'
                }}>
                  {/* Time slots in 30-minute increments */}
                  {Array.from({ length: 48 }, (_, i) => {
                    const totalMinutes = i * 30
                    const hours = Math.floor(totalMinutes / 60)
                    const minutes = totalMinutes % 60
                    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
                    const ampm = hours < 12 ? 'AM' : 'PM'
                    const timeLabel = `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`

                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          borderBottom: '1px solid #333',
                          minHeight: '32px',
                          position: 'relative'
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.currentTarget.style.backgroundColor = '#374151'
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          e.currentTarget.style.backgroundColor = 'transparent'
                          const taskData = e.dataTransfer.getData('task')
                          const fromHour = e.dataTransfer.getData('fromHour')
                          const fromIndex = e.dataTransfer.getData('fromIndex')

                          if (taskData) {
                            const task = JSON.parse(taskData)

                            // If moving from another time slot, remove it from there first
                            if (fromHour !== '' && fromIndex !== '') {
                              const hour = parseInt(fromHour)
                              const index = parseInt(fromIndex)
                              const existingDuration = e.dataTransfer.getData('duration') || '2'
                              setScheduledTasks(prev => {
                                const newScheduled = { ...prev }
                                if (newScheduled[hour]) {
                                  newScheduled[hour] = newScheduled[hour].filter((_, idx) => idx !== index)
                                }
                                // Add to new time slot with duration
                                newScheduled[i] = [...(newScheduled[i] || []), { task, duration: parseInt(existingDuration) }]
                                return newScheduled
                              })
                            } else {
                              // Just adding new task from todo list with default 1 hour (2 slots) duration
                              setScheduledTasks(prev => ({
                                ...prev,
                                [i]: [...(prev[i] || []), { task, duration: 2 }]
                              }))
                            }
                          }
                        }}
                      >
                        <div style={{
                          width: '65px',
                          padding: '6px',
                          borderRight: '1px solid #333',
                          fontSize: '10px',
                          color: '#9ca3af',
                          fontWeight: '500'
                        }}>
                          {timeLabel}
                        </div>
                        <div style={{
                          flex: 1,
                          padding: '4px 8px',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          {/* Display scheduled tasks for this hour */}
                          {scheduledTasks[i]?.map((item, index) => {
                            const { task, duration } = item
                            // Calculate height based on duration (each slot is 32px)
                            const taskHeight = duration * 32 - 8 // Subtract padding

                            return (
                              <div
                                key={`${task.id}-${index}`}
                                style={{
                                  position: 'absolute',
                                  top: '4px',
                                  left: '4px',
                                  right: '4px',
                                  height: `${taskHeight}px`,
                                  backgroundColor: getAreaColor(task.area as Area),
                                  borderRadius: '4px',
                                  border: 'none',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  overflow: 'hidden',
                                  zIndex: 10,
                                  opacity: task.status === 'Done' ? 0.5 : 1
                                }}
                              >
                                {/* Top resize/drag handle */}
                                <div
                                  style={{
                                    height: '8px',
                                    backgroundColor: `${getAreaColor(task.area as Area)}`,
                                    cursor: 'move',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('task', JSON.stringify(task))
                                    e.dataTransfer.setData('fromHour', i.toString())
                                    e.dataTransfer.setData('fromIndex', index.toString())
                                    e.dataTransfer.setData('duration', duration.toString())
                                  }}
                                >
                                  <div style={{
                                    width: '30px',
                                    height: '2px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.5)',
                                    borderRadius: '1px'
                                  }} />
                                </div>

                                {/* Main task content */}
                                <div
                                  style={{
                                    flex: 1,
                                    padding: '4px 8px',
                                    color: 'white',
                                    fontSize: '11px',
                                    display: 'flex',
                                    alignItems: 'stretch',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    minHeight: 0
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <span style={{
                                      fontWeight: '500',
                                      wordBreak: 'break-word',
                                      textDecoration: task.status === 'Done' ? 'line-through' : 'none',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}>
                                      {task.status === 'Done' && '✓ '}
                                      {task.task_name}
                                    </span>
                                    <button
                                      onClick={() => {
                                        // Remove task from this time slot
                                        setScheduledTasks(prev => ({
                                          ...prev,
                                          [i]: prev[i].filter((_, idx) => idx !== index)
                                        }))
                                      }}
                                      style={{
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        padding: '0 2px',
                                        minWidth: '16px'
                                      }}
                                    >
                                      ×
                                    </button>
                                  </div>

                                  {/* Checklist items */}
                                  {(() => {
                                    try {
                                      const checklistItems = task.checklist ? (typeof task.checklist === 'string' ? JSON.parse(task.checklist) : task.checklist) : []
                                      if (checklistItems.length > 0) {
                                        return (
                                          <div style={{
                                            fontSize: '10px',
                                            color: '#d1d5db',
                                            paddingLeft: '4px',
                                            lineHeight: '1.3'
                                          }}>
                                            {checklistItems.map((item: any, idx: number) => (
                                              <span key={idx} style={{ textDecoration: item.completed ? 'line-through' : 'none' }}>
                                                {item.text}
                                                {idx < checklistItems.length - 1 ? ', ' : ''}
                                              </span>
                                            ))}
                                          </div>
                                        )
                                      }
                                      return null
                                    } catch {
                                      return null
                                    }
                                  })()}
                                </div>

                                {/* Bottom resize handle */}
                                <div
                                  style={{
                                    height: '8px',
                                    backgroundColor: `${getAreaColor(task.area as Area)}`,
                                    cursor: 'ns-resize',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    const startY = e.clientY
                                    const startDuration = duration

                                    const handleMouseMove = (moveEvent: MouseEvent) => {
                                      const deltaY = moveEvent.clientY - startY
                                      const slotChange = Math.round(deltaY / 32)
                                      const newDuration = Math.max(1, Math.min(8, startDuration + slotChange))

                                      setScheduledTasks(prev => ({
                                        ...prev,
                                        [i]: prev[i].map((t, idx) =>
                                          idx === index ? { ...t, duration: newDuration } : t
                                        )
                                      }))
                                    }

                                    const handleMouseUp = () => {
                                      document.removeEventListener('mousemove', handleMouseMove)
                                      document.removeEventListener('mouseup', handleMouseUp)
                                    }

                                    document.addEventListener('mousemove', handleMouseMove)
                                    document.addEventListener('mouseup', handleMouseUp)
                                  }}
                                >
                                  <div style={{
                                    width: '30px',
                                    height: '2px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.5)',
                                    borderRadius: '1px'
                                  }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Schedule Log History */}
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#e5e7eb' }}>Schedule History</h3>
              <div style={{ backgroundColor: '#2a2a2a', padding: '24px', borderRadius: '12px' }}>
                <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0' }}>
                  Past schedules will appear here. Save today's schedule to start building your history!
                </p>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'deepwork' && (
          <>
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
                  if (levelName === '$$$ Printer $$$') return '#22c55e'
                  if (levelName === '$ Makes Money $') return '#15803d'
                  if (levelName === '-$ Save Dat $-') return '#fb923c'
                  if (levelName === ':( No Money ):') return '#ef4444'
                  if (levelName === '8) Vibing (8') return '#a855f7'
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

            {/* Deep Work Hours Summary Table */}
            <div style={{
                backgroundColor: '#2a2a2a',
                padding: '24px',
                borderRadius: '12px',
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Deep Work Hours Summary</h3>

                {/* Filter Controls */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px', display: 'block' }}>Filter by Area</label>
                    <select
                      value={selectedDWArea}
                      onChange={(e) => setSelectedDWArea(e.target.value as Area | 'All Areas')}
                      style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#1a1a1a',
                        color: 'white',
                        border: '1px solid #444',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="All Areas">All Areas</option>
                      <option value="Full Stack">Full Stack</option>
                      <option value="S4">S4</option>
                      <option value="808">808</option>
                      <option value="Personal">Personal</option>
                      <option value="Huge Capital">Huge Capital</option>
                      <option value="Golf">Golf</option>
                      <option value="Health">Health</option>
                    </select>
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px', display: 'block' }}>Filter by Money Maker</label>
                    <select
                      value={selectedEffortLevel}
                      onChange={(e) => setSelectedEffortLevel(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#1a1a1a',
                        color: 'white',
                        border: '1px solid #444',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="All Levels">All Levels</option>
                      <option value="$ Some Money">$ Some Money</option>
                      <option value="$$ Big Money">$$ Big Money</option>
                      <option value="$$$ Huge Money">$$$ Huge Money</option>
                    </select>
                  </div>
                </div>

                {/* Summary Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #444' }}>
                      <th style={{ textAlign: 'left', padding: '12px', color: '#9ca3af', fontSize: '14px', fontWeight: '600' }}>Area</th>
                      <th style={{ textAlign: 'right', padding: '12px', color: '#9ca3af', fontSize: '14px', fontWeight: '600' }}>Today</th>
                      <th style={{ textAlign: 'right', padding: '12px', color: '#9ca3af', fontSize: '14px', fontWeight: '600' }}>This Week</th>
                      <th style={{ textAlign: 'right', padding: '12px', color: '#9ca3af', fontSize: '14px', fontWeight: '600' }}>This Month</th>
                      <th style={{ textAlign: 'right', padding: '12px', color: '#9ca3af', fontSize: '14px', fontWeight: '600' }}>All Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Calculate hours for each area
                      const areas: Area[] = ['Full Stack', 'S4', '808', 'Personal', 'Huge Capital', 'Golf', 'Health']

                      const calculateHours = (area: Area | 'All', period: 'today' | 'week' | 'month' | 'all') => {
                        const now = new Date()
                        let startDate: Date

                        if (period === 'today') {
                          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                        } else if (period === 'week') {
                          startDate = new Date(now)
                          startDate.setDate(now.getDate() - now.getDay())
                          startDate.setHours(0, 0, 0, 0)
                        } else if (period === 'month') {
                          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
                        } else {
                          startDate = new Date(0)
                        }

                        let filteredSessions = deepWorkSessions.filter(s => {
                          const sessionDate = new Date(s.start_time)
                          if (sessionDate < startDate) return false
                          if (selectedDWArea !== 'All Areas' && s.area !== selectedDWArea) return false
                          return area === 'All' || s.area === area
                        })

                        const totalMinutes = filteredSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
                        return (totalMinutes / 60).toFixed(1)
                      }

                      const displayAreas = selectedDWArea === 'All Areas' ? areas : areas.filter(a => a === selectedDWArea)

                      return (
                        <>
                          {displayAreas.map(area => (
                            <tr key={area} style={{ borderBottom: '1px solid #333' }}>
                              <td style={{ padding: '12px', color: getAreaColor(area), fontWeight: '600' }}>{area}</td>
                              <td style={{ textAlign: 'right', padding: '12px', color: '#e5e7eb' }}>{calculateHours(area, 'today')}h</td>
                              <td style={{ textAlign: 'right', padding: '12px', color: '#e5e7eb' }}>{calculateHours(area, 'week')}h</td>
                              <td style={{ textAlign: 'right', padding: '12px', color: '#e5e7eb' }}>{calculateHours(area, 'month')}h</td>
                              <td style={{ textAlign: 'right', padding: '12px', color: '#e5e7eb', fontWeight: 'bold' }}>{calculateHours(area, 'all')}h</td>
                            </tr>
                          ))}
                          <tr style={{ borderTop: '2px solid #444', fontWeight: 'bold' }}>
                            <td style={{ padding: '12px', color: '#fff' }}>Total</td>
                            <td style={{ textAlign: 'right', padding: '12px', color: '#fff' }}>{calculateHours('All', 'today')}h</td>
                            <td style={{ textAlign: 'right', padding: '12px', color: '#fff' }}>{calculateHours('All', 'week')}h</td>
                            <td style={{ textAlign: 'right', padding: '12px', color: '#fff' }}>{calculateHours('All', 'month')}h</td>
                            <td style={{ textAlign: 'right', padding: '12px', color: '#fbbf24', fontSize: '16px' }}>{calculateHours('All', 'all')}h</td>
                          </tr>
                        </>
                      )
                    })()}
                  </tbody>
                </table>
              </div>

            <div style={{ backgroundColor: '#2a2a2a', padding: '24px', borderRadius: '12px' }}>
              {/* Deep Work Session Log */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Deep Work Session Log</h3>
                <button
                  onClick={startAddingNewSession}
                  style={{
                  padding: '10px 20px',
                  backgroundColor: '#f97316',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px'
                }}>
                  Add Deep Work Session
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

                    // Calculate actual duration from start and end times
                    const actualDurationMinutes = endTime
                      ? Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60))
                      : sessionItem.duration_minutes || 0

                    return (
                      <div
                        key={idx}
                        onDoubleClick={() => startEditingSession(sessionItem)}
                        style={{
                          backgroundColor: getAreaColor(sessionItem.area as Area),
                          padding: '16px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ flex: '0 0 120px' }}>
                          <div style={{ fontSize: '13px', opacity: 0.9 }}>📅 {dateStr}</div>
                        </div>
                        <div style={{ flex: '0 0 150px' }}>
                          <div style={{ fontSize: '13px', opacity: 0.9 }}>🕐 {timeStr}</div>
                        </div>
                        <div style={{ flex: '0 0 80px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 'bold' }}>⏱️ {formatHoursMinutes(actualDurationMinutes)}</div>
                        </div>
                        <div style={{ flex: '0 0 140px' }}>
                          <span style={{
                            backgroundColor: getAreaColor(sessionItem.area as Area),
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'inline-block',
                            whiteSpace: 'nowrap'
                          }}>{sessionItem.area}</span>
                        </div>
                        <div style={{ flex: '0 0 140px' }}>
                          <span style={{
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'inline-block',
                            whiteSpace: 'nowrap'
                          }}>{sessionItem.task_type || 'N/A'}</span>
                        </div>
                        <div style={{ flex: '0 0 200px' }}>
                          <span style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#000', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '500' }}>
                            {sessionItem.task?.task_name || 'Unknown Task'}
                          </span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{
                            backgroundColor: sessionItem.effort_level ? getEffortLevelColor(sessionItem.effort_level) : 'rgba(0,0,0,0.2)',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {sessionItem.effort_level || 'N/A'}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', opacity: 0.7, fontStyle: 'italic' }}>{sessionItem.notes || 'No notes'}</div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </>
        )}
        </div>
          </>
        )}

        {/* Content Library Tab */}
        {activeMainTab === 'content' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <ContentLibrary />
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
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>
                {editingSessionId === 'new' ? 'Add New Deep Work Session' : 'Edit Deep Work Session'}
              </h3>
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
              {/* Task */}
              <div style={{ marginBottom: '20px', position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#fff', marginBottom: '8px', fontWeight: '500' }}>
                  Task
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={editTaskSearchTerm}
                    onChange={(e) => {
                      setEditTaskSearchTerm(e.target.value)
                      setShowEditTaskDropdown(true)
                      setEditFormData({ ...editFormData, task_name: e.target.value, task_id: null })
                    }}
                    onFocus={() => setShowEditTaskDropdown(true)}
                    onBlur={() => setTimeout(() => setShowEditTaskDropdown(false), 200)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      paddingLeft: editFormData.task_id ? '32px' : '12px',
                      backgroundColor: '#2a2a2a',
                      color: 'white',
                      border: '1px solid #444',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                  {editFormData.task_id && (
                    <div style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: (() => {
                        const task = tasks.find(t => t.id === editFormData.task_id)
                        return task ? getAreaColor(task.area) : '#6b7280'
                      })()
                    }} />
                  )}
                </div>

                {/* Task Dropdown */}
                {showEditTaskDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 100
                  }}>
                    {tasks
                      .filter(t =>
                        t.task_name.toLowerCase().includes(editTaskSearchTerm.toLowerCase()) &&
                        t.status !== 'completed'
                      )
                      .slice(0, 5)
                      .map(task => (
                        <div
                          key={task.id}
                          onClick={() => {
                            setEditFormData({
                              ...editFormData,
                              task_id: task.id,
                              task_name: task.task_name,
                              area: task.area,
                              task_type: task.task_type
                            })
                            setEditTaskSearchTerm(task.task_name)
                            setShowEditTaskDropdown(false)
                          }}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #333',
                            ':hover': {
                              backgroundColor: '#2a2a2a'
                            }
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: getAreaColor(task.area),
                              flexShrink: 0
                            }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '13px', color: '#fff' }}>{task.task_name}</div>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>{task.area}</div>
                            </div>
                          </div>
                        </div>
                      ))}

                    {editTaskSearchTerm && (
                      <div
                        onClick={() => {
                          setEditFormData({
                            ...editFormData,
                            task_id: null,
                            task_name: editTaskSearchTerm
                          })
                          setShowEditTaskDropdown(false)
                        }}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          color: '#60a5fa',
                          ':hover': {
                            backgroundColor: '#2a2a2a'
                          }
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        + Use "{editTaskSearchTerm}" as custom task
                      </div>
                    )}
                  </div>
                )}
              </div>

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
                  <option value="$$$ Printer $$$" style={{ color: '#22c55e' }}>$$$ Printer $$$</option>
                  <option value="$ Makes Money $" style={{ color: '#15803d' }}>$ Makes Money $</option>
                  <option value="-$ Save Dat $-" style={{ color: '#fb923c' }}>-$ Save Dat $-</option>
                  <option value=":( No Money ):" style={{ color: '#ef4444' }}>:( No Money ):</option>
                  <option value="8) Vibing (8" style={{ color: '#a855f7' }}>8) Vibing (8</option>
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
                  <div
                    onClick={() => {
                      const input = document.getElementById('start-date-input') as HTMLInputElement
                      if (input) input.showPicker()
                    }}
                    style={{
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      id="start-date-input"
                      type="date"
                      value={editFormData.start_time ? new Date(editFormData.start_time).toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        if (!e.target.value) return
                        const currentTime = editFormData.start_time ? new Date(editFormData.start_time) : new Date()
                        const [year, month, day] = e.target.value.split('-')
                        const newDate = new Date(currentTime)
                        newDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day))
                        const newStartTime = newDate.toISOString()

                        // Calculate new duration if end time exists
                        let newFormData = { ...editFormData, start_time: newStartTime }
                        if (editFormData.end_time) {
                          const endTime = new Date(editFormData.end_time)
                          const duration = Math.floor((endTime.getTime() - newDate.getTime()) / (1000 * 60))
                          newFormData.duration_minutes = Math.max(0, duration)
                        }
                        setEditFormData(newFormData)
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: '#2a2a2a',
                        color: 'white',
                        border: '1px solid #444',
                        borderRadius: '8px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        pointerEvents: 'none'
                      }}
                    />
                  </div>
                  <div
                    onClick={() => {
                      const input = document.getElementById('start-time-input') as HTMLInputElement
                      if (input) input.showPicker()
                    }}
                    style={{
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      id="start-time-input"
                      type="time"
                      step="900"
                      value={editFormData.start_time ? new Date(editFormData.start_time).toTimeString().slice(0, 5) : ''}
                      onChange={(e) => {
                        if (!e.target.value) return
                        const [hours, minutes] = e.target.value.split(':')
                        const date = editFormData.start_time ? new Date(editFormData.start_time) : new Date()
                        date.setHours(parseInt(hours), parseInt(minutes), 0, 0)
                        const newStartTime = date.toISOString()

                        // Calculate new duration if end time exists
                        let newFormData = { ...editFormData, start_time: newStartTime }
                        if (editFormData.end_time) {
                          const endTime = new Date(editFormData.end_time)
                          const duration = Math.floor((endTime.getTime() - date.getTime()) / (1000 * 60))
                          newFormData.duration_minutes = Math.max(0, duration)
                        }
                        setEditFormData(newFormData)
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: '#2a2a2a',
                        color: 'white',
                        border: '1px solid #444',
                        borderRadius: '8px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        pointerEvents: 'none'
                      }}
                    />
                  </div>
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
                  <div
                    onClick={() => {
                      const input = document.getElementById('end-date-input') as HTMLInputElement
                      if (input) input.showPicker()
                    }}
                    style={{
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      id="end-date-input"
                      type="date"
                      value={editFormData.end_time ? new Date(editFormData.end_time).toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        if (!e.target.value) return
                        const currentTime = editFormData.end_time ? new Date(editFormData.end_time) : new Date()
                        const [year, month, day] = e.target.value.split('-')
                        const newDate = new Date(currentTime)
                        newDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day))
                        const newEndTime = newDate.toISOString()

                        // Calculate new duration if start time exists
                        let newFormData = { ...editFormData, end_time: newEndTime }
                        if (editFormData.start_time) {
                          const startTime = new Date(editFormData.start_time)
                          const duration = Math.floor((newDate.getTime() - startTime.getTime()) / (1000 * 60))
                          newFormData.duration_minutes = Math.max(0, duration)
                        }
                        setEditFormData(newFormData)
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: '#2a2a2a',
                        color: 'white',
                        border: '1px solid #444',
                        borderRadius: '8px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        pointerEvents: 'none'
                      }}
                    />
                  </div>
                  <div
                    onClick={() => {
                      const input = document.getElementById('end-time-input') as HTMLInputElement
                      if (input) input.showPicker()
                    }}
                    style={{
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      id="end-time-input"
                      type="time"
                      step="900"
                      value={editFormData.end_time ? new Date(editFormData.end_time).toTimeString().slice(0, 5) : ''}
                      onChange={(e) => {
                        if (!e.target.value) return
                        const [hours, minutes] = e.target.value.split(':')
                        const date = editFormData.end_time ? new Date(editFormData.end_time) : new Date()
                        date.setHours(parseInt(hours), parseInt(minutes), 0, 0)
                        const newEndTime = date.toISOString()

                        // Calculate new duration if start time exists
                        let newFormData = { ...editFormData, end_time: newEndTime }
                        if (editFormData.start_time) {
                          const startTime = new Date(editFormData.start_time)
                          const duration = Math.floor((date.getTime() - startTime.getTime()) / (1000 * 60))
                          newFormData.duration_minutes = Math.max(0, duration)
                        }
                        setEditFormData(newFormData)
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: '#2a2a2a',
                        color: 'white',
                        border: '1px solid #444',
                        borderRadius: '8px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        pointerEvents: 'none'
                      }}
                    />
                  </div>
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
              {editingSessionId !== 'new' ? (
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
              ) : (
                <div></div>
              )}
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
                  {editingSessionId === 'new' ? 'Add Session' : 'Save Changes'}
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
                        onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value as Priority })}
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
                  onChange={(e) => setTaskFormData({ ...taskFormData, effort_level: e.target.value as EffortLevel })}
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
                  <option value="$$$ Printer $$$" style={{ color: '#22c55e' }}>$$$ Printer $$$</option>
                  <option value="$ Makes Money $" style={{ color: '#15803d' }}>$ Makes Money $</option>
                  <option value="-$ Save Dat $-" style={{ color: '#fb923c' }}>-$ Save Dat $-</option>
                  <option value=":( No Money ):" style={{ color: '#ef4444' }}>:( No Money ):</option>
                  <option value="8) Vibing (8" style={{ color: '#a855f7' }}>8) Vibing (8</option>
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
                        effort_level: taskFormData.effort_level || '$ Makes Money $',
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

