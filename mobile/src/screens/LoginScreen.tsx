import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "navigation/types";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "../components/Button";
import { useAuthStore } from "../store/authStore";
import { theme } from "../theme/theme";

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Login"
>;

export const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error } = useAuthStore();
  const navigation = useNavigation<LoginScreenNavigationProp>();

  const handleLogin = async () => {
    if (email && password) {
      await login(email, password);
    }
  };

  const handleRegister = () => {
    // This will need navigation context - for now just a placeholder
    navigation.navigate("Register");
    console.log("Navigate to register");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.form}>
        <Text style={styles.title}>Welcome to Juris</Text>
        <Text style={styles.subtitle}>Capture territories while running</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={theme.colors.textLight}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={theme.colors.textLight}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Button
          title="Login"
          onPress={handleLogin}
          loading={isLoading}
          disabled={!email || !password}
          style={styles.loginButton}
        />

        <Button
          title="Create Account"
          onPress={handleRegister}
          variant="outline"
          style={styles.registerButton}
        />

        <Button
          title="Forgot Password?"
          onPress={() => console.log("Navigate to forgot password")}
          variant="text"
          style={styles.forgotButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  form: {
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textLight,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  },
  error: {
    color: theme.colors.error,
    fontSize: 14,
    textAlign: "center",
  },
  loginButton: {
    marginTop: theme.spacing.lg,
  },
  registerButton: {
    marginTop: theme.spacing.md,
  },
  forgotButton: {
    marginTop: theme.spacing.sm,
  },
});
