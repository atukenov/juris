import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { theme } from "../theme/theme";

type FeedbackType = "success" | "error" | "info";

interface FeedbackProps {
  visible: boolean;
  message: string;
  type?: FeedbackType;
  duration?: number;
  onHide?: () => void;
}

export const Feedback: React.FC<FeedbackProps> = ({
  visible,
  message,
  type = "info",
  duration = 3000,
  onHide,
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;

  const getIconName = () => {
    switch (type) {
      case "success":
        return "checkmark-circle";
      case "error":
        return "alert-circle";
      default:
        return "information-circle";
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "#4CAF50";
      case "error":
        return theme.colors.error;
      default:
        return theme.colors.accent;
    }
  };

  useEffect(() => {
    if (visible) {
      // Vibrate for feedback
      if (type === "error") {
        Vibration.vibrate(100);
      } else if (type === "success") {
        Vibration.vibrate(50);
      }

      // Animate in
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hide();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hide = () => {
    Animated.spring(translateY, {
      toValue: -100,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start(() => onHide?.());
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }], backgroundColor: getBackgroundColor() },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name={getIconName()} size={24} color="white" />
        <Text style={styles.message}>{message}</Text>
      </View>
      <TouchableOpacity onPress={hide}>
        <Ionicons name="close" size={24} color="white" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.md,
    paddingTop: theme.spacing.xl + theme.spacing.md, // Additional padding for status bar
    zIndex: 1000,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  message: {
    color: "white",
    fontSize: 16,
    flexShrink: 1,
  },
});
