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

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const { requestPasswordReset, isLoading, error } = useAuthStore();

  const handleResetRequest = async () => {
    if (!email.trim()) return;

    try {
      await requestPasswordReset(email);
      setEmailSent(true);
    } catch (err) {
      // Error will be handled by the store
    }
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

          {!emailSent ? (
            <>
              <Text style={styles.description}>
                Enter your email address and we'll send you instructions to
                reset your password.
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor={theme.colors.textLight}
              />

              <Button
                title="Send Reset Link"
                onPress={handleResetRequest}
                loading={isLoading}
                variant="primary"
                style={styles.button}
              />
            </>
          ) : (
            <>
              <Text style={styles.successMessage}>
                We've sent password reset instructions to your email address.
                Please check your inbox.
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

          <Button
            title="Back to Login"
            onPress={() => navigation.navigate("Login")}
            variant="text"
            style={styles.switchButton}
          />
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
    marginBottom: 20,
    textAlign: "center",
  },
  description: {
    color: theme.colors.text,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
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
  successMessage: {
    color: theme.colors.success,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginBottom: 10,
    textAlign: "center",
  },
  button: {
    marginTop: 10,
  },
  switchButton: {
    marginTop: 20,
  },
});
