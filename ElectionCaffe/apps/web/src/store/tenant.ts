import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { tenantAPI } from '../services/api';

export interface TenantBranding {
  id: string;
  name: string;
  displayName: string | null;
  organizationName: string | null;
  logoUrl: string | null;
  logoPosition: 'before' | 'after' | null; // Position of logo relative to display name
  primaryColor: string | null;
  secondaryColor: string | null;
  faviconUrl: string | null;
  tenantType: string;
  partyName: string | null;
  partySymbolUrl: string | null;
  tenantUrl: string | null; // System-generated URL (read-only)
  customDomain: string | null; // Custom domain alias (tenant admin can set)
}

interface TenantState {
  branding: TenantBranding | null;
  isLoading: boolean;
  error: string | null;
  fetchBranding: () => Promise<void>;
  updateBranding: (data: Partial<TenantBranding>) => Promise<void>;
  clearBranding: () => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set, get) => ({
      branding: null,
      isLoading: false,
      error: null,

      fetchBranding: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await tenantAPI.getBranding();
          if (response.data.success) {
            set({ branding: response.data.data, isLoading: false });
          } else {
            set({ error: response.data.error?.message || 'Failed to fetch branding', isLoading: false });
          }
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || 'Failed to fetch branding',
            isLoading: false
          });
        }
      },

      updateBranding: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await tenantAPI.updateBranding(data);
          if (response.data.success) {
            // Update local state with new branding data
            const current = get().branding;
            set({
              branding: current ? { ...current, ...response.data.data } : response.data.data,
              isLoading: false
            });
          } else {
            set({ error: response.data.error?.message || 'Failed to update branding', isLoading: false });
          }
        } catch (error: any) {
          set({
            error: error.response?.data?.error?.message || 'Failed to update branding',
            isLoading: false
          });
          throw error;
        }
      },

      clearBranding: () => {
        set({ branding: null, isLoading: false, error: null });
      },
    }),
    {
      name: 'electioncaffe-tenant',
    }
  )
);
