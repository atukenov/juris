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
      <View style={styles.iconContainer}>
        <Text style={styles.mapIcon}>🗺️</Text>
      </View>
      <Text style={styles.title}>Maps Coming Soon</Text>
      <Text style={styles.subtitle}>
        Interactive maps are currently available on mobile devices only.
      </Text>
      <Text style={styles.note}>
        Download the mobile app to explore territories and capture locations in real-time!
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: theme.spacing.lg,
  },
  mapIcon: {
    fontSize: 64,
    textAlign: "center",
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
    lineHeight: 24,
  },
  note: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 20,
  },
});
