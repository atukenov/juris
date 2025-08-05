import React from "react";
import { StyleSheet, View } from "react-native";
import { MapComponent } from "../components/MapComponent";
import { theme } from "../theme/theme";

export const MapScreen = () => {
  return (
    <View style={styles.container}>
      <MapComponent />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
