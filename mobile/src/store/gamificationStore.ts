import { create } from 'zustand';
import { gamificationService, UserLevel, Achievement, Challenge, UserStats, RankingEntry } from '../api/gamificationService';

interface GamificationState {
  userLevel: UserLevel | null;
  isLoadingLevel: boolean;
  
  achievements: Achievement[];
  isLoadingAchievements: boolean;
  
  challenges: Challenge[];
  isLoadingChallenges: boolean;
  
  userStats: UserStats | null;
  isLoadingStats: boolean;
  
  userRankings: RankingEntry[];
  teamRankings: RankingEntry[];
  isLoadingRankings: boolean;
  
  error: string | null;
  
  fetchUserLevel: () => Promise<void>;
  fetchAchievements: () => Promise<void>;
  fetchChallenges: () => Promise<void>;
  fetchUserStats: () => Promise<void>;
  fetchRankings: (type?: 'global' | 'weekly' | 'monthly') => Promise<void>;
  clearError: () => void;
  refreshAll: () => Promise<void>;
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  userLevel: null,
  isLoadingLevel: false,
  achievements: [],
  isLoadingAchievements: false,
  challenges: [],
  isLoadingChallenges: false,
  userStats: null,
  isLoadingStats: false,
  userRankings: [],
  teamRankings: [],
  isLoadingRankings: false,
  error: null,

  fetchUserLevel: async () => {
    set({ isLoadingLevel: true, error: null });
    try {
      const userLevel = await gamificationService.getUserLevel();
      set({ userLevel, isLoadingLevel: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch user level',
        isLoadingLevel: false 
      });
    }
  },

  fetchAchievements: async () => {
    set({ isLoadingAchievements: true, error: null });
    try {
      const achievements = await gamificationService.getUserAchievements();
      set({ achievements, isLoadingAchievements: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch achievements',
        isLoadingAchievements: false 
      });
    }
  },

  fetchChallenges: async () => {
    set({ isLoadingChallenges: true, error: null });
    try {
      const challenges = await gamificationService.getUserChallenges();
      set({ challenges, isLoadingChallenges: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch challenges',
        isLoadingChallenges: false 
      });
    }
  },

  fetchUserStats: async () => {
    set({ isLoadingStats: true, error: null });
    try {
      const userStats = await gamificationService.getUserStats();
      set({ userStats, isLoadingStats: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch user stats',
        isLoadingStats: false 
      });
    }
  },

  fetchRankings: async (type = 'global') => {
    set({ isLoadingRankings: true, error: null });
    try {
      const [userRankings, teamRankings] = await Promise.all([
        gamificationService.getRankings(type, 'user'),
        gamificationService.getRankings(type, 'team')
      ]);
      set({ userRankings, teamRankings, isLoadingRankings: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch rankings',
        isLoadingRankings: false 
      });
    }
  },

  clearError: () => set({ error: null }),

  refreshAll: async () => {
    const { fetchUserLevel, fetchAchievements, fetchChallenges, fetchUserStats, fetchRankings } = get();
    await Promise.all([
      fetchUserLevel(),
      fetchAchievements(),
      fetchChallenges(),
      fetchUserStats(),
      fetchRankings()
    ]);
  },
}));
