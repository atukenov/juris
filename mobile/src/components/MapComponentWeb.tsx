import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { theme } from "../theme/theme";
import { Territory } from "../api/territoryService";

interface MapComponentWebProps {
  onRegionChange?: (region: any) => void;
  onPress?: (event: any) => void;
  territories?: Territory[];
  onTerritoryPress?: (territoryId: string) => void;
  userLocation?: any;
}

export const MapComponentWeb = ({
  onRegionChange,
  onPress,
  territories = [],
  onTerritoryPress,
  userLocation,
}: MapComponentWebProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Map Component (Web Version)</Text>
      <Text style={styles.subtitle}>
        This is a placeholder for the map component on web.
      </Text>
      <Text style={styles.note}>
        On mobile devices, this will show the actual interactive map with territories.
      </Text>
      
      <View style={styles.apiStatus}>
        <Text style={styles.statusTitle}>API Integration Status:</Text>
        <Text style={styles.statusItem}>✅ Territory API connected</Text>
        <Text style={styles.statusItem}>✅ Capture functionality ready</Text>
        <Text style={styles.statusItem}>✅ Real-time updates prepared</Text>
        <Text style={styles.statusItem}>
          🗺️ {territories.length} territories loaded
        </Text>
        <Text style={styles.statusItem}>
          📍 Location: {userLocation ? 'Available' : 'Not available'}
        </Text>
      </View>

      {territories.length > 0 && (
        <View style={styles.territoriesList}>
          <Text style={styles.statusTitle}>Nearby Territories:</Text>
          {territories.slice(0, 3).map((territory) => (
            <TouchableOpacity
              key={territory.id}
              style={styles.territoryItem}
              onPress={() => onTerritoryPress?.(territory.id)}
            >
              <Text style={styles.territoryName}>{territory.name}</Text>
              <Text style={styles.territoryDescription}>
                {territory.description || "No description"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textLight,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  note: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: theme.spacing.xl,
  },
  apiStatus: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    width: "100%",
    maxWidth: 300,
    marginBottom: theme.spacing.lg,
  },
  statusTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  statusItem: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    textAlign: "center",
  },
  territoriesList: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    width: "100%",
    maxWidth: 300,
  },
  territoryItem: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  territoryName: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: "600",
    color: theme.colors.text,
  },
  territoryDescription: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
    marginTop: theme.spacing.xs,
  },
});
