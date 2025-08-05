import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./apiClient";

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData extends LoginCredentials {
  username: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

export const authService = {
  async login(credentials: LoginCredentials) {
    const { data } = await api.post<AuthResponse>("/auth/login", credentials);
    await AsyncStorage.setItem("auth_token", data.token);
    return data;
  },

  async register(userData: RegisterData) {
    const { data } = await api.post<AuthResponse>("/auth/register", userData);
    await AsyncStorage.setItem("auth_token", data.token);
    return data;
  },

  async logout() {
    await AsyncStorage.removeItem("auth_token");
  },

  async getProfile() {
    const { data } = await api.get("/auth/profile");
    return data;
  },

  async updateProfile(
    profileData: Partial<{ username: string; email: string }>
  ) {
    const { data } = await api.put("/auth/profile", profileData);
    return data;
  },

  async checkAuth() {
    const token = await AsyncStorage.getItem("auth_token");
    return !!token;
  },

  async requestPasswordReset(email: string) {
    const { data } = await api.post("/auth/forgot-password", { email });
    return data;
  },

  async resetPassword(token: string, newPassword: string) {
    const { data } = await api.post("/auth/reset-password", {
      token,
      password: newPassword,
    });
    return data;
  },
};
