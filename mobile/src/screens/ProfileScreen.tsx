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
import { ApiTestComponent } from "../components/ApiTestComponent";
import { useAuthStore } from "../store/authStore";
import { theme } from "../theme/theme";

type FormData = {
  username: string;
  email: string;
};

export const ProfileScreen = () => {
  const { user, updateProfile, logout, isLoading, error } = useAuthStore();
  const [formData, setFormData] = useState<FormData>({
    username: user?.username || "",
    email: user?.email || "",
  });
  const [isEditing, setIsEditing] = useState(false);

  const handleUpdate = async () => {
    if (!formData.username.trim() || !formData.email.trim()) {
      Alert.alert("Error", "Username and email are required");
      return;
    }

    try {
      await updateProfile({
        username: formData.username,
        email: formData.email,
      });
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (err) {
      // Error will be handled by the store
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      // Error will be handled by the store
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* API Test Component */}
      <ApiTestComponent />
      
      <View style={styles.form}>
        <Text style={styles.title}>Profile</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          value={formData.username}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, username: text }))
          }
          editable={isEditing}
          placeholderTextColor={theme.colors.textLight}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={formData.email}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, email: text }))
          }
          editable={isEditing}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={theme.colors.textLight}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        {isEditing ? (
          <View style={styles.buttonGroup}>
            <Button
              title="Save Changes"
              onPress={handleUpdate}
              loading={isLoading}
              variant="primary"
              style={styles.button}
            />
            <Button
              title="Cancel"
              onPress={() => {
                setIsEditing(false);
                setFormData({
                  username: user?.username || "",
                  email: user?.email || "",
                });
              }}
              variant="outline"
              style={styles.button}
            />
          </View>
        ) : (
          <View style={styles.buttonGroup}>
            <Button
              title="Edit Profile"
              onPress={() => setIsEditing(true)}
              variant="primary"
              style={styles.button}
            />
            <Button
              title="Log Out"
              onPress={handleLogout}
              variant="outline"
              style={styles.button}
            />
          </View>
        )}
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
