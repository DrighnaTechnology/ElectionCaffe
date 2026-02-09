import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { newsAPI } from '../services/api';
import { formatDateTime } from '../lib/utils';
import { toast } from 'sonner';
import {
  NewspaperIcon,
  PlusIcon,
  XIcon,
  SearchIcon,
  FilterIcon,
  EditIcon,
  TrashIcon,
  SendIcon,
  ArchiveIcon,
  FlagIcon,
  SparklesIcon,
  MapPinIcon,
  TrendingUpIcon,
} from 'lucide-react';

type NewsStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'FLAGGED';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const statusConfig: Record<NewsStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  PUBLISHED: { label: 'Published', color: 'bg-green-100 text-green-800' },
  ARCHIVED: { label: 'Archived', color: 'bg-blue-100 text-blue-800' },
  FLAGGED: { label: 'Flagged', color: 'bg-red-100 text-red-800' },
};

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
  MEDIUM: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  HIGH: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  CRITICAL: { label: 'Critical', color: 'bg-red-100 text-red-700' },
};

const categoryOptions = [
  'POLITICAL', 'ELECTION', 'DEVELOPMENT', 'SOCIAL', 'ECONOMIC',
  'INFRASTRUCTURE', 'HEALTH', 'EDUCATION', 'ENVIRONMENT', 'OTHER',
];

const geographicLevelOptions = [
  'NATIONAL', 'STATE', 'REGION', 'DISTRICT', 'CONSTITUENCY', 'SECTION', 'BOOTH',
];

export function NewsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    geographicLevel: '',
    tenantId: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedNews, setSelectedNews] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch news
  const { data: newsData, isLoading } = useQuery({
    queryKey: ['news', page, search, filters],
    queryFn: () => newsAPI.getAll({
      page,
      limit: 20,
      search: search || undefined,
      status: filters.status || undefined,
      priority: filters.priority || undefined,
      category: filters.category || undefined,
      geographicLevel: filters.geographicLevel || undefined,
      tenantId: filters.tenantId || undefined,
    }),
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['news-stats'],
    queryFn: () => newsAPI.getStats(),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => newsAPI.delete(id),
    onSuccess: () => {
      toast.success('News deleted');
      queryClient.invalidateQueries({ queryKey: ['news'] });
      queryClient.invalidateQueries({ queryKey: ['news-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete');
    },
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: (id: string) => newsAPI.publish(id),
    onSuccess: () => {
      toast.success('News published');
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to publish');
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: (id: string) => newsAPI.archive(id),
    onSuccess: () => {
      toast.success('News archived');
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to archive');
    },
  });

  // Flag mutation
  const flagMutation = useMutation({
    mutationFn: (id: string) => newsAPI.flag(id),
    onSuccess: () => {
      toast.success('News flagged for review');
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to flag');
    },
  });

  // AI Analysis mutation
  const analyzeMutation = useMutation({
    mutationFn: (id: string) => newsAPI.analyze(id),
    onSuccess: () => {
      toast.success('AI analysis completed');
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to analyze');
    },
  });

  const news = newsData?.data?.data || [];
  const pagination = newsData?.data?.pagination;
  const stats = statsData?.data?.data || {};

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this news?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">News & Information</h1>
          <p className="text-gray-500">Manage news, events, and information with geographic hierarchy</p>
        </div>
        <button
          onClick={() => {
            setSelectedNews(null);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          <PlusIcon className="h-5 w-5" />
          Add News
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <NewspaperIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalNews || 0}</p>
              <p className="text-xs text-gray-500">Total News</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <SendIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.byStatus?.PUBLISHED || 0}</p>
              <p className="text-xs text-gray-500">Published</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-50 text-gray-600">
              <EditIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.byStatus?.DRAFT || 0}</p>
              <p className="text-xs text-gray-500">Drafts</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <FlagIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.byStatus?.FLAGGED || 0}</p>
              <p className="text-xs text-gray-500">Flagged</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <TrendingUpIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.byPriority?.CRITICAL || 0}</p>
              <p className="text-xs text-gray-500">Critical</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search news..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${showFilters ? 'bg-orange-50 border-orange-300' : ''}`}
        >
          <FilterIcon className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-5 gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border rounded-lg bg-white"
          >
            <option value="">All Statuses</option>
            {Object.entries(statusConfig).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="px-3 py-2 border rounded-lg bg-white"
          >
            <option value="">All Priorities</option>
            {Object.entries(priorityConfig).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="px-3 py-2 border rounded-lg bg-white"
          >
            <option value="">All Categories</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={filters.geographicLevel}
            onChange={(e) => setFilters({ ...filters, geographicLevel: e.target.value })}
            className="px-3 py-2 border rounded-lg bg-white"
          >
            <option value="">All Levels</option>
            {geographicLevelOptions.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
          <button
            onClick={() => setFilters({ status: '', priority: '', category: '', geographicLevel: '', tenantId: '' })}
            className="px-4 py-2 text-orange-500 hover:bg-orange-50 rounded-lg"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* News Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-12">
            <NewspaperIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No news found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {news.map((item: any) => {
                const status = statusConfig[item.status as NewsStatus] || statusConfig.DRAFT;
                const priority = priorityConfig[item.priority as Priority] || priorityConfig.MEDIUM;

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <div className="font-medium text-gray-900 truncate">{item.title}</div>
                        {item.summary && (
                          <div className="text-sm text-gray-500 truncate">{item.summary}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${priority.color}`}>
                        {priority.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <MapPinIcon className="h-3 w-3" />
                        <span>{item.geographicLevel}</span>
                        {item.state && <span>- {item.state}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedNews(item);
                            setShowCreateModal(true);
                          }}
                          className="p-1 text-blue-500 hover:text-blue-700"
                          title="Edit"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        {item.status === 'DRAFT' && (
                          <button
                            onClick={() => publishMutation.mutate(item.id)}
                            disabled={publishMutation.isPending}
                            className="p-1 text-green-500 hover:text-green-700"
                            title="Publish"
                          >
                            <SendIcon className="h-4 w-4" />
                          </button>
                        )}
                        {item.status === 'PUBLISHED' && (
                          <>
                            <button
                              onClick={() => archiveMutation.mutate(item.id)}
                              disabled={archiveMutation.isPending}
                              className="p-1 text-blue-500 hover:text-blue-700"
                              title="Archive"
                            >
                              <ArchiveIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => flagMutation.mutate(item.id)}
                              disabled={flagMutation.isPending}
                              className="p-1 text-orange-500 hover:text-orange-700"
                              title="Flag for Review"
                            >
                              <FlagIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => analyzeMutation.mutate(item.id)}
                          disabled={analyzeMutation.isPending}
                          className="p-1 text-purple-500 hover:text-purple-700"
                          title="AI Analysis"
                        >
                          <SparklesIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deleteMutation.isPending}
                          className="p-1 text-red-500 hover:text-red-700"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * pagination.limit + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <NewsModal
          news={selectedNews}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedNews(null);
          }}
        />
      )}
    </div>
  );
}

function NewsModal({
  news,
  onClose,
}: {
  news: any | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: news?.title || '',
    titleLocal: news?.titleLocal || '',
    summary: news?.summary || '',
    content: news?.content || '',
    category: news?.category || 'OTHER',
    subCategory: news?.subCategory || '',
    tags: news?.tags?.join(', ') || '',
    source: news?.source || 'MANUAL_ENTRY',
    sourceUrl: news?.sourceUrl || '',
    sourceName: news?.sourceName || '',
    geographicLevel: news?.geographicLevel || 'NATIONAL',
    state: news?.state || '',
    district: news?.district || '',
    constituency: news?.constituency || '',
    priority: news?.priority || 'MEDIUM',
    status: news?.status || 'DRAFT',
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const data = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map((t: any) => t.trim()) : [],
      };
      return news ? newsAPI.update(news.id, data) : newsAPI.create(data);
    },
    onSuccess: () => {
      toast.success(news ? 'News updated' : 'News created');
      queryClient.invalidateQueries({ queryKey: ['news'] });
      queryClient.invalidateQueries({ queryKey: ['news-stats'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error('Title is required');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{news ? 'Edit News' : 'Create News'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title (Local Language)
            </label>
            <input
              type="text"
              value={formData.titleLocal}
              onChange={(e) => setFormData({ ...formData, titleLocal: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
            <textarea
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Geographic Scope</h4>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Level</label>
                <select
                  value={formData.geographicLevel}
                  onChange={(e) => setFormData({ ...formData, geographicLevel: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  {geographicLevelOptions.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="State name"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">District</label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="District name"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Constituency</label>
                <input
                  type="text"
                  value={formData.constituency}
                  onChange={(e) => setFormData({ ...formData, constituency: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Constituency"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Source Information</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Source Type</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="MANUAL_ENTRY">Manual Entry</option>
                  <option value="RSS_FEED">RSS Feed</option>
                  <option value="API">API</option>
                  <option value="SCRAPER">Scraper</option>
                  <option value="USER_SUBMITTED">User Submitted</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Source Name</label>
                <input
                  type="text"
                  value={formData.sourceName}
                  onChange={(e) => setFormData({ ...formData, sourceName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="e.g., Times of India"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Source URL</label>
                <input
                  type="url"
                  value={formData.sourceUrl}
                  onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Comma separated tags (e.g., election, politics, local)"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving...' : news ? 'Update News' : 'Create News'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
