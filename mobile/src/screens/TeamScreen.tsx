import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CreateTeamData,
  OwnershipTransfer,
  Team,
  TeamDetails,
  teamService,
} from "../api/teamService";
import { Button } from "../components/Button";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { useFeedback } from "../contexts/FeedbackContext";
import { useAuthStore } from "../store/authStore";
import { theme } from "../theme/theme";

export const TeamScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { showFeedback } = useFeedback();

  const [teams, setTeams] = useState<Team[]>([]);
  const [userTeamDetails, setUserTeamDetails] = useState<TeamDetails | null>(
    null
  );
  const [ownershipTransfers, setOwnershipTransfers] = useState<
    OwnershipTransfer[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showMemberList, setShowMemberList] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);

  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState("#FF6B6B");
  const [transferUsername, setTransferUsername] = useState("");

  const predefinedColors = [
    "#FF6B35", // Orange
    "#4ECDC4", // Teal
    "#45B7D1", // Blue
    "#FFA726", // Amber
    "#66BB6A", // Green
    "#EF5350", // Red
    "#AB47BC", // Purple
    "#26A69A", // Cyan
    "#FFCA28", // Yellow
    "#8D6E63", // Brown
    "#78909C", // Blue Grey
    "#FF7043",
  ];

  useEffect(() => {
    loadTeams();
    if (user?.id) {
      checkUserTeam();
      loadOwnershipTransfers();
    }
  }, [user]);

  const loadTeams = async () => {
    try {
      const teams = await teamService.getTeams();
      setTeams(teams);
    } catch (error) {
      console.error("Failed to load teams:", error);
      showFeedback("Failed to load teams", "error");
    }
  };

  const checkUserTeam = async () => {
    if (!user?.id) return;

    try {
      // Find user's team from the teams list
      const userTeam = teams.find(
        (team) => team.ownerId === user.id || (team.members && team.members > 0)
      ); // Check if user is member

      if (userTeam) {
        const teamDetails = await teamService.getTeamById(userTeam.id);
        setUserTeamDetails(teamDetails);
      } else {
        setUserTeamDetails(null);
      }
    } catch (error) {
      console.error("Failed to check user team:", error);
    }
  };

  const loadOwnershipTransfers = async () => {
    try {
      const transfers = await teamService.getPendingTransfers();
      setOwnershipTransfers(transfers);
    } catch (error) {
      console.error("Failed to load ownership transfers:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadTeams(), loadOwnershipTransfers()]);
    await checkUserTeam();
    setRefreshing(false);
  };

  const handleJoinTeam = async (teamId: string) => {
    try {
      await teamService.joinTeam(teamId);
      showFeedback("Successfully joined team!", "success");
      await loadTeams();
      await checkUserTeam();
    } catch (error) {
      console.error("Failed to join team:", error);
      showFeedback("Failed to join team", "error");
    }
  };

  const handleLeaveTeam = async () => {
    if (!userTeamDetails) return;

    Alert.alert(
      "Leave Team",
      `Are you sure you want to leave "${userTeamDetails.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await teamService.leaveTeam(userTeamDetails.id);
              showFeedback("Successfully left team!", "success");
              await loadTeams();
              await checkUserTeam();
            } catch (error) {
              console.error("Failed to leave team:", error);
              showFeedback("Failed to leave team", "error");
            }
          },
        },
      ]
    );
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      showFeedback("Team name is required", "error");
      return;
    }

    try {
      const teamData: CreateTeamData = {
        name: newTeamName.trim(),
        description: newTeamDescription.trim(),
        color: selectedColor,
      };

      await teamService.createTeam(teamData);
      showFeedback("Team created successfully!", "success");
      setShowCreateForm(false);
      setNewTeamName("");
      setNewTeamDescription("");
      setSelectedColor("#FF6B6B");
      await loadTeams();
      await checkUserTeam();
    } catch (error) {
      console.error("Failed to create team:", error);
      showFeedback("Failed to create team", "error");
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferUsername.trim()) {
      showFeedback("Username is required", "error");
      return;
    }

    if (!userTeamDetails) {
      showFeedback("You are not in a team", "error");
      return;
    }

    // Find the user by username in team members
    const targetMember = userTeamDetails.members.find(
      (member) => member.user.username === transferUsername.trim()
    );

    if (!targetMember) {
      showFeedback("User not found in team", "error");
      return;
    }

    Alert.alert(
      "Transfer Ownership",
      `Are you sure you want to transfer ownership of "${userTeamDetails.name}" to ${transferUsername}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Transfer",
          style: "destructive",
          onPress: async () => {
            try {
              await teamService.transferOwnership(
                userTeamDetails.id,
                targetMember.userId
              );
              showFeedback("Ownership transfer requested!", "success");
              setShowTransferForm(false);
              setTransferUsername("");
              await loadOwnershipTransfers();
            } catch (error) {
              console.error("Failed to request ownership transfer:", error);
              showFeedback("Failed to request ownership transfer", "error");
            }
          },
        },
      ]
    );
  };

  const handleOwnershipTransferResponse = async (
    transferId: string,
    accept: boolean
  ) => {
    try {
      if (accept) {
        await teamService.acceptOwnership(transferId);
      } else {
        await teamService.rejectOwnership(transferId);
      }

      showFeedback(
        `Ownership transfer ${accept ? "accepted" : "rejected"}!`,
        "success"
      );
      await loadOwnershipTransfers();
      await loadTeams();
      await checkUserTeam();
    } catch (error) {
      console.error("Failed to respond to ownership transfer:", error);
      showFeedback("Failed to respond to ownership transfer", "error");
    }
  };

  const isTeamOwner =
    userTeamDetails && user && userTeamDetails.ownerId === user.id;
  const userTeam = teams.find(
    (team) => team.ownerId === user?.id || userTeamDetails?.id === team.id
  );
  const availableTeams = userTeam ? [] : teams;

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <LoadingOverlay visible={true} />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* User's Current Team */}
      {userTeamDetails ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Team</Text>
            <View style={styles.membershipBadge}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={theme.colors.success}
              />
              <Text style={styles.membershipText}>Member</Text>
            </View>
          </View>

          <View
            style={[
              styles.teamCard,
              { borderLeftColor: userTeamDetails.color || "#FF6B6B" },
            ]}
          >
            <View style={styles.teamHeader}>
              <View style={styles.teamInfo}>
                <Text style={styles.teamName}>{userTeamDetails.name}</Text>
                {userTeamDetails.description ? (
                  <Text style={styles.teamDescription}>
                    {userTeamDetails.description}
                  </Text>
                ) : null}
              </View>
              <View
                style={[
                  styles.colorIndicator,
                  { backgroundColor: userTeamDetails.color || "#FF6B6B" },
                ]}
              />
            </View>

            <View style={styles.teamStats}>
              <View style={styles.statItem}>
                <Ionicons
                  name="people"
                  size={16}
                  color={theme.colors.textLight}
                />
                <Text style={styles.statText}>
                  {userTeamDetails.members.length} members
                </Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons
                  name="location"
                  size={16}
                  color={theme.colors.textLight}
                />
                <Text style={styles.statText}>
                  {userTeamDetails.territories || 0} territories
                </Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="star" size={16} color={theme.colors.accent} />
                <Text style={styles.statText}>
                  {isTeamOwner
                    ? "You (Owner)"
                    : `${userTeamDetails.owner.username} (Owner)`}
                </Text>
              </View>
            </View>

            <View style={styles.teamActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowMemberList(!showMemberList)}
              >
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={styles.actionButtonText}>
                  {showMemberList ? "Hide Members" : "View Members"}
                </Text>
              </TouchableOpacity>

              {isTeamOwner && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setShowTransferForm(!showTransferForm)}
                >
                  <Ionicons
                    name="repeat"
                    size={16}
                    color={theme.colors.accent}
                  />
                  <Text style={styles.actionButtonText}>
                    Transfer Ownership
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionButton, styles.leaveButton]}
                onPress={handleLeaveTeam}
              >
                <Ionicons
                  name="exit-outline"
                  size={16}
                  color={theme.colors.error}
                />
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: theme.colors.error },
                  ]}
                >
                  Leave Team
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Team Members List */}
          {showMemberList && (
            <View style={styles.membersList}>
              <Text style={styles.membersTitle}>
                Team Members ({userTeamDetails.members.length})
              </Text>
              {userTeamDetails.members.map((member) => (
                <View key={member.userId} style={styles.memberItem}>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {member.user.username}
                    </Text>
                    <Text style={styles.memberRole}>{member.role}</Text>
                  </View>
                  {member.userId === userTeamDetails.ownerId && (
                    <Ionicons
                      name="star"
                      size={16}
                      color={theme.colors.accent}
                    />
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Transfer Ownership Form */}
          {showTransferForm && (
            <View style={styles.transferForm}>
              <Text style={styles.transferTitle}>Transfer Ownership</Text>
              <Text style={styles.transferDescription}>
                Enter the username of the team member you want to transfer
                ownership to:
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.textInput}
                  value={transferUsername}
                  onChangeText={setTransferUsername}
                  placeholder="Enter username"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.transferActions}>
                <Button
                  title="Cancel"
                  onPress={() => {
                    setShowTransferForm(false);
                    setTransferUsername("");
                  }}
                  variant="outline"
                />
                <Button
                  title="Send Request"
                  onPress={handleTransferOwnership}
                />
              </View>
            </View>
          )}
        </View>
      ) : (
        /* No Team - Show Create/Join Options */
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Join or Create a Team</Text>
          <Text style={styles.sectionDescription}>
            Teams allow you to collaborate and compete for territories together.
          </Text>

          <TouchableOpacity
            style={styles.createTeamButton}
            onPress={() => setShowCreateForm(!showCreateForm)}
          >
            <Ionicons
              name="add-circle"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={styles.createTeamButtonText}>Create New Team</Text>
          </TouchableOpacity>

          {/* Create Team Form */}
          {showCreateForm && (
            <View style={styles.createForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Team Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newTeamName}
                  onChangeText={setNewTeamName}
                  placeholder="Enter team name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={newTeamDescription}
                  onChangeText={setNewTeamDescription}
                  placeholder="Enter team description"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Team Color</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.colorPicker}
                >
                  {predefinedColors.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        selectedColor === color && styles.selectedColor,
                      ]}
                      onPress={() => setSelectedColor(color)}
                    />
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formActions}>
                <Button
                  title="Cancel"
                  onPress={() => {
                    setShowCreateForm(false);
                    setNewTeamName("");
                    setNewTeamDescription("");
                    setSelectedColor("#FF6B6B");
                  }}
                  variant="outline"
                />
                <Button title="Create Team" onPress={handleCreateTeam} />
              </View>
            </View>
          )}
        </View>
      )}

      {/* Pending Ownership Transfers */}
      {ownershipTransfers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ownership Transfer Requests</Text>
          {ownershipTransfers.map((transfer) => (
            <View key={transfer.id} style={styles.transferCard}>
              <View style={styles.transferHeader}>
                <Text style={styles.transferTeamName}>{transfer.teamName}</Text>
                <Text style={styles.transferStatus}>Pending</Text>
              </View>
              <Text style={styles.transferDescription}>
                {transfer.currentOwnerUsername} wants to transfer ownership to
                you
              </Text>
              <Text style={styles.transferDate}>
                Requested: {new Date(transfer.createdAt).toLocaleDateString()}
              </Text>

              <View style={styles.transferActions}>
                <Button
                  title="Decline"
                  onPress={() =>
                    handleOwnershipTransferResponse(transfer.id, false)
                  }
                  variant="outline"
                />
                <Button
                  title="Accept"
                  onPress={() =>
                    handleOwnershipTransferResponse(transfer.id, true)
                  }
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Available Teams to Join */}
      {availableTeams.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Teams</Text>
          {availableTeams.map((team) => (
            <View
              key={team.id}
              style={[
                styles.teamCard,
                { borderLeftColor: team.color || "#FF6B6B" },
              ]}
            >
              <View style={styles.teamHeader}>
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>{team.name}</Text>
                  {team.description ? (
                    <Text style={styles.teamDescription}>
                      {team.description}
                    </Text>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.colorIndicator,
                    { backgroundColor: team.color || "#FF6B6B" },
                  ]}
                />
              </View>

              <View style={styles.teamStats}>
                <View style={styles.statItem}>
                  <Ionicons
                    name="people"
                    size={16}
                    color={theme.colors.textLight}
                  />
                  <Text style={styles.statText}>
                    {team.memberCount || team.members || 0} members
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons
                    name="location"
                    size={16}
                    color={theme.colors.textLight}
                  />
                  <Text style={styles.statText}>
                    {team.territories || 0} territories
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="star" size={16} color={theme.colors.accent} />
                  <Text style={styles.statText}>
                    {team.owner.username} (Owner)
                  </Text>
                </View>
              </View>

              <View style={styles.teamActions}>
                <Button
                  title="Join Team"
                  onPress={() => handleJoinTeam(team.id)}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* No Teams Available */}
      {!userTeamDetails && availableTeams.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons
            name="people-outline"
            size={64}
            color={theme.colors.textLight}
          />
          <Text style={styles.emptyStateTitle}>No Teams Available</Text>
          <Text style={styles.emptyStateDescription}>
            Be the first to create a team and start your territory conquest!
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  sectionDescription: {
    fontSize: 16,
    color: theme.colors.textLight,
    marginBottom: 16,
  },
  membershipBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.success + "20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  membershipText: {
    marginLeft: 4,
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: "600",
  },
  teamCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  teamHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 4,
  },
  teamDescription: {
    fontSize: 14,
    color: theme.colors.textLight,
    lineHeight: 20,
  },
  colorIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: 12,
  },
  teamStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  statText: {
    marginLeft: 4,
    fontSize: 14,
    color: theme.colors.textLight,
  },
  teamActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
  },
  actionButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "500",
  },
  leaveButton: {
    backgroundColor: theme.colors.error + "20",
  },
  membersList: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  membersTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 12,
  },
  memberItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
  },
  memberRole: {
    fontSize: 12,
    color: theme.colors.textLight,
    textTransform: "capitalize",
  },
  transferForm: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  transferTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 8,
  },
  transferDescription: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  transferActions: {
    flexDirection: "row",
    gap: 12,
  },
  createTeamButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: "dashed",
    marginBottom: 16,
  },
  createTeamButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  createForm: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  colorPicker: {
    paddingVertical: 8,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedColor: {
    borderColor: theme.colors.text,
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  transferCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  transferHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  transferTeamName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  transferStatus: {
    fontSize: 12,
    color: theme.colors.accent,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  transferDate: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: theme.colors.textLight,
    textAlign: "center",
    lineHeight: 20,
  },
});
