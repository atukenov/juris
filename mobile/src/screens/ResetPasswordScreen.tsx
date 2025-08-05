import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "../components/Button";
import { RootStackParamList } from "../navigation/types";
import { useAuthStore } from "../store/authStore";
import { theme } from "../theme/theme";

type Props = NativeStackScreenProps<RootStackParamList, "ResetPassword">;

type FormData = {
  password: string;
  confirmPassword: string;
};

export const ResetPasswordScreen: React.FC<Props> = ({ route, navigation }) => {
  const { token } = route.params;
  const [formData, setFormData] = useState<FormData>({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const { resetPassword, isLoading, error } = useAuthStore();
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    const newErrors: Partial<FormData> = {};

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (validateForm()) {
      try {
        await resetPassword(token, formData.password);
        setSuccess(true);
      } catch (err) {
        // Error will be handled by the store
      }
    }
  };

  const handleUpdateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Text style={styles.title}>Reset Password</Text>

          {!success ? (
            <>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="New Password"
                value={formData.password}
                onChangeText={(value) => handleUpdateField("password", value)}
                secureTextEntry
                placeholderTextColor={theme.colors.textLight}
              />
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}

              <TextInput
                style={[
                  styles.input,
                  errors.confirmPassword && styles.inputError,
                ]}
                placeholder="Confirm New Password"
                value={formData.confirmPassword}
                onChangeText={(value) =>
                  handleUpdateField("confirmPassword", value)
                }
                secureTextEntry
                placeholderTextColor={theme.colors.textLight}
              />
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}

              <Button
                title="Reset Password"
                onPress={handleResetPassword}
                loading={isLoading}
                variant="primary"
                style={styles.button}
              />
            </>
          ) : (
            <>
              <Text style={styles.successMessage}>
                Your password has been reset successfully.
              </Text>

              <Button
                title="Back to Login"
                onPress={() => navigation.navigate("Login")}
                variant="primary"
                style={styles.button}
              />
            </>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  form: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginBottom: 10,
  },
  successMessage: {
    color: theme.colors.success,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
  },
  button: {
    marginTop: 10,
  },
});
