import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";

const getBaseURL = () => {
  if (__DEV__) {
    const debuggerHost = Constants.expoConfig?.hostUri;
    
    if (debuggerHost) {
      const host = debuggerHost.split(':')[0];
      
      if (host.includes('.exp.direct')) {
        console.log('Tunnel mode detected - debuggerHost:', debuggerHost);
        
        
        console.log('Tunnel mode detected - using localhost for backend (tunnel provides secure connection)');
        return "http://localhost:3000/api";
      } else {
        const localUrl = `http://${host}:3000/api`;
        console.log('Using local network URL:', localUrl);
        return localUrl;
      }
    }
    
    console.log('Using localhost fallback URL');
    return "http://localhost:3000/api";
  } else {
    return "https://your-production-api.com/api";
  }
};

const BASE_URL = getBaseURL();

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeoutr
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
