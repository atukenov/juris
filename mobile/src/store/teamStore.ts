import { create } from "zustand";
import { Team, teamService } from "../api/teamService";

interface TeamState {
  teams: Team[];
  currentTeam: Team | null;
  isLoading: boolean;
  error: string | null;
  fetchTeams: () => Promise<void>;
  joinTeam: (teamId: string) => Promise<void>;
  leaveTeam: (teamId: string) => Promise<void>;
  createTeam: (name: string) => Promise<void>;
}

export const useTeamStore = create<TeamState>((set) => ({
  teams: [],
  currentTeam: null,
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

  joinTeam: async (teamId) => {
    set({ isLoading: true, error: null });
    try {
      const team = await teamService.joinTeam(teamId);
      set((state) => ({
        currentTeam: team,
        teams: state.teams.map((t) => (t.id === team.id ? team : t)),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to join team",
        isLoading: false,
      });
    }
  },

  leaveTeam: async (teamId) => {
    set({ isLoading: true, error: null });
    try {
      await teamService.leaveTeam(teamId);
      set((state) => ({
        currentTeam: null,
        teams: state.teams.filter((t) => t.id !== teamId),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to leave team",
        isLoading: false,
      });
    }
  },

  createTeam: async (name) => {
    set({ isLoading: true, error: null });
    try {
      const team = await teamService.createTeam(name);
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
}));
