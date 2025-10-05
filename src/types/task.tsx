export type Area = 'Full Stack' | 'S4' | '808' | 'Personal' | 'Huge Capital' | 'Golf' | 'Health'

export const DEFAULT_TASK_TYPES: Record<Area, string[]> = {
  'Personal': ['Friends', 'House', 'Finances', 'Life', 'Car', 'Arya', 'Cheypow'],
  'Full Stack': ['Team', 'New Build', 'New Product Demo', 'Update Build', 'Admin'],
  'Huge Capital': ['Marketing', 'Admin', 'New Build', 'Planning'],
  '808': ['Cost Savings', 'Fulfillment', 'Data', 'Customer Service', '808 Online', 'Artists'],
  'S4': ['Sales', 'Marketing', 'New Automation', 'Update Automation', 'Data'],
  'Golf': ['Golfing', 'Equipment', 'Content', 'Automation'],
  'Health': ['Strength', 'Yoga', 'Meditation', 'Read', 'Walk']
}

export type TaskType = string

export type TaskStatus = 'Not started' | 'In progress' | 'Done'

export type Priority = 'Low' | 'Medium' | 'High'

export type EffortLevel = '$$$ MoneyMaker' | '$ Lil Money' | '$$ Some Money' | '$$$ Big Money' | '$$$$ Huge Money' | '-$ Save Dat Money' | ':( Pointless' | '8) JusVibin'

export type Automation = 'Automate' | 'Manual' | 'Delegate'

export type RecurringType = 'none' | 'daily' | 'daily_weekdays' | 'weekly' | 'monthly' | 'custom'

export interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}

export interface Task {
  id: string
  task_name: string
  description: string
  area: Area
  task_type: TaskType
  status: TaskStatus
  automation: Automation
  priority: Priority
  effort_level: EffortLevel
  due_date: Date | null
  completed_at: Date | null
  past_due: boolean
  created_at: Date
  updated_at: Date
  checklist: ChecklistItem[]
  recurring_type: RecurringType
  recurring_interval: number
  recurring_days: number[] | null
  last_recurring_date: Date | null
  is_recurring_template: boolean
  original_recurring_task_id: string | null
  hours_projected: number | null
  hours_worked: number | null
  scheduled_start: Date | null
  scheduled_end: Date | null
}
