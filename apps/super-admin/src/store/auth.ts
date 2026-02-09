import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SuperAdmin {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  mobile: string;
  profilePhotoUrl?: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  admin: SuperAdmin | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (token: string, refreshToken: string, admin: SuperAdmin) => void;
  setAdmin: (admin: SuperAdmin) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      admin: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setAuth: (token, refreshToken, admin) =>
        set({ token, refreshToken, admin, isAuthenticated: true }),
      setAdmin: (admin) => set({ admin }),
      logout: () =>
        set({ token: null, refreshToken: null, admin: null, isAuthenticated: false }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'super-admin-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
