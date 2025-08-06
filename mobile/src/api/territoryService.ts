import { api } from "./apiClient";

// GeoJSON types
interface Position {
  latitude: number;
  longitude: number;
}

interface Polygon {
  type: "Polygon";
  coordinates: number[][][]; // [longitude, latitude] format
}

export interface Territory {
  id: string;
  name: string;
  description?: string;
  boundary: Polygon;
  team_id?: string;
  team?: {
    id: string;
    name: string;
    color: string;
  };
  created_at: string;
  updated_at: string;
}

export interface NearbyTerritoriesParams {
  latitude: number;
  longitude: number;
  radius?: number; // in meters, default 1000
}

export interface CreateTerritoryData {
  name: string;
  description?: string;
  boundary: Polygon;
}

export const territoryService = {
  async getTerritories() {
    const { data } = await api.get<Territory[]>("/territories");
    return data;
  },

  async getTerritory(id: string) {
    const { data } = await api.get<Territory>(`/territories/${id}`);
    return data;
  },

  async createTerritory(territoryData: CreateTerritoryData) {
    const { data } = await api.post<Territory>("/territories", territoryData);
    return data;
  },

  async getNearbyTerritories(params: NearbyTerritoriesParams) {
    const { data } = await api.get<Territory[]>("/territories/nearby", {
      params,
    });
    return data;
  },
};
