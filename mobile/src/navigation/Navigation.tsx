import { NavigationContainer } from "@react-navigation/native";
import React, { useEffect } from "react";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { useAuthStore } from "../store/authStore";
import { AuthNavigator } from "./AuthNavigator";
import { MainNavigator } from "./MainNavigator";

export const Navigation = () => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    // Check if user is already authenticated when app starts
    checkAuth();
  }, []);

  if (isLoading) {
    return <LoadingOverlay visible={true} />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};
