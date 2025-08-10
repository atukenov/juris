import { api } from "./apiClient";

export interface Team {
  id: string;
  name: string;
  description?: string;
  color?: string;
  ownerId: string;
  owner: {
    id: string;
    username: string;
  };
  members?: number;
  territories?: number;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  userId: string;
  role: "owner" | "member";
  joinedAt: string;
  user: {
    id: string;
    username: string;
  };
}

export interface TeamDetails {
  id: string;
  name: string;
  description?: string;
  color?: string;
  ownerId: string;
  owner: {
    id: string;
    username: string;
  };
  members: TeamMember[];
  territories?: number;
  createdAt: string;
  updatedAt: string;
}

export interface OwnershipTransfer {
  id: string;
  teamId: string;
  teamName: string;
  currentOwnerUsername: string;
  createdAt: string;
}

export interface CreateTeamData {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateTeamData {
  name?: string;
  description?: string;
  color?: string;
}

export const teamService = {
  async getTeams() {
    const { data } = await api.get<Team[]>("/teams");
    return data;
  },

  async getTeamById(teamId: string) {
    const { data } = await api.get<TeamDetails>(`/teams/${teamId}`);
    return data;
  },

  async createTeam(teamData: CreateTeamData) {
    const { data } = await api.post<Team>("/teams", teamData);
    return data;
  },

  async updateTeam(teamId: string, teamData: UpdateTeamData) {
    const { data } = await api.put<Team>(`/teams/${teamId}`, teamData);
    return data;
  },

  async joinTeam(teamId: string) {
    const { data } = await api.post<any>(`/teams/${teamId}/join`);
    return data;
  },

  async leaveTeam(teamId: string) {
    const { data } = await api.post<any>(`/teams/${teamId}/leave`);
    return data;
  },

  async getAvailableColors() {
    const { data } = await api.get<{ colors: string[] }>(
      "/teams/colors/available"
    );
    return data.colors;
  },

  async getPendingTransfers() {
    const { data } = await api.get<OwnershipTransfer[]>(
      "/teams/transfers/pending"
    );
    return data;
  },

  async transferOwnership(teamId: string, newOwnerId: string) {
    const { data } = await api.post<any>(
      `/teams/${teamId}/transfer-ownership`,
      {
        newOwnerId: parseInt(newOwnerId),
      }
    );
    return data;
  },

  async acceptOwnership(transferId: string) {
    const { data } = await api.post<any>(
      `/teams/transfers/${transferId}/accept`
    );
    return data;
  },

  async rejectOwnership(transferId: string) {
    const { data } = await api.post<any>(
      `/teams/transfers/${transferId}/reject`
    );
    return data;
  },

  async deleteTeam(teamId: string) {
    const { data } = await api.delete<any>(`/teams/${teamId}`);
    return data;
  },

  async removeMember(teamId: string, userId: string) {
    const { data } = await api.delete<any>(`/teams/${teamId}/members/${userId}`);
    return data;
  },
};
