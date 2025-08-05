import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { MapComponent } from "../components/MapComponent";
import { theme } from "../theme/theme";

export const RunScreen = () => {
  const [isRunning, setIsRunning] = useState(false);

  return (
    <View style={styles.container}>
      <MapComponent />
      <View style={styles.overlay}>
        <Button
          title={isRunning ? "Stop Running" : "Start Running"}
          onPress={() => setIsRunning(!isRunning)}
          variant={isRunning ? "secondary" : "primary"}
        />
        {isRunning && (
          <View style={styles.stats}>
            <Text style={styles.statsText}>Distance: 0.0 km</Text>
            <Text style={styles.statsText}>Time: 00:00:00</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  overlay: {
    position: "absolute",
    bottom: theme.spacing.xl,
    left: theme.spacing.md,
    right: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: theme.borderRadius.lg,
    alignItems: "center",
  },
  stats: {
    marginTop: theme.spacing.md,
    alignItems: "center",
  },
  statsText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
});
