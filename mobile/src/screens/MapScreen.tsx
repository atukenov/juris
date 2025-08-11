import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { MapComponent } from "../components/MapComponent";
import { MapComponentWeb } from "../components/MapComponentWeb";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { LeaderboardScreen } from "./LeaderboardScreen";
import { useTerritoryStore } from "../store/territoryStore";
import { useCaptureStore } from "../store/captureStore";
import { useLocationTracking } from "../hooks/useLocationTracking";
import { theme } from "../theme/theme";

export const MapScreen = () => {
  const [activeTab, setActiveTab] = useState<'map' | 'leaderboard'>('map');
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

  const renderTabButton = (tab: 'map' | 'leaderboard', label: string, icon: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons 
        name={icon as any} 
        size={20} 
        color={activeTab === tab ? theme.colors.white : theme.colors.text} 
      />
      <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (isInitializing) {
    return <LoadingOverlay visible={true} />;
  }

  if (activeTab === 'leaderboard') {
    return (
      <View style={styles.container}>
        <View style={styles.tabContainer}>
          {renderTabButton('map', 'Map', 'map')}
          {renderTabButton('leaderboard', 'Leaderboard', 'podium')}
        </View>
        <LeaderboardScreen />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        {renderTabButton('map', 'Map', 'map')}
        {renderTabButton('leaderboard', 'Leaderboard', 'podium')}
      </View>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.xs,
    backgroundColor: theme.colors.background,
  },
  activeTabButton: {
    backgroundColor: theme.colors.primary,
  },
  tabButtonText: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text,
  },
  activeTabButtonText: {
    color: theme.colors.white,
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
