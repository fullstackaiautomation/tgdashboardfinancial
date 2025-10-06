export type ContentSource = 'Twitter' | 'YouTube' | 'Instagram' | 'Article' | 'Podcast' | 'Video' | 'Book' | 'Course' | 'Other'

export type ContentCategory =
  | 'Full Stack Development'
  | 'AI Build'
  | 'Business & Entrepreneurship'
  | 'Finance & Investing'
  | 'Marketing & Sales'
  | 'Personal Development'
  | 'Health & Fitness'
  | 'Golf'
  | 'Productivity'
  | 'Design'
  | 'Leadership'
  | 'Other'

export type ContentStatus = 'To Watch' | 'In Progress' | 'Completed' | 'Implementing' | 'Archived' | 'Vault'

export type ContentPriority = 'High' | 'Medium' | 'Low'

export interface ContentItem {
  id: string
  user_id: string
  title: string
  url: string
  thumbnail_url?: string
  source: ContentSource
  category: ContentCategory
  subcategories?: string[]
  status: ContentStatus
  priority: ContentPriority
  notes: string
  key_takeaways?: string[]
  action_items?: string[]
  tags: string[]
  saved_at: string
  completed_at?: string | null
  time_to_consume?: number | null // in minutes
  creator?: string
  rating?: number | null // 1-5 stars
  is_favorite: boolean
  folder?: string
  created_at: string
  updated_at: string
}

export interface ContentFilter {
  source?: ContentSource[]
  category?: ContentCategory[]
  status?: ContentStatus[]
  priority?: ContentPriority[]
  tags?: string[]
  folder?: string
  searchTerm?: string
  isFavorite?: boolean
  dateRange?: {
    start: string
    end: string
  }
}
