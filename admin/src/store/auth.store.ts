import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
}

interface AuthState {
  user: AdminUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AdminUser, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  logout: () => void;
}

/**
 * The refresh token is intentionally NEVER stored here (or anywhere in
 * client-side JavaScript-accessible storage). It lives exclusively as an
 * httpOnly cookie set by the backend, which JS cannot read even if an
 * XSS vulnerability were ever present in this app or one of its
 * dependencies. Only the short-lived (15-minute) access token is kept
 * client-side, which meaningfully bounds the damage of a token leak
 * compared to persisting a 7-day-lived refresh token in localStorage.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken) =>
        set({ user, accessToken, isAuthenticated: true }),
      setAccessToken: (accessToken) =>
        set({ accessToken }),
      logout: () =>
        set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    { name: 'prichoy-admin-auth' }
  )
);
