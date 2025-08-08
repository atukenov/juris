import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View, Alert } from "react-native";
import { MapComponent } from "../components/MapComponent";
import { MapComponentWeb } from "../components/MapComponentWeb";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { useTerritoryStore } from "../store/territoryStore";
import { useCaptureStore } from "../store/captureStore";
import { useLocationTracking } from "../hooks/useLocationTracking";
import { theme } from "../theme/theme";

export const MapScreen = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const { 
    territories, 
    nearbyTerritories, 
    isLoading: territoriesLoading,
    error: territoryError,
    fetchTerritories,
    fetchNearbyTerritories 
  } = useTerritoryStore();
  
  const { captureTerritory, isLoading: captureLoading } = useCaptureStore();
  const { location, errorMsg: locationError } = useLocationTracking();

  useEffect(() => {
    initializeMap();
  }, []);

  useEffect(() => {
    // Fetch nearby territories when location changes
    if (location) {
      fetchNearbyTerritories({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        radius: 1000 // 1km radius
      });
    }
  }, [location]);

  useEffect(() => {
    if (territoryError) {
      Alert.alert("Territory Error", territoryError);
    }
  }, [territoryError]);

  useEffect(() => {
    if (locationError) {
      Alert.alert("Location Error", locationError);
    }
  }, [locationError]);

  const initializeMap = async () => {
    try {
      // Load initial territories
      await fetchTerritories();
    } catch (error) {
      console.error("Failed to initialize map:", error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleTerritoryCapture = async (territoryId: string) => {
    if (!location) {
      Alert.alert("Location Required", "Location access is needed to capture territories");
      return;
    }

    try {
      await captureTerritory({
        territory_id: territoryId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      Alert.alert("Success!", "Territory captured successfully!");
      
      // Refresh nearby territories
      await fetchNearbyTerritories({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        radius: 1000
      });
    } catch (error) {
      console.error("Capture failed:", error);
    }
  };

  if (isInitializing) {
    return <LoadingOverlay visible={true} />;
  }

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
      
      {/* Status indicator */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {nearbyTerritories.length} territories nearby
        </Text>
        {(territoriesLoading || captureLoading) && (
          <Text style={styles.loadingText}>Loading...</Text>
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
  statusBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text,
  },
  loadingText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.primary,
  },
});
