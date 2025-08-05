import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { PROVIDER_GOOGLE, Polygon } from "react-native-maps";
import { theme } from "../theme/theme";

interface Territory {
  id: string;
  coordinates: {
    latitude: number;
    longitude: number;
  }[];
  teamId?: string;
  color: string;
}

interface MapComponentProps {
  territories?: Territory[];
  onRegionChange?: (region: any) => void;
  onPress?: (event: any) => void;
}

export const MapComponent = ({
  territories = [],
  onRegionChange,
  onPress,
}: MapComponentProps) => {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    })();
  }, []);

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
        {territories.map((territory) => (
          <Polygon
            key={territory.id}
            coordinates={territory.coordinates}
            fillColor={`${territory.color}50`}
            strokeColor={territory.color}
            strokeWidth={2}
          />
        ))}
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
