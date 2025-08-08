import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Alert, Platform } from "react-native";
import { Button } from "../components/Button";
import { MapComponent } from "../components/MapComponent";
import { MapComponentWeb } from "../components/MapComponentWeb";
import { useLocationTracking } from "../hooks/useLocationTracking";
import { useTerritoryStore } from "../store/territoryStore";
import { useCaptureStore } from "../store/captureStore";
import { theme } from "../theme/theme";

interface RunStats {
  distance: number;
  duration: number;
  speed: number;
  capturedTerritories: number;
}

export const RunScreen = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [runStats, setRunStats] = useState<RunStats>({
    distance: 0,
    duration: 0,
    speed: 0,
    capturedTerritories: 0,
  });
  const [startTime, setStartTime] = useState<number | null>(null);
  
  const { location, startTracking, stopTracking, isTracking } = useLocationTracking();
  const { nearbyTerritories, fetchNearbyTerritories } = useTerritoryStore();
  const { captureTerritory } = useCaptureStore();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && startTime) {
      interval = setInterval(() => {
        const currentTime = Date.now();
        const duration = Math.floor((currentTime - startTime) / 1000);
        setRunStats(prev => ({
          ...prev,
          duration,
          speed: prev.distance > 0 ? (prev.distance / (duration / 3600)) : 0, // km/h
        }));
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, startTime]);

  useEffect(() => {
    // Update nearby territories when location changes during a run
    if (isRunning && location) {
      fetchNearbyTerritories({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        radius: 500 // Smaller radius for running
      });
    }
  }, [location, isRunning]);

  const handleStartRun = async () => {
    try {
      await startTracking();
      setIsRunning(true);
      setStartTime(Date.now());
      setRunStats({
        distance: 0,
        duration: 0,
        speed: 0,
        capturedTerritories: 0,
      });
      Alert.alert("Run Started", "Happy running! 🏃‍♂️");
    } catch (error) {
      Alert.alert("Error", "Could not start location tracking");
    }
  };

  const handleStopRun = () => {
    stopTracking();
    setIsRunning(false);
    setStartTime(null);
    
    Alert.alert(
      "Run Completed! 🎉",
      `Distance: ${runStats.distance.toFixed(2)} km\n` +
      `Time: ${formatTime(runStats.duration)}\n` +
      `Territories: ${runStats.capturedTerritories}`,
      [{ text: "Great!" }]
    );
  };

  const handleTerritoryCapture = async (territoryId: string) => {
    if (!isRunning) {
      Alert.alert("Start Running", "You need to be running to capture territories!");
      return;
    }

    if (!location) {
      Alert.alert("Location Required", "Location access is needed to capture territories");
      return;
    }

    // Check speed (should be between 6-25 km/h as per game mechanics)
    if (runStats.speed < 6 || runStats.speed > 25) {
      Alert.alert(
        "Invalid Speed", 
        `Running speed should be between 6-25 km/h. Current: ${runStats.speed.toFixed(1)} km/h`
      );
      return;
    }

    try {
      await captureTerritory({
        territory_id: territoryId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      setRunStats(prev => ({
        ...prev,
        capturedTerritories: prev.capturedTerritories + 1,
      }));
      
      Alert.alert("Territory Captured! 🎯", "Keep running to capture more!");
    } catch (error) {
      console.error("Capture failed:", error);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {Platform.OS === "web" ? (
        <MapComponentWeb 
          territories={nearbyTerritories}
          onTerritoryPress={handleTerritoryCapture}
          userLocation={location}
        />
      ) : (
        <MapComponent 
          territories={nearbyTerritories}
          onTerritoryPress={handleTerritoryCapture}
          userLocation={location}
        />
      )}
      
      <View style={styles.overlay}>
        <View style={styles.controls}>
          <Button
            title={isRunning ? "Stop Running" : "Start Running"}
            onPress={isRunning ? handleStopRun : handleStartRun}
            variant={isRunning ? "outline" : "primary"}
            style={styles.runButton}
          />
        </View>
        
        {isRunning && (
          <View style={styles.stats}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Distance:</Text>
              <Text style={styles.statValue}>{runStats.distance.toFixed(2)} km</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Time:</Text>
              <Text style={styles.statValue}>{formatTime(runStats.duration)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Speed:</Text>
              <Text style={styles.statValue}>{runStats.speed.toFixed(1)} km/h</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Territories:</Text>
              <Text style={styles.statValue}>{runStats.capturedTerritories}</Text>
            </View>
          </View>
        )}
        
        <View style={styles.info}>
          <Text style={styles.infoText}>
            🎯 Run at 6-25 km/h to capture territories
          </Text>
          <Text style={styles.infoText}>
            📍 {nearbyTerritories.length} territories nearby
          </Text>
        </View>
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
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: theme.borderRadius.lg,
    alignItems: "center",
  },
  controls: {
    width: "100%",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  runButton: {
    minWidth: 150,
  },
  stats: {
    marginTop: theme.spacing.md,
    width: "100%",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  statLabel: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textLight,
    fontWeight: "500",
  },
  statValue: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    fontWeight: "600",
  },
  info: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    width: "100%",
    alignItems: "center",
  },
  infoText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
    textAlign: "center",
    marginBottom: theme.spacing.xs,
  },
  statsText: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    fontWeight: "600",
  },
});
