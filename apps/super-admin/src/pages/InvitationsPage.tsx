import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invitationsAPI, tenantsAPI } from '../services/api';
import { formatDateTime } from '../lib/utils';
import { toast } from 'sonner';
import {
  MailIcon,
  PlusIcon,
  SendIcon,
  XIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  RefreshCwIcon,
  CopyIcon,
} from 'lucide-react';

type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED' | 'RESENT';

const statusConfig: Record<InvitationStatus, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
  ACCEPTED: { label: 'Accepted', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
  EXPIRED: { label: 'Expired', color: 'bg-gray-100 text-gray-800', icon: XCircleIcon },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XIcon },
  RESENT: { label: 'Resent', color: 'bg-blue-100 text-blue-800', icon: RefreshCwIcon },
};

export function InvitationsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data: invitationsData, isLoading } = useQuery({
    queryKey: ['invitations', page, selectedStatus, selectedTenant],
    queryFn: () => invitationsAPI.getAll({
      page,
      limit: 20,
      status: selectedStatus || undefined,
      tenantId: selectedTenant || undefined,
    }),
  });

  const { data: tenantsData } = useQuery({
    queryKey: ['tenants-list'],
    queryFn: () => tenantsAPI.getAll({ limit: 100 }),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => invitationsAPI.resend(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation resent successfully');
      if (response.data?.data?.inviteLink) {
        navigator.clipboard.writeText(response.data.data.inviteLink);
        toast.info('New invite link copied to clipboard');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to resend invitation');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => invitationsAPI.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation cancelled');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to cancel invitation');
    },
  });

  const invitations = invitationsData?.data?.data || [];
  const meta = invitationsData?.data?.meta;
  const tenants = tenantsData?.data?.data || [];

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin.replace(':5174', ':5173')}/accept-invitation?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenant Admin Invitations</h1>
          <p className="text-gray-500">Invite administrators to manage tenants</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          <PlusIcon className="h-5 w-5" />
          Invite Tenant Admin
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          value={selectedTenant}
          onChange={(e) => {
            setSelectedTenant(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">All Tenants</option>
          {tenants.map((tenant: any) => (
            <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
          ))}
        </select>
      </div>

      {/* Invitations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-12">
            <MailIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No invitations found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invitee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invitations.map((invitation: any) => {
                const status = statusConfig[invitation.status as InvitationStatus] || statusConfig.PENDING;
                const StatusIcon = status.icon;

                return (
                  <tr key={invitation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {invitation.firstName} {invitation.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{invitation.mobile}</div>
                        {invitation.email && (
                          <div className="text-sm text-gray-400">{invitation.email}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{invitation.tenant?.name}</div>
                      <div className="text-xs text-gray-500">{invitation.tenant?.slug}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                        {invitation.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${status.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDateTime(invitation.expiresAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {invitation.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => copyInviteLink(invitation.token)}
                              className="p-1 text-gray-500 hover:text-gray-700"
                              title="Copy invite link"
                            >
                              <CopyIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => resendMutation.mutate(invitation.id)}
                              disabled={resendMutation.isPending}
                              className="p-1 text-blue-500 hover:text-blue-700"
                              title="Resend invitation"
                            >
                              <RefreshCwIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => cancelMutation.mutate(invitation.id)}
                              disabled={cancelMutation.isPending}
                              className="p-1 text-red-500 hover:text-red-700"
                              title="Cancel invitation"
                            >
                              <XIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * meta.limit + 1} to {Math.min(page * meta.limit, meta.total)} of {meta.total}
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
                disabled={page === meta.totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Invitation Modal */}
      {showCreateModal && (
        <CreateInvitationModal
          tenants={tenants}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

function CreateInvitationModal({
  tenants,
  onClose,
}: {
  tenants: any[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    mobile: '',
    email: '',
    tenantId: '',
    message: '',
  });

  const createMutation = useMutation({
    mutationFn: () => invitationsAPI.create(formData),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation sent successfully');
      if (response.data?.data?.inviteLink) {
        navigator.clipboard.writeText(response.data.data.inviteLink);
        toast.info('Invite link copied to clipboard');
      }
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to send invitation');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.mobile || !formData.tenantId) {
      toast.error('Please fill in all required fields');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Invite Tenant Admin</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tenant <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.tenantId}
              onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            >
              <option value="">Select a tenant</option>
              {tenants.map((tenant: any) => (
                <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="10-digit mobile number"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message (optional)
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
              placeholder="Welcome message for the invitee"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Sending...
                </>
              ) : (
                <>
                  <SendIcon className="h-4 w-4" />
                  Send Invitation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
