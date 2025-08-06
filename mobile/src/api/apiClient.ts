import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// Use localhost for development
// For real device testing, replace with your computer's IP address
const BASE_URL = __DEV__ ? "http://localhost:3000/api" : "http://146.31.242.101:3000/api";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
});

// Add token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem("auth_token");
      // You can add navigation to login here
    }
    return Promise.reject(error);
  }
);
