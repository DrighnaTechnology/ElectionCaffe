import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { actionsAPI, newsAPI } from '../services/api';
import { formatDateTime } from '../lib/utils';
import { toast } from 'sonner';
import {
  ListTodoIcon,
  PlusIcon,
  XIcon,
  SearchIcon,
  FilterIcon,
  EditIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
  UserIcon,
  SparklesIcon,
  AlertTriangleIcon,
  CheckIcon,
  XCircleIcon,
} from 'lucide-react';

type ActionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const statusConfig: Record<ActionStatus, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'bg-gray-100 text-gray-800', icon: ClockIcon },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: PlayIcon },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
  ON_HOLD: { label: 'On Hold', color: 'bg-yellow-100 text-yellow-800', icon: PauseIcon },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircleIcon },
};

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
  MEDIUM: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  HIGH: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  CRITICAL: { label: 'Critical', color: 'bg-red-100 text-red-700' },
};

const actionTypeOptions = [
  'FIELD_VISIT', 'MEETING', 'PHONE_CALL', 'COMMUNICATION', 'CAMPAIGN',
  'EVENT', 'SURVEY', 'OUTREACH', 'FOLLOW_UP', 'INVESTIGATION', 'OTHER',
];

export function ActionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    actionType: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch actions
  const { data: actionsData, isLoading } = useQuery({
    queryKey: ['actions', page, search, filters],
    queryFn: () => actionsAPI.getAll({
      page,
      limit: 20,
      status: filters.status || undefined,
      priority: filters.priority || undefined,
      actionType: filters.actionType || undefined,
    }),
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['actions-stats'],
    queryFn: () => actionsAPI.getStats(),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => actionsAPI.delete(id),
    onSuccess: () => {
      toast.success('Action deleted');
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['actions-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete');
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      actionsAPI.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['actions-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update status');
    },
  });

  const actions = actionsData?.data?.data || [];
  const pagination = actionsData?.data?.pagination;
  const stats = statsData?.data?.data || {};

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this action?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Actions</h1>
          <p className="text-gray-500">Manage AI-generated and manual action items</p>
        </div>
        <button
          onClick={() => {
            setSelectedAction(null);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          <PlusIcon className="h-5 w-5" />
          Create Action
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <ListTodoIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total || 0}</p>
              <p className="text-xs text-gray-500">Total Actions</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-50 text-gray-600">
              <ClockIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.byStatus?.PENDING || 0}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <PlayIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.byStatus?.IN_PROGRESS || 0}</p>
              <p className="text-xs text-gray-500">In Progress</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <CheckCircleIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.byStatus?.COMPLETED || 0}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <AlertTriangleIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.overdue || 0}</p>
              <p className="text-xs text-gray-500">Overdue</p>
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
              placeholder="Search actions..."
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
        <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
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
            value={filters.actionType}
            onChange={(e) => setFilters({ ...filters, actionType: e.target.value })}
            className="px-3 py-2 border rounded-lg bg-white"
          >
            <option value="">All Types</option>
            {actionTypeOptions.map((type) => (
              <option key={type} value={type}>{type.replace('_', ' ')}</option>
            ))}
          </select>
          <button
            onClick={() => setFilters({ status: '', priority: '', actionType: '' })}
            className="px-4 py-2 text-orange-500 hover:bg-orange-50 rounded-lg"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Actions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
          </div>
        ) : actions.length === 0 ? (
          <div className="text-center py-12">
            <ListTodoIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No actions found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {actions.map((action: any) => {
                const status = statusConfig[action.status as ActionStatus] || statusConfig.PENDING;
                const priority = priorityConfig[action.priority as Priority] || priorityConfig.MEDIUM;
                const StatusIcon = status.icon;
                const isOverdue = action.dueDate && new Date(action.dueDate) < new Date() && action.status !== 'COMPLETED';

                return (
                  <tr key={action.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <div className="font-medium text-gray-900 truncate">{action.title}</div>
                        {action.newsInformation && (
                          <div className="text-xs text-gray-500 truncate">
                            From: {action.newsInformation.title}
                          </div>
                        )}
                        {action.isAIGenerated && (
                          <span className="inline-flex items-center gap-1 text-xs text-purple-600">
                            <SparklesIcon className="h-3 w-3" />
                            AI Generated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                        {action.actionType?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded w-fit ${status.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${priority.color}`}>
                        {priority.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <UserIcon className="h-3 w-3" />
                        <span>{action.assignedToName || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {action.dueDate ? (
                        <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}>
                          {formatDateTime(action.dueDate)}
                          {isOverdue && ' (Overdue)'}
                        </span>
                      ) : (
                        <span className="text-gray-400">No due date</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {action.status === 'PENDING' && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: action.id, status: 'IN_PROGRESS' })}
                            disabled={updateStatusMutation.isPending}
                            className="p-1 text-blue-500 hover:text-blue-700"
                            title="Start"
                          >
                            <PlayIcon className="h-4 w-4" />
                          </button>
                        )}
                        {action.status === 'IN_PROGRESS' && (
                          <>
                            <button
                              onClick={() => updateStatusMutation.mutate({ id: action.id, status: 'COMPLETED' })}
                              disabled={updateStatusMutation.isPending}
                              className="p-1 text-green-500 hover:text-green-700"
                              title="Complete"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => updateStatusMutation.mutate({ id: action.id, status: 'ON_HOLD' })}
                              disabled={updateStatusMutation.isPending}
                              className="p-1 text-yellow-500 hover:text-yellow-700"
                              title="Put On Hold"
                            >
                              <PauseIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {action.status === 'ON_HOLD' && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: action.id, status: 'IN_PROGRESS' })}
                            disabled={updateStatusMutation.isPending}
                            className="p-1 text-blue-500 hover:text-blue-700"
                            title="Resume"
                          >
                            <PlayIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedAction(action);
                            setShowCreateModal(true);
                          }}
                          className="p-1 text-gray-500 hover:text-gray-700"
                          title="Edit"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(action.id)}
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
        <ActionModal
          action={selectedAction}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedAction(null);
          }}
        />
      )}
    </div>
  );
}

function ActionModal({
  action,
  onClose,
}: {
  action: any | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: action?.title || '',
    titleLocal: action?.titleLocal || '',
    description: action?.description || '',
    actionType: action?.actionType || 'OTHER',
    priority: action?.priority || 'MEDIUM',
    status: action?.status || 'PENDING',
    geographicLevel: action?.geographicLevel || 'NATIONAL',
    state: action?.state || '',
    district: action?.district || '',
    constituency: action?.constituency || '',
    assignedTo: action?.assignedTo || '',
    assignedToName: action?.assignedToName || '',
    dueDate: action?.dueDate ? new Date(action.dueDate).toISOString().slice(0, 16) : '',
    estimatedImpact: action?.estimatedImpact || '',
    newsId: action?.newsId || '',
  });

  // Fetch news for dropdown
  const { data: newsData } = useQuery({
    queryKey: ['news-for-action'],
    queryFn: () => newsAPI.getAll({ limit: 50, status: 'PUBLISHED' }),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const data = {
        ...formData,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        newsId: formData.newsId || undefined,
      };
      return action ? actionsAPI.update(action.id, data) : actionsAPI.create(data);
    },
    onSuccess: () => {
      toast.success(action ? 'Action updated' : 'Action created');
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['actions-stats'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save');
    },
  });

  const newsList = newsData?.data?.data || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error('Title is required');
      return;
    }
    if (!formData.actionType) {
      toast.error('Action type is required');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{action ? 'Edit Action' : 'Create Action'}</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.actionType}
                onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                {actionTypeOptions.map((type) => (
                  <option key={type} value={type}>{type.replace('_', ' ')}</option>
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
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To (Name)</label>
              <input
                type="text"
                value={formData.assignedToName}
                onChange={(e) => setFormData({ ...formData, assignedToName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Person's name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Related News (Optional)</label>
            <select
              value={formData.newsId}
              onChange={(e) => setFormData({ ...formData, newsId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">-- No linked news --</option>
              {newsList.map((news: any) => (
                <option key={news.id} value={news.id}>
                  {news.title.substring(0, 60)}...
                </option>
              ))}
            </select>
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
                  <option value="NATIONAL">National</option>
                  <option value="STATE">State</option>
                  <option value="DISTRICT">District</option>
                  <option value="CONSTITUENCY">Constituency</option>
                  <option value="BOOTH">Booth</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">District</label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Constituency</label>
                <input
                  type="text"
                  value={formData.constituency}
                  onChange={(e) => setFormData({ ...formData, constituency: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Impact</label>
            <textarea
              value={formData.estimatedImpact}
              onChange={(e) => setFormData({ ...formData, estimatedImpact: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
              placeholder="Describe the expected impact of this action..."
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
              {saveMutation.isPending ? 'Saving...' : action ? 'Update Action' : 'Create Action'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
