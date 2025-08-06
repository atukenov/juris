import { create } from "zustand";
import { Capture, captureService, CaptureRequest } from "../api/captureService";

interface CaptureState {
  activeCaptures: Capture[];
  captureHistory: Capture[];
  isLoading: boolean;
  error: string | null;
  captureTerritory: (captureData: CaptureRequest) => Promise<Capture | null>;
  fetchActiveCaptures: () => Promise<void>;
  fetchCaptureHistory: () => Promise<void>;
  releaseCapture: (captureId: string) => Promise<void>;
}

export const useCaptureStore = create<CaptureState>((set, get) => ({
  activeCaptures: [],
  captureHistory: [],
  isLoading: false,
  error: null,

  captureTerritory: async (captureData: CaptureRequest) => {
    set({ isLoading: true, error: null });
    try {
      const capture = await captureService.captureTerritory(captureData);
      set((state: CaptureState) => ({
        activeCaptures: [...state.activeCaptures, capture],
        isLoading: false,
      }));
      return capture;
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to capture territory",
        isLoading: false,
      });
      return null;
    }
  },

  fetchActiveCaptures: async () => {
    set({ isLoading: true, error: null });
    try {
      const activeCaptures = await captureService.getActiveCaptures();
      set({ activeCaptures, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch active captures",
        isLoading: false,
      });
    }
  },

  fetchCaptureHistory: async () => {
    set({ isLoading: true, error: null });
    try {
      const captureHistory = await captureService.getCaptureHistory();
      set({ captureHistory, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch capture history",
        isLoading: false,
      });
    }
  },

  releaseCapture: async (captureId: string) => {
    set({ isLoading: true, error: null });
    try {
      await captureService.releaseCapture(captureId);
      set((state: CaptureState) => ({
        activeCaptures: state.activeCaptures.filter(
          (c: Capture) => c.id !== captureId
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to release capture",
        isLoading: false,
      });
    }
  },
}));
