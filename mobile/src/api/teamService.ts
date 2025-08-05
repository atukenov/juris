import { api } from "./apiClient";

export interface Team {
  id: string;
  name: string;
  members: number;
  territories: number;
}

export const teamService = {
  async getTeams() {
    const { data } = await api.get<Team[]>("/teams");
    return data;
  },

  async joinTeam(teamId: string) {
    const { data } = await api.post<Team>(`/teams/${teamId}/join`);
    return data;
  },

  async leaveTeam(teamId: string) {
    const { data } = await api.post<Team>(`/teams/${teamId}/leave`);
    return data;
  },

  async createTeam(name: string) {
    const { data } = await api.post<Team>("/teams", { name });
    return data;
  },
};
