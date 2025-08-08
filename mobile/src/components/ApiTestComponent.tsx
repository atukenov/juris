import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { api } from "../api/apiClient";
import { theme } from "../theme/theme";
import { Button } from "./Button";

// Simple health check using fetch since axios has import issues
const healthCheck = async () => {
  const response = await fetch("http://192.168.68.195:3000/health");
  return response.status === 200
    ? { status: "OK" }
    : { status: "Error", code: response.status };
};

export const ApiTestComponent = () => {
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Testing...");
  const [isLoading, setIsLoading] = useState(false);

  const testConnection = async () => {
    setIsLoading(true);
    try {
      // Test health endpoint using fetch
      const response = await healthCheck();
      console.log("API Health Response:", response);
      setConnectionStatus(`✅ Connected: ${response.status}`);
    } catch (error: any) {
      console.error("API Connection Error:", error);
      setConnectionStatus(`❌ Failed: ${error.message}`);
      Alert.alert(
        "Connection Error",
        `Could not connect to backend: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const testTeamsEndpoint = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/teams");
      console.log("Teams Response:", response.data);
      Alert.alert("Teams API", `Found ${response.data.length} teams`);
    } catch (error: any) {
      console.error("Teams API Error:", error);
      Alert.alert("Teams API Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>API Connection Test</Text>
      <Text style={styles.status}>{connectionStatus}</Text>

      <View style={styles.buttonContainer}>
        <Button
          title="Test Health"
          onPress={testConnection}
          loading={isLoading}
          variant="primary"
        />
        <Button
          title="Test Teams API"
          onPress={testTeamsEndpoint}
          loading={isLoading}
          variant="outline"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    margin: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
  status: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textLight,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  buttonContainer: {
    gap: theme.spacing.md,
  },
});
