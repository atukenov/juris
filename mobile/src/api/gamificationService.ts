import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface UserLevel {
  currentLevel: number;
  totalExperience: number;
  experienceToNextLevel: number;
}

export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  pointsReward: number;
  progress: number;
  isCompleted: boolean;
  unlockedAt?: string;
  requirementValue: number;
  progressPercentage: number;
}

export interface Challenge {
  id: number;
  name: string;
  description: string;
  challengeType: 'daily' | 'weekly';
  category: string;
  pointsReward: number;
  startDate: string;
  endDate: string;
  progress: number;
  isCompleted: boolean;
  completedAt?: string;
  requirementValue: number;
  progressPercentage: number;
}

export interface UserStats {
  territoriesCaptured: number;
  totalPoints: number;
  totalDistance: number;
  activeDays: number;
  currentLevel: number;
  globalRank?: number;
  weeklyRank?: number;
}

export interface RankingEntry {
  id: string;
  name?: string;
  username?: string;
  totalPoints: number;
  weeklyPoints: number;
  monthlyPoints: number;
  rank: number;
  currentLevel?: number;
  color?: string;
}

const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export const gamificationService = {
  async getUserLevel(): Promise<UserLevel> {
    const response = await fetch(`${API_URL}/api/gamification/level`, {
      headers: await getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch user level');
    return response.json();
  },

  async getUserAchievements(): Promise<Achievement[]> {
    const response = await fetch(`${API_URL}/api/gamification/achievements`, {
      headers: await getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch achievements');
    return response.json();
  },

  async getUserChallenges(): Promise<Challenge[]> {
    const response = await fetch(`${API_URL}/api/gamification/challenges`, {
      headers: await getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch challenges');
    return response.json();
  },

  async getUserStats(): Promise<UserStats> {
    const response = await fetch(`${API_URL}/api/gamification/stats`, {
      headers: await getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch user stats');
    return response.json();
  },

  async getRankings(type: 'global' | 'weekly' | 'monthly' = 'global', category: 'user' | 'team' = 'user', limit: number = 50): Promise<RankingEntry[]> {
    const response = await fetch(`${API_URL}/api/gamification/rankings?type=${type}&category=${category}&limit=${limit}`, {
      headers: await getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch rankings');
    return response.json();
  },
};
