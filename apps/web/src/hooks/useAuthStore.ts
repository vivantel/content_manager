import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@vivascribe/shared/config';

interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  organizationId: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithOAuth: (provider: 'github' | 'gitlab') => void;
  logout: () => void;
  setUser: (user: User, token: string) => void;
  checkAuth: () => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email: string, password: string) => {
        // TODO: Implement email/password login (not in MVP)
        throw new Error('Email/password login not implemented');
      },

      loginWithOAuth: (provider: 'github' | 'gitlab') => {
        window.location.href = `${API_URL}/api/v1/auth/${provider}`;
      },

      logout: () => {
        set({ user: null, accessToken: null, isAuthenticated: false });
        localStorage.removeItem('auth-storage');
      },

      setUser: (user: User, token: string) => {
        set({ user, accessToken: token, isAuthenticated: true, isLoading: false });
      },

      checkAuth: async () => {
        const token = get().accessToken;
        if (!token) {
          set({ isLoading: false });
          return;
        }

        try {
          const response = await fetch(`${API_URL}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              set({ user: data.data, isAuthenticated: true, isLoading: false });
              return;
            }
          }
        } catch {
          // Token invalid or expired
        }
        
        set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        accessToken: state.accessToken, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);