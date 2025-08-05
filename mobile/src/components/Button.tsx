import React from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { theme } from "../theme/theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "text";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Button = ({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: ButtonProps) => {
  const buttonStyle = [
    styles.button,
    variant === "primary" && styles.primaryButton,
    variant === "outline" && styles.outlineButton,
    variant === "text" && styles.textButton,
    disabled && styles.disabledButton,
    style,
  ];

  const textStyle = [
    styles.text,
    variant === "primary" && styles.primaryText,
    variant === "outline" && styles.outlineText,
    variant === "text" && styles.textButtonText,
    disabled && styles.disabledText,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "primary" ? theme.colors.white : theme.colors.primary
          }
          size="small"
        />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  textButton: {
    backgroundColor: "transparent",
  },
  disabledButton: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
  primaryText: {
    color: theme.colors.white,
  },
  outlineText: {
    color: theme.colors.primary,
  },
  textButtonText: {
    color: theme.colors.primary,
  },
  disabledText: {
    opacity: 0.5,
  },
});
