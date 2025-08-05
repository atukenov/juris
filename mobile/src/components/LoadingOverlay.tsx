import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { theme } from "../theme/theme";

interface LoadingOverlayProps {
  visible: boolean;
  transparent?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  transparent = true,
}) => {
  if (!visible) return null;

  return (
    <View
      style={[
        styles.container,
        transparent ? styles.transparentBg : styles.solidBg,
      ]}
    >
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  transparentBg: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  solidBg: {
    backgroundColor: theme.colors.background,
  },
  loader: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
