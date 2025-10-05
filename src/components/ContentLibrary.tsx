import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  ContentItem,
  ContentSource,
  ContentCategory,
  ContentStatus,
  ContentPriority,
  ContentFilter,
} from '../types/content'
import {
  Search,
  Plus,
  Filter,
  Star,
  Trash2,
  Edit2,
  ExternalLink,
  BookmarkPlus,
  FolderOpen,
  Tag,
  Calendar,
  Clock,
  CheckCircle2,
  PlayCircle,
  Archive,
  TrendingUp,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

const ContentLibrary = () => {
  const [contents, setContents] = useState<ContentItem[]>([])
  const [filteredContents, setFilteredContents] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [sortBy, setSortBy] = useState<'saved_at' | 'priority' | 'title' | 'status'>('saved_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [expandedFolders, setExpandedFolders] = useState<string[]>([])

  const [filters, setFilters] = useState<ContentFilter>({
    source: [],
    category: [],
    status: [],
    priority: [],
    tags: [],
    folder: undefined,
    searchTerm: '',
    isFavorite: undefined,
  })

  const [formData, setFormData] = useState<Partial<ContentItem>>({
    title: '',
    url: '',
    source: 'YouTube',
    category: 'Full Stack Development',
    status: 'To Watch',
    priority: 'Medium',
    notes: '',
    tags: [],
    is_favorite: false,
  })

  useEffect(() => {
    fetchContents()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [contents, searchTerm, filters, sortBy, sortOrder])

  const fetchContents = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('content_library')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setContents(data || [])
    } catch (error) {
      console.error('Error fetching contents:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...contents]

    // Search term
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.creator?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Source filter
    if (filters.source && filters.source.length > 0) {
      filtered = filtered.filter((item) => filters.source!.includes(item.source))
    }

    // Category filter
    if (filters.category && filters.category.length > 0) {
      filtered = filtered.filter((item) => filters.category!.includes(item.category))
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter((item) => filters.status!.includes(item.status))
    }

    // Priority filter
    if (filters.priority && filters.priority.length > 0) {
      filtered = filtered.filter((item) => filters.priority!.includes(item.priority))
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter((item) =>
        filters.tags!.some((tag) => item.tags.includes(tag))
      )
    }

    // Favorite filter
    if (filters.isFavorite !== undefined) {
      filtered = filtered.filter((item) => item.is_favorite === filters.isFavorite)
    }

    // Folder filter
    if (filters.folder) {
      filtered = filtered.filter((item) => item.folder === filters.folder)
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'saved_at':
          comparison = new Date(a.saved_at).getTime() - new Date(b.saved_at).getTime()
          break
        case 'priority':
          const priorityOrder = { High: 3, Medium: 2, Low: 1 }
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority]
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    setFilteredContents(filtered)
  }

  const handleAddContent = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      const newContent = {
        ...formData,
        user_id: session.user.id,
        saved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('content_library')
        .insert([newContent])
        .select()

      if (error) throw error
      setContents([...contents, data[0]])
      setShowAddModal(false)
      resetForm()
    } catch (error) {
      console.error('Error adding content:', error)
    }
  }

  const handleUpdateContent = async (id: string, updates: Partial<ContentItem>) => {
    try {
      const { error } = await supabase
        .from('content_library')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      setContents(contents.map((c) => (c.id === id ? { ...c, ...updates } : c)))
    } catch (error) {
      console.error('Error updating content:', error)
    }
  }

  const handleDeleteContent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return

    try {
      const { error } = await supabase.from('content_library').delete().eq('id', id)

      if (error) throw error
      setContents(contents.filter((c) => c.id !== id))
      setShowDetailsModal(false)
    } catch (error) {
      console.error('Error deleting content:', error)
    }
  }

  const handleToggleFavorite = async (id: string, currentValue: boolean) => {
    await handleUpdateContent(id, { is_favorite: !currentValue })
  }

  const handleCompleteContent = async (id: string) => {
    await handleUpdateContent(id, {
      status: 'Completed',
      completed_at: new Date().toISOString(),
    })
  }

  const resetForm = () => {
    setFormData({
      title: '',
      url: '',
      source: 'YouTube',
      category: 'Full Stack Development',
      status: 'To Watch',
      priority: 'Medium',
      notes: '',
      tags: [],
      is_favorite: false,
    })
  }

  const getSourceIcon = (source: ContentSource) => {
    const icons: Record<ContentSource, string> = {
      Twitter: '𝕏',
      YouTube: '▶',
      Instagram: '📷',
      Article: '📄',
      Podcast: '🎙',
      Video: '🎬',
      Book: '📚',
      Course: '🎓',
      Other: '🔗',
    }
    return icons[source]
  }

  const getStatusIcon = (status: ContentStatus) => {
    switch (status) {
      case 'To Watch':
        return <BookmarkPlus className="w-4 h-4" />
      case 'In Progress':
        return <PlayCircle className="w-4 h-4" />
      case 'Completed':
        return <CheckCircle2 className="w-4 h-4" />
      case 'Implementing':
        return <TrendingUp className="w-4 h-4" />
      case 'Archived':
        return <Archive className="w-4 h-4" />
    }
  }

  const getPriorityColor = (priority: ContentPriority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-200'
    }
  }

  const getStatusColor = (status: ContentStatus) => {
    switch (status) {
      case 'To Watch':
        return 'bg-blue-100 text-blue-800'
      case 'In Progress':
        return 'bg-purple-100 text-purple-800'
      case 'Completed':
        return 'bg-green-100 text-green-800'
      case 'Implementing':
        return 'bg-orange-100 text-orange-800'
      case 'Archived':
        return 'bg-gray-100 text-gray-800'
    }
  }

  const allTags = Array.from(new Set(contents.flatMap((c) => c.tags)))
  const allFolders = Array.from(new Set(contents.filter((c) => c.folder).map((c) => c.folder!)))

  // Stats
  const stats = {
    total: contents.length,
    toWatch: contents.filter((c) => c.status === 'To Watch').length,
    inProgress: contents.filter((c) => c.status === 'In Progress').length,
    completed: contents.filter((c) => c.status === 'Completed').length,
    favorites: contents.filter((c) => c.is_favorite).length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading your content library...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Content Library</h1>
          <p className="text-gray-600 mt-1">
            Your personal knowledge base of learning resources
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Content
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Items</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow-sm p-4 border border-blue-200">
          <div className="text-2xl font-bold text-blue-900">{stats.toWatch}</div>
          <div className="text-sm text-blue-700">To Watch</div>
        </div>
        <div className="bg-purple-50 rounded-lg shadow-sm p-4 border border-purple-200">
          <div className="text-2xl font-bold text-purple-900">{stats.inProgress}</div>
          <div className="text-sm text-purple-700">In Progress</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow-sm p-4 border border-green-200">
          <div className="text-2xl font-bold text-green-900">{stats.completed}</div>
          <div className="text-sm text-green-700">Completed</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow-sm p-4 border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-900">{stats.favorites}</div>
          <div className="text-sm text-yellow-700">Favorites</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by title, notes, creator, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="saved_at">Sort by Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="title">Sort by Title</option>
            <option value="status">Sort by Status</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4">
            {/* Source Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
              <div className="space-y-2">
                {(['Twitter', 'YouTube', 'Instagram', 'Article', 'Podcast', 'Video', 'Book', 'Course', 'Other'] as ContentSource[]).map(
                  (source) => (
                    <label key={source} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.source?.includes(source)}
                        onChange={(e) => {
                          const newSources = e.target.checked
                            ? [...(filters.source || []), source]
                            : filters.source?.filter((s) => s !== source) || []
                          setFilters({ ...filters, source: newSources })
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">
                        {getSourceIcon(source)} {source}
                      </span>
                    </label>
                  )
                )}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {([
                  'Full Stack Development',
                  'Business & Entrepreneurship',
                  'Finance & Investing',
                  'Marketing & Sales',
                  'Personal Development',
                  'Health & Fitness',
                  'Golf',
                  'Productivity',
                  'Design',
                  'Leadership',
                  'Other',
                ] as ContentCategory[]).map((category) => (
                  <label key={category} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.category?.includes(category)}
                      onChange={(e) => {
                        const newCategories = e.target.checked
                          ? [...(filters.category || []), category]
                          : filters.category?.filter((c) => c !== category) || []
                        setFilters({ ...filters, category: newCategories })
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Status & Priority Filter */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="space-y-2">
                  {(['To Watch', 'In Progress', 'Completed', 'Implementing', 'Archived'] as ContentStatus[]).map(
                    (status) => (
                      <label key={status} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filters.status?.includes(status)}
                          onChange={(e) => {
                            const newStatuses = e.target.checked
                              ? [...(filters.status || []), status]
                              : filters.status?.filter((s) => s !== status) || []
                            setFilters({ ...filters, status: newStatuses })
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{status}</span>
                      </label>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <div className="space-y-2">
                  {(['High', 'Medium', 'Low'] as ContentPriority[]).map((priority) => (
                    <label key={priority} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.priority?.includes(priority)}
                        onChange={(e) => {
                          const newPriorities = e.target.checked
                            ? [...(filters.priority || []), priority]
                            : filters.priority?.filter((p) => p !== priority) || []
                          setFilters({ ...filters, priority: newPriorities })
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{priority}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.isFavorite === true}
                    onChange={(e) => {
                      setFilters({ ...filters, isFavorite: e.target.checked ? true : undefined })
                    }}
                    className="rounded border-gray-300"
                  />
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-gray-700">Favorites Only</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredContents.length === 0 ? (
          <div className="p-12 text-center">
            <BookmarkPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No content found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || Object.values(filters).some((f) => f && (Array.isArray(f) ? f.length > 0 : true))
                ? 'Try adjusting your filters or search term'
                : 'Start building your knowledge base by adding your first piece of content'}
            </p>
            {!searchTerm && !Object.values(filters).some((f) => f && (Array.isArray(f) ? f.length > 0 : true)) && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-5 h-5" />
                Add Your First Content
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredContents.map((content) => (
              <div
                key={content.id}
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedContent(content)
                  setShowDetailsModal(true)
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getSourceIcon(content.source)}</span>
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {content.title}
                      </h3>
                      {content.is_favorite && (
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      {content.creator && (
                        <span className="flex items-center gap-1">
                          <span className="font-medium">by</span> {content.creator}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(content.saved_at).toLocaleDateString()}
                      </span>
                      {content.time_to_consume && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {content.time_to_consume} min
                        </span>
                      )}
                    </div>

                    {content.notes && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{content.notes}</p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(
                          content.status
                        )}`}
                      >
                        {getStatusIcon(content.status)}
                        {content.status}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-medium border ${getPriorityColor(
                          content.priority
                        )}`}
                      >
                        {content.priority}
                      </span>
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                        {content.category}
                      </span>
                      {content.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-blue-50 text-blue-700"
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleFavorite(content.id, content.is_favorite)
                      }}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          content.is_favorite
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-400'
                        }`}
                      />
                    </button>
                    <a
                      href={content.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-5 h-5 text-gray-600" />
                    </a>
                    {content.status !== 'Completed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCompleteContent(content.id)
                        }}
                        className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                      >
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Content Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add New Content</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter content title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Source
                    </label>
                    <select
                      value={formData.source}
                      onChange={(e) =>
                        setFormData({ ...formData, source: e.target.value as ContentSource })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="YouTube">YouTube</option>
                      <option value="Twitter">Twitter</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Article">Article</option>
                      <option value="Podcast">Podcast</option>
                      <option value="Video">Video</option>
                      <option value="Book">Book</option>
                      <option value="Course">Course</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value as ContentCategory })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Full Stack Development">Full Stack Development</option>
                      <option value="Business & Entrepreneurship">
                        Business & Entrepreneurship
                      </option>
                      <option value="Finance & Investing">Finance & Investing</option>
                      <option value="Marketing & Sales">Marketing & Sales</option>
                      <option value="Personal Development">Personal Development</option>
                      <option value="Health & Fitness">Health & Fitness</option>
                      <option value="Golf">Golf</option>
                      <option value="Productivity">Productivity</option>
                      <option value="Design">Design</option>
                      <option value="Leadership">Leadership</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as ContentStatus })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="To Watch">To Watch</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Implementing">Implementing</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value as ContentPriority })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time (minutes)
                    </label>
                    <input
                      type="number"
                      value={formData.time_to_consume || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          time_to_consume: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Creator</label>
                  <input
                    type="text"
                    value={formData.creator || ''}
                    onChange={(e) => setFormData({ ...formData, creator: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Author, YouTuber, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags?.join(', ') || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="react, typescript, tutorial"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Folder</label>
                  <input
                    type="text"
                    value={formData.folder || ''}
                    onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional folder name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add notes about this content..."
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_favorite}
                      onChange={(e) =>
                        setFormData({ ...formData, is_favorite: e.target.checked })
                      }
                      className="rounded border-gray-300"
                    />
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-700">Mark as favorite</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddContent}
                  disabled={!formData.title || !formData.url}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Content
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{getSourceIcon(selectedContent.source)}</span>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedContent.title}
                    </h2>
                    {selectedContent.is_favorite && (
                      <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  {selectedContent.creator && (
                    <p className="text-gray-600">by {selectedContent.creator}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium ${getStatusColor(
                      selectedContent.status
                    )}`}
                  >
                    {getStatusIcon(selectedContent.status)}
                    {selectedContent.status}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-md text-sm font-medium border ${getPriorityColor(
                      selectedContent.priority
                    )}`}
                  >
                    {selectedContent.priority} Priority
                  </span>
                  <span className="px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-700">
                    {selectedContent.category}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Saved: {new Date(selectedContent.saved_at).toLocaleDateString()}
                    </span>
                  </div>
                  {selectedContent.time_to_consume && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{selectedContent.time_to_consume} minutes</span>
                    </div>
                  )}
                  {selectedContent.completed_at && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Completed: {new Date(selectedContent.completed_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {selectedContent.folder && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <FolderOpen className="w-4 h-4" />
                      <span>{selectedContent.folder}</span>
                    </div>
                  )}
                </div>

                <div>
                  <a
                    href={selectedContent.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Link
                  </a>
                </div>

                {selectedContent.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedContent.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm bg-blue-50 text-blue-700"
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedContent.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedContent.notes}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => handleToggleFavorite(selectedContent.id, selectedContent.is_favorite)}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        selectedContent.is_favorite ? 'fill-yellow-500' : ''
                      }`}
                    />
                    {selectedContent.is_favorite ? 'Unfavorite' : 'Favorite'}
                  </button>
                  {selectedContent.status !== 'Completed' && (
                    <button
                      onClick={() => {
                        handleCompleteContent(selectedContent.id)
                        setShowDetailsModal(false)
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Mark as Completed
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleDeleteContent(selectedContent.id)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors ml-auto"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ContentLibrary
