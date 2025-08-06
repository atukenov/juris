import { api } from "./apiClient";

export interface Capture {
  id: string;
  territory_id: string;
  user_id: string;
  team_id: string;
  captured_at: string;
  released_at?: string;
  points_earned: number;
  is_active: boolean;
  territory?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    username: string;
  };
  team?: {
    id: string;
    name: string;
    color: string;
  };
}

export interface CaptureRequest {
  territory_id: string;
  latitude: number;
  longitude: number;
}

export const captureService = {
  async captureTerritory(captureData: CaptureRequest) {
    const { data } = await api.post<Capture>("/captures", captureData);
    return data;
  },

  async getActiveCaptures() {
    const { data } = await api.get<Capture[]>("/captures/active");
    return data;
  },

  async getCaptureHistory() {
    const { data } = await api.get<Capture[]>("/captures/history");
    return data;
  },

  async releaseCapture(captureId: string) {
    const { data } = await api.delete<{ message: string }>(
      `/captures/${captureId}`
    );
    return data;
  },
};
