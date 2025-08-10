import * as Location from "expo-location";
import React, { useEffect, useState, useMemo, useCallback } from "react";
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

export const MapComponent = React.memo(({
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

  const convertGeoJSONToCoordinates = useCallback((territory: Territory) => {
    if (!territory.boundary?.coordinates?.[0]) return [];
    
    return territory.boundary.coordinates[0].map(([longitude, latitude]) => ({
      latitude,
      longitude,
    }));
  }, []);

  const getTerritoryColor = useCallback((territory: Territory) => {
    if (territory.team?.color) {
      return territory.team.color;
    }
    return territory.team_id ? "#4CAF50" : "#9E9E9E";
  }, []);

  const getTerritoryOpacity = useCallback((territory: Territory) => {
    return territory.team_id ? 0.3 : 0.1;
  }, []);

  const getTerritoryStrokeWidth = useCallback((territory: Territory) => {
    return territory.team_id ? 3 : 1;
  }, []);

  const territoryPolygons = useMemo(() => {
    return territories.map(territory => ({
      id: territory.id,
      coordinates: convertGeoJSONToCoordinates(territory),
      color: getTerritoryColor(territory),
      opacity: getTerritoryOpacity(territory),
      strokeWidth: getTerritoryStrokeWidth(territory),
      territory
    })).filter(polygon => polygon.coordinates.length > 0);
  }, [territories, convertGeoJSONToCoordinates, getTerritoryColor, getTerritoryOpacity, getTerritoryStrokeWidth]);

  const handleTerritoryPress = useCallback((territoryId: string) => {
    onTerritoryPress?.(territoryId);
  }, [onTerritoryPress]);

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
        {territoryPolygons.map((polygon) => {
          const opacityHex = Math.round(polygon.opacity * 255).toString(16).padStart(2, '0');
          
          return (
            <Polygon
              key={polygon.id}
              coordinates={polygon.coordinates}
              fillColor={`${polygon.color}${opacityHex}`}
              strokeColor={polygon.color}
              strokeWidth={polygon.strokeWidth}
              tappable
              onPress={() => handleTerritoryPress(polygon.territory.id)}
              lineDashPattern={polygon.territory.team_id ? [] : [5, 5]}
            />
          );
        })}
      </MapView>
    </View>
  );
});

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
