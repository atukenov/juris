import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { PROVIDER_GOOGLE, Polygon } from "react-native-maps";
import { theme } from "../theme/theme";
import { Territory } from "../api/territoryService";

interface MapComponentProps {
  territories?: Territory[];
  onTerritoryPress?: (territoryId: string) => void;
  userLocation?: Location.LocationObject | null;
  onRegionChange?: (region: any) => void;
  onPress?: (event: any) => void;
}

export const MapComponent = ({
  territories = [],
  onTerritoryPress,
  userLocation,
  onRegionChange,
  onPress,
}: MapComponentProps) => {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    userLocation || null
  );

  useEffect(() => {
    if (userLocation) {
      setLocation(userLocation);
      return;
    }

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    })();
  }, [userLocation]);

  // Convert GeoJSON coordinates to react-native-maps format
  const convertGeoJSONToCoordinates = (territory: Territory) => {
    if (!territory.boundary?.coordinates?.[0]) return [];
    
    return territory.boundary.coordinates[0].map(([longitude, latitude]) => ({
      latitude,
      longitude,
    }));
  };

  // Get territory color from team or default
  const getTerritoryColor = (territory: Territory) => {
    if (territory.team?.color) {
      return territory.team.color;
    }
    return territory.team_id ? "#4CAF50" : "#9E9E9E"; // Green if captured, gray if neutral
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        showsUserLocation
        showsMyLocationButton
        initialRegion={
          location
            ? {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }
            : undefined
        }
        onRegionChange={onRegionChange}
        onPress={onPress}
      >
        {territories.map((territory) => {
          const coordinates = convertGeoJSONToCoordinates(territory);
          const color = getTerritoryColor(territory);
          
          if (coordinates.length === 0) return null;
          
          return (
            <Polygon
              key={territory.id}
              coordinates={coordinates}
              fillColor={`${color}40`} // 25% opacity
              strokeColor={color}
              strokeWidth={2}
              tappable
              onPress={() => onTerritoryPress?.(territory.id)}
            />
          );
        })}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    borderRadius: theme.borderRadius.lg,
  },
  map: {
    width: "100%",
    height: "100%",
  },
});
