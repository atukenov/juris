import React, { useState, useEffect } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { Button } from "../components/Button";
import { ApiTestComponent } from "../components/ApiTestComponent";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import { useAuthStore } from "../store/authStore";
import { theme } from "../theme/theme";
import { getProfileDisplayName, formatStats, validateProfileForm } from "../utils/profileUtils";

type FormData = {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
};

interface UserStats {
  territoriesCaptures: number;
  teamJoinDate: string | null;
  totalRuns: number;
}

export const ProfileScreen = () => {
  const { user, updateProfile, logout, isLoading, error } = useAuthStore();
  const [formData, setFormData] = useState<FormData>({
    username: user?.username || "",
    email: user?.email || "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({
    territoriesCaptures: 0,
    teamJoinDate: null,
    totalRuns: 0,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        email: user.email || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      });
      
      setUserStats({
        territoriesCaptures: Math.floor(Math.random() * 50),
        teamJoinDate: user.currentTeam ? new Date().toISOString() : null,
        totalRuns: Math.floor(Math.random() * 100),
      });
    }
  }, [user]);

  const handleUpdate = async () => {
    const validation = validateProfileForm(formData);
    if (!validation.isValid) {
      const errorMessage = Object.values(validation.errors).join('\n');
      Alert.alert("Error", errorMessage);
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
      setShowLogoutDialog(false);
    } catch (err) {
      // Error will be handled by the store
    }
  };

  const displayName = getProfileDisplayName(user);
  const formattedStats = formatStats(userStats);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* API Test Component */}
      <ApiTestComponent />
      
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color={theme.colors.primary} />
        </View>
        <Text style={styles.displayName}>{displayName}</Text>
        <Text style={styles.username}>@{user?.username}</Text>
      </View>

      {/* Team Information */}
      {user?.currentTeam && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Information</Text>
          <View style={styles.infoRow}>
            <Ionicons name="people" size={20} color={theme.colors.primary} />
            <Text style={styles.infoText}>{user.currentTeam.name}</Text>
          </View>
          {formattedStats.teamJoinDate && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={20} color={theme.colors.primary} />
              <Text style={styles.infoText}>Joined {formattedStats.teamJoinDate}</Text>
            </View>
          )}
        </View>
      )}

      {/* Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formattedStats.territories}</Text>
            <Text style={styles.statLabel}>Territories</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formattedStats.runs}</Text>
            <Text style={styles.statLabel}>Total Runs</Text>
          </View>
        </View>
      </View>
      
      {/* Profile Form */}
      <View style={styles.form}>
        <Text style={styles.title}>Profile Details</Text>

        <TextInput
          style={styles.input}
          placeholder="First Name"
          value={formData.firstName}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, firstName: text }))
          }
          editable={isEditing}
          placeholderTextColor={theme.colors.textLight}
        />

        <TextInput
          style={styles.input}
          placeholder="Last Name"
          value={formData.lastName}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, lastName: text }))
          }
          editable={isEditing}
          placeholderTextColor={theme.colors.textLight}
        />

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
                  firstName: user?.firstName || "",
                  lastName: user?.lastName || "",
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
              onPress={() => setShowLogoutDialog(true)}
              variant="outline"
              style={styles.button}
            />
          </View>
        )}
      </View>

      <ConfirmationDialog
        visible={showLogoutDialog}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        cancelText="Cancel"
        confirmVariant="outline"
        icon="log-out-outline"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />
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
  header: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
  },
  avatarContainer: {
    marginBottom: theme.spacing.md,
  },
  displayName: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  username: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textLight,
  },
  section: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    marginVertical: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
    marginTop: theme.spacing.xs,
  },
  form: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    marginVertical: theme.spacing.xs,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
    textAlign: "center" as any,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.caption.fontSize,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  buttonGroup: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  button: {
    marginVertical: theme.spacing.xs,
  },
});
