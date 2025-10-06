import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type {
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
} from 'lucide-react'

const ContentLibrary = () => {
  const [contents, setContents] = useState<ContentItem[]>([])
  const [filteredContents, setFilteredContents] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [sortBy, setSortBy] = useState<'saved_at' | 'priority' | 'title' | 'status'>('saved_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

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
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('')

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

  const handleSaveEdit = async () => {
    if (!formData.id) return

    try {
      const updates = {
        ...formData,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('content_library')
        .update(updates)
        .eq('id', formData.id)

      if (error) throw error

      setContents(contents.map((c) => (c.id === formData.id ? { ...c, ...updates } : c)))
      setShowEditModal(false)
      resetForm()
    } catch (error) {
      console.error('Error updating content:', error)
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

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    setThumbnailFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setThumbnailPreview(base64String)
      setFormData({ ...formData, thumbnail_url: base64String })
    }
    reader.readAsDataURL(file)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          handleImageUpload(file)
        }
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer?.files
    if (files && files[0]) {
      handleImageUpload(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
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
    setThumbnailFile(null)
    setThumbnailPreview('')
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
      case 'Vault':
        return <FolderOpen className="w-4 h-4" />
    }
  }

  const getPriorityColor = (priority: ContentPriority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-900 text-red-300 border-red-700'
      case 'Medium':
        return 'bg-yellow-900 text-yellow-300 border-yellow-700'
      case 'Low':
        return 'bg-green-900 text-green-300 border-green-700'
    }
  }

  const getStatusColor = (status: ContentStatus) => {
    switch (status) {
      case 'To Watch':
        return 'bg-blue-900 text-blue-300'
      case 'In Progress':
        return 'bg-purple-900 text-purple-300'
      case 'Completed':
        return 'bg-green-900 text-green-300'
      case 'Implementing':
        return 'bg-orange-900 text-orange-300'
      case 'Archived':
        return 'bg-gray-700 text-gray-300'
      case 'Vault':
        return 'bg-indigo-900 text-indigo-300'
    }
  }


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
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Content Library</h1>
          <p className="text-gray-400 mt-1">
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
        <div className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-gray-400">Total Items</div>
        </div>
        <div className="bg-gray-800 rounded-lg shadow-lg p-4 border border-blue-600">
          <div className="text-2xl font-bold text-blue-400">{stats.toWatch}</div>
          <div className="text-sm text-blue-300">To Watch</div>
        </div>
        <div className="bg-gray-800 rounded-lg shadow-lg p-4 border border-purple-600">
          <div className="text-2xl font-bold text-purple-400">{stats.inProgress}</div>
          <div className="text-sm text-purple-300">In Progress</div>
        </div>
        <div className="bg-gray-800 rounded-lg shadow-lg p-4 border border-green-600">
          <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
          <div className="text-sm text-green-300">Completed</div>
        </div>
        <div className="bg-gray-800 rounded-lg shadow-lg p-4 border border-yellow-600">
          <div className="text-2xl font-bold text-yellow-400">{stats.favorites}</div>
          <div className="text-sm text-yellow-300">Favorites</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by title, notes, creator, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="saved_at">Sort by Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="title">Sort by Title</option>
            <option value="status">Sort by Status</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white hover:bg-gray-700"
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
                  'AI Build',
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
                  {(['To Watch', 'In Progress', 'Completed', 'Implementing', 'Archived', 'Vault'] as ContentStatus[]).map(
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

      {/* Content Grid - Pinterest Style */}
      {filteredContents.length === 0 ? (
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-12 text-center">
          <BookmarkPlus className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No content found</h3>
          <p className="text-gray-400 mb-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredContents.map((content) => (
            <div
              key={content.id}
              className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden hover:shadow-xl hover:border-gray-600 transition-all cursor-pointer group"
              onClick={() => {
                setSelectedContent(content)
                setShowDetailsModal(true)
              }}
            >
              {/* Thumbnail */}
              {content.thumbnail_url ? (
                <div className="relative aspect-video w-full bg-gray-900">
                  <img
                    src={content.thumbnail_url}
                    alt={content.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleFavorite(content.id, content.is_favorite)
                      }}
                      className="p-1.5 bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 transition-all"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          content.is_favorite
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-white'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-video w-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <span className="text-6xl opacity-20">{getSourceIcon(content.source)}</span>
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleFavorite(content.id, content.is_favorite)
                      }}
                      className="p-1.5 bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 transition-all"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          content.is_favorite
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-white'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Card Content */}
              <div className="p-4">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xl mt-0.5">{getSourceIcon(content.source)}</span>
                  <h3 className="text-base font-semibold text-white line-clamp-2 flex-1">
                    {content.title}
                  </h3>
                </div>

                {content.creator && (
                  <p className="text-sm text-gray-400 mb-2">by {content.creator}</p>
                )}

                {content.notes && (
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">{content.notes}</p>
                )}

                <div className="flex items-center gap-2 flex-wrap mb-3">
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
                  {content.time_to_consume && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-gray-700 text-gray-300">
                      <Clock className="w-3 h-3" />
                      {content.time_to_consume}m
                    </span>
                  )}
                </div>

                <div className="text-xs text-gray-500 mb-2">{content.category}</div>

                {content.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {content.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-blue-900 text-blue-300"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                    {content.tags.length > 3 && (
                      <span className="text-xs text-gray-500">+{content.tags.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-700">
                  <a
                    href={content.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm text-gray-300"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open
                  </a>
                  {content.status !== 'Completed' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCompleteContent(content.id)
                      }}
                      className="px-3 py-2 bg-green-900 hover:bg-green-800 rounded-lg transition-colors text-sm text-green-300"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Content Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Add New Content</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter content title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">URL *</label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Thumbnail Image</label>
                  <div
                    onPaste={handlePaste}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="w-full px-3 py-4 bg-gray-900 border-2 border-dashed border-gray-700 rounded-lg text-gray-400 hover:border-gray-600 transition-colors cursor-pointer"
                  >
                    {thumbnailPreview ? (
                      <div className="relative">
                        <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-40 object-cover rounded" />
                        <button
                          onClick={() => {
                            setThumbnailFile(null)
                            setThumbnailPreview('')
                            setFormData({ ...formData, thumbnail_url: undefined })
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="mb-2">Drag & drop image, paste, or click to upload</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageUpload(file)
                          }}
                          className="hidden"
                          id="thumbnail-upload-add"
                        />
                        <label
                          htmlFor="thumbnail-upload-add"
                          className="inline-block px-4 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 cursor-pointer"
                        >
                          Choose File
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Source
                    </label>
                    <select
                      value={formData.source}
                      onChange={(e) =>
                        setFormData({ ...formData, source: e.target.value as ContentSource })
                      }
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value as ContentCategory })
                      }
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Full Stack Development">Full Stack Development</option>
                      <option value="AI Build">AI Build</option>
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
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as ContentStatus })
                      }
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="To Watch">To Watch</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Implementing">Implementing</option>
                      <option value="Archived">Archived</option>
                      <option value="Vault">Vault</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value as ContentPriority })
                      }
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
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
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Creator</label>
                  <input
                    type="text"
                    value={formData.creator || ''}
                    onChange={(e) => setFormData({ ...formData, creator: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Author, YouTuber, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
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
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="react, typescript, tutorial"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Folder</label>
                  <input
                    type="text"
                    value={formData.folder || ''}
                    onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional folder name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="rounded border-gray-600"
                    />
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-300">Mark as favorite</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-700">
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
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

      {/* Edit Content Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Edit Content</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter content title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">URL *</label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Thumbnail Image</label>
                  <div
                    onPaste={handlePaste}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="w-full px-3 py-4 bg-gray-900 border-2 border-dashed border-gray-700 rounded-lg text-gray-400 hover:border-gray-600 transition-colors cursor-pointer"
                  >
                    {thumbnailPreview ? (
                      <div className="relative">
                        <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-40 object-cover rounded" />
                        <button
                          onClick={() => {
                            setThumbnailFile(null)
                            setThumbnailPreview('')
                            setFormData({ ...formData, thumbnail_url: undefined })
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="mb-2">Drag & drop image, paste, or click to upload</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageUpload(file)
                          }}
                          className="hidden"
                          id="thumbnail-upload-edit"
                        />
                        <label
                          htmlFor="thumbnail-upload-edit"
                          className="inline-block px-4 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 cursor-pointer"
                        >
                          Choose File
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Source</label>
                    <select
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value as ContentSource })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as ContentCategory })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Full Stack Development">Full Stack Development</option>
                      <option value="AI Build">AI Build</option>
                      <option value="Business & Entrepreneurship">Business & Entrepreneurship</option>
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
                    <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as ContentStatus })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="To Watch">To Watch</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Implementing">Implementing</option>
                      <option value="Archived">Archived</option>
                      <option value="Vault">Vault</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as ContentPriority })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Time (minutes)</label>
                    <input
                      type="number"
                      value={formData.time_to_consume || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          time_to_consume: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Creator</label>
                  <input
                    type="text"
                    value={formData.creator || ''}
                    onChange={(e) => setFormData({ ...formData, creator: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Author, YouTuber, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={formData.tags?.join(', ') || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="react, typescript, tutorial"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Folder</label>
                  <input
                    type="text"
                    value={formData.folder || ''}
                    onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional folder name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add notes about this content..."
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_favorite}
                      onChange={(e) => setFormData({ ...formData, is_favorite: e.target.checked })}
                      className="rounded border-gray-600"
                    />
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-300">Mark as favorite</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-700">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    resetForm()
                  }}
                  className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!formData.title || !formData.url}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
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

                <div className="flex items-center gap-3 pt-6 border-t border-gray-700">
                  <button
                    onClick={() => {
                      setFormData(selectedContent)
                      setShowDetailsModal(false)
                      setShowEditModal(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-blue-300 rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleFavorite(selectedContent.id, selectedContent.is_favorite)}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-900 text-yellow-300 rounded-lg hover:bg-yellow-800 transition-colors"
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
                      className="flex items-center gap-2 px-4 py-2 bg-green-900 text-green-300 rounded-lg hover:bg-green-800 transition-colors"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Mark as Completed
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleDeleteContent(selectedContent.id)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-900 text-red-300 rounded-lg hover:bg-red-800 transition-colors ml-auto"
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
