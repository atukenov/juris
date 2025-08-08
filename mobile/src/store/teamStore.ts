import { create } from "zustand";
import {
  Team,
  TeamDetails,
  OwnershipTransfer,
  CreateTeamData,
  UpdateTeamData,
  teamService,
} from "../api/teamService";

interface TeamState {
  teams: Team[];
  currentTeam: Team | null;
  teamDetails: TeamDetails | null;
  availableColors: string[];
  pendingTransfers: OwnershipTransfer[];
  isLoading: boolean;
  error: string | null;

  // Team management
  fetchTeams: () => Promise<void>;
  getTeamById: (teamId: string) => Promise<void>;
  createTeam: (teamData: CreateTeamData) => Promise<void>;
  updateTeam: (teamId: string, teamData: UpdateTeamData) => Promise<void>;
  joinTeam: (teamId: string) => Promise<void>;
  leaveTeam: (teamId: string) => Promise<void>;

  // Color management
  fetchAvailableColors: () => Promise<void>;

  // Ownership management
  fetchPendingTransfers: () => Promise<void>;
  transferOwnership: (teamId: string, newOwnerId: string) => Promise<void>;
  acceptOwnership: (transferId: string) => Promise<void>;
  rejectOwnership: (transferId: string) => Promise<void>;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  currentTeam: null,
  teamDetails: null,
  availableColors: [],
  pendingTransfers: [],
  isLoading: false,
  error: null,

  fetchTeams: async () => {
    set({ isLoading: true, error: null });
    try {
      const teams = await teamService.getTeams();
      set({ teams, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch teams",
        isLoading: false,
      });
    }
  },

  getTeamById: async (teamId: string) => {
    set({ isLoading: true, error: null });
    try {
      const teamDetails = await teamService.getTeamById(teamId);
      set({ teamDetails, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch team details",
        isLoading: false,
      });
    }
  },

  createTeam: async (teamData: CreateTeamData) => {
    set({ isLoading: true, error: null });
    try {
      const team = await teamService.createTeam(teamData);
      set((state) => ({
        teams: [...state.teams, team],
        currentTeam: team,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to create team",
        isLoading: false,
      });
    }
  },

  updateTeam: async (teamId: string, teamData: UpdateTeamData) => {
    set({ isLoading: true, error: null });
    try {
      const updatedTeam = await teamService.updateTeam(teamId, teamData);
      set((state) => ({
        teams: state.teams.map((t) => (t.id === teamId ? updatedTeam : t)),
        currentTeam:
          state.currentTeam?.id === teamId ? updatedTeam : state.currentTeam,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to update team",
        isLoading: false,
      });
    }
  },

  joinTeam: async (teamId: string) => {
    set({ isLoading: true, error: null });
    try {
      await teamService.joinTeam(teamId);
      // Refresh teams to get updated member count
      await get().fetchTeams();
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to join team",
        isLoading: false,
      });
    }
  },

  leaveTeam: async (teamId: string) => {
    set({ isLoading: true, error: null });
    try {
      await teamService.leaveTeam(teamId);
      set((state) => ({
        currentTeam:
          state.currentTeam?.id === teamId ? null : state.currentTeam,
        isLoading: false,
      }));
      // Refresh teams
      await get().fetchTeams();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to leave team",
        isLoading: false,
      });
    }
  },

  fetchAvailableColors: async () => {
    try {
      const colors = await teamService.getAvailableColors();
      set({ availableColors: colors });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch colors",
      });
    }
  },

  fetchPendingTransfers: async () => {
    try {
      const pendingTransfers = await teamService.getPendingTransfers();
      set({ pendingTransfers });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch pending transfers",
      });
    }
  },

  transferOwnership: async (teamId: string, newOwnerId: string) => {
    set({ isLoading: true, error: null });
    try {
      await teamService.transferOwnership(teamId, newOwnerId);
      set({ isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to transfer ownership",
        isLoading: false,
      });
    }
  },

  acceptOwnership: async (transferId: string) => {
    set({ isLoading: true, error: null });
    try {
      await teamService.acceptOwnership(transferId);
      // Refresh data
      await get().fetchTeams();
      await get().fetchPendingTransfers();
      set({ isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to accept ownership",
        isLoading: false,
      });
    }
  },

  rejectOwnership: async (transferId: string) => {
    set({ isLoading: true, error: null });
    try {
      await teamService.rejectOwnership(transferId);
      // Refresh pending transfers
      await get().fetchPendingTransfers();
      set({ isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to reject ownership",
        isLoading: false,
      });
    }
  },
}));
