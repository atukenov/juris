import React from "react";
import { StyleSheet, View, Platform } from "react-native";
import { MapComponent } from "../components/MapComponent";
import { MapComponentWeb } from "../components/MapComponentWeb";
import { theme } from "../theme/theme";

export const MapScreen = () => {
  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? <MapComponentWeb /> : <MapComponent />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
