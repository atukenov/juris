import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { Region } from "react-native-maps";

const LOCATION_TASK_NAME = "background-location-task";

interface UseLocationTrackingOptions {
  enableBackgroundTracking?: boolean;
  distanceInterval?: number; // meters
  timeInterval?: number; // milliseconds
  onLocationUpdate?: (location: Location.LocationObject) => void;
}

export const useLocationTracking = ({
  enableBackgroundTracking = false,
  distanceInterval = 10, // 10 meters
  timeInterval = 5000, // 5 seconds
  onLocationUpdate,
}: UseLocationTrackingOptions = {}) => {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const subscription = useRef<Location.LocationSubscription | null>(null);

  const requestPermissions = useCallback(async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return false;
      }

      if (enableBackgroundTracking) {
        const { status: backgroundStatus } =
          await Location.requestBackgroundPermissionsAsync();

        if (backgroundStatus !== "granted") {
          setErrorMsg("Permission to access background location was denied");
          return false;
        }
      }

      return true;
    } catch (error) {
      setErrorMsg("Error requesting location permissions");
      return false;
    }
  }, [enableBackgroundTracking]);

  const startTracking = useCallback(async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      // Get initial location
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(initialLocation);
      onLocationUpdate?.(initialLocation);

      // Start watching position
      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval,
          timeInterval,
        },
        (newLocation) => {
          setLocation(newLocation);
          onLocationUpdate?.(newLocation);
        }
      );

      subscription.current = locationSubscription;
      setIsTracking(true);
    } catch (error) {
      setErrorMsg("Error starting location tracking");
    }
  }, [distanceInterval, timeInterval, onLocationUpdate]);

  const stopTracking = useCallback(() => {
    if (subscription.current) {
      subscription.current.remove();
      subscription.current = null;
    }
    setIsTracking(false);
  }, []);

  useEffect(() => {
    return () => {
      if (subscription.current) {
        subscription.current.remove();
      }
    };
  }, []);

  type RegionInput = {
    latitude: number;
    longitude: number;
    latitudeDelta?: number;
    longitudeDelta?: number;
  };

  const getRegionForCoordinates = useCallback(
    (coords: RegionInput): Region => ({
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta: coords.latitudeDelta ?? 0.0922,
      longitudeDelta: coords.longitudeDelta ?? 0.0421,
    }),
    []
  );

  const getCurrentRegion = useCallback(async (): Promise<Region | null> => {
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return getRegionForCoordinates({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (error) {
      setErrorMsg("Error getting current region");
      return null;
    }
  }, [getRegionForCoordinates]);

  return {
    location,
    errorMsg,
    isTracking,
    startTracking,
    stopTracking,
    getCurrentRegion,
    getRegionForCoordinates,
  };
};
