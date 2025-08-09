import { create } from "zustand";
import { authService } from "../api/authService";

interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  currentTeam?: {
    id: string;
    name: string;
    color: string;
    role: string;
  } | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  updateProfile: (
    data: Partial<{ username: string; email: string }>
  ) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (emailOrUsername, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await authService.login({ emailOrUsername, password });
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to login",
        isLoading: false,
      });
    }
  },

  register: async (username, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await authService.register({
        username,
        email,
        password,
      });
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to register",
        isLoading: false,
      });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
      set({ user: null, isAuthenticated: false, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to logout",
        isLoading: false,
      });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const user = await authService.getProfile();
      set({ user, isAuthenticated: true });
    } catch (error) {
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  requestPasswordReset: async (email) => {
    set({ isLoading: true, error: null });
    try {
      await authService.requestPasswordReset(email);
      set({ isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to request password reset",
        isLoading: false,
      });
    }
  },

  resetPassword: async (token, newPassword) => {
    set({ isLoading: true, error: null });
    try {
      await authService.resetPassword(token, newPassword);
      set({ isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to reset password",
        isLoading: false,
      });
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.updateProfile(data);
      set({ user, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to update profile",
        isLoading: false,
      });
    }
  },
}));
