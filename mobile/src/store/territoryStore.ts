import { create } from "zustand";
import {
  Territory,
  territoryService,
  NearbyTerritoriesParams,
} from "../api/territoryService";

interface TerritoryState {
  territories: Territory[];
  nearbyTerritories: Territory[];
  selectedTerritory: Territory | null;
  isLoading: boolean;
  error: string | null;
  fetchTerritories: () => Promise<void>;
  fetchNearbyTerritories: (params: NearbyTerritoriesParams) => Promise<void>;
  selectTerritory: (territory: Territory | null) => void;
  getTerritory: (id: string) => Promise<Territory | null>;
}

export const useTerritoryStore = create<TerritoryState>((set, get) => ({
  territories: [],
  nearbyTerritories: [],
  selectedTerritory: null,
  isLoading: false,
  error: null,

  fetchTerritories: async () => {
    set({ isLoading: true, error: null });
    try {
      const territories = await territoryService.getTerritories();
      set({ territories, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch territories",
        isLoading: false,
      });
    }
  },

  fetchNearbyTerritories: async (params: NearbyTerritoriesParams) => {
    set({ isLoading: true, error: null });
    try {
      const nearbyTerritories = await territoryService.getNearbyTerritories(
        params
      );
      set({ nearbyTerritories, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch nearby territories",
        isLoading: false,
      });
    }
  },

  selectTerritory: (territory: Territory | null) => {
    set({ selectedTerritory: territory });
  },

  getTerritory: async (id: string) => {
    try {
      const territory = await territoryService.getTerritory(id);
      return territory;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch territory",
      });
      return null;
    }
  },
}));
