import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "../components/Button";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { useTeamStore } from "../store/teamStore";
import { theme } from "../theme/theme";

export const TeamScreen = () => {
  const {
    teams,
    currentTeam,
    isLoading,
    error,
    fetchTeams,
    joinTeam,
    leaveTeam,
    createTeam,
  } = useTeamStore();
  const [refreshing, setRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error);
    }
  }, [error]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTeams();
    setRefreshing(false);
  };

  const handleJoinTeam = async (teamId: string) => {
    await joinTeam(teamId);
  };

  const handleLeaveTeam = async (teamId: string) => {
    Alert.alert("Leave Team", "Are you sure you want to leave this team?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => leaveTeam(teamId),
      },
    ]);
  };

  const handleCreateTeam = () => {
    Alert.prompt("Create Team", "Enter team name:", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Create",
        onPress: async (name) => {
          if (name?.trim()) {
            await createTeam(name.trim());
          }
        },
      },
    ]);
  };

  if (isLoading && !refreshing) {
    return <LoadingOverlay visible={true} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Teams</Text>
        <Button
          title="Create Team"
          onPress={handleCreateTeam}
          variant="primary"
          style={styles.createButton}
        />
      </View>
      <FlatList
        data={teams}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.teamCard}>
            <Text style={styles.teamName}>{item.name}</Text>
            <View style={styles.stats}>
              <Text style={styles.statsText}>{item.members} members</Text>
              <Text style={styles.statsText}>
                {item.territories} territories
              </Text>
            </View>
            {currentTeam?.id === item.id ? (
              <Button
                title="Leave Team"
                onPress={() => handleLeaveTeam(item.id)}
                variant="outline"
                style={styles.teamButton}
              />
            ) : (
              <Button
                title="Join Team"
                onPress={() => handleJoinTeam(item.id)}
                variant="primary"
                style={styles.teamButton}
              />
            )}
          </View>
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: "700",
    color: theme.colors.text,
  },
  list: {
    padding: theme.spacing.md,
  },
  teamCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  teamName: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  stats: {
    flexDirection: "row",
    marginTop: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  statsText: {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: "400",
    color: theme.colors.textLight,
  },
  createButton: {
    minWidth: 120,
  },
  teamButton: {
    marginTop: theme.spacing.md,
  },
});
