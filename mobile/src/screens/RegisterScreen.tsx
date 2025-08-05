import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
  Alert,
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

type RegisterScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "Register"
>;

export const RegisterScreen = ({ navigation }: RegisterScreenProps) => {
  const { register, isLoading, error } = useAuthStore();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleRegister = async () => {
    // Form validation
    if (
      !formData.username.trim() ||
      !formData.email.trim() ||
      !formData.password.trim()
    ) {
      Alert.alert("Error", "All fields are required");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    try {
      await register(formData.username, formData.email, formData.password);
    } catch (err) {
      // Error will be handled by the store
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.form}>
        <Text style={styles.title}>Create Account</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          value={formData.username}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, username: text }))
          }
          autoCapitalize="none"
          placeholderTextColor={theme.colors.textLight}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={formData.email}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, email: text }))
          }
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={theme.colors.textLight}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={formData.password}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, password: text }))
          }
          secureTextEntry
          placeholderTextColor={theme.colors.textLight}
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, confirmPassword: text }))
          }
          secureTextEntry
          placeholderTextColor={theme.colors.textLight}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.buttonGroup}>
          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={isLoading}
            variant="primary"
            style={styles.button}
          />
          <Button
            title="Already have an account?"
            onPress={() => navigation.navigate("Login")}
            variant="text"
            style={styles.button}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
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
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginBottom: 10,
    textAlign: "center",
  },
  buttonGroup: {
    marginTop: 20,
    gap: 10,
  },
  button: {
    marginVertical: 5,
  },
});
