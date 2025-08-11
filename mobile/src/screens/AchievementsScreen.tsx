import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGamificationStore } from '../store/gamificationStore';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { theme } from '../theme/theme';
import { Achievement } from '../api/gamificationService';

const AchievementItem = ({ achievement }: { achievement: Achievement }) => {
  const getIconName = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      'flag': 'flag',
      'target': 'target',
      'trophy': 'trophy',
      'fitness': 'fitness',
      'calendar': 'calendar',
      'people': 'people',
      'flash': 'flash',
      'medal': 'medal'
    };
    return iconMap[iconName] || 'star';
  };

  return (
    <View style={[styles.achievementItem, achievement.isCompleted && styles.completedItem]}>
      <View style={styles.achievementIcon}>
        <Ionicons 
          name={getIconName(achievement.icon)} 
          size={32} 
          color={achievement.isCompleted ? theme.colors.primary : theme.colors.textLight} 
        />
      </View>
      
      <View style={styles.achievementContent}>
        <Text style={[styles.achievementName, achievement.isCompleted && styles.completedText]}>
          {achievement.name}
        </Text>
        <Text style={styles.achievementDescription}>
          {achievement.description}
        </Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${achievement.progressPercentage}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {achievement.progress}/{achievement.requirementValue}
          </Text>
        </View>
        
        <View style={styles.rewardContainer}>
          <Ionicons name="star" size={16} color={theme.colors.warning} />
          <Text style={styles.rewardText}>{achievement.pointsReward} points</Text>
        </View>
      </View>
      
      {achievement.isCompleted && (
        <View style={styles.completedBadge}>
          <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
        </View>
      )}
    </View>
  );
};

export const AchievementsScreen = () => {
  const { achievements, isLoadingAchievements, fetchAchievements, error } = useGamificationStore();

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const completedAchievements = achievements.filter(a => a.isCompleted);
  const inProgressAchievements = achievements.filter(a => !a.isCompleted);

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={isLoadingAchievements} />
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={[...completedAchievements, ...inProgressAchievements]}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <AchievementItem achievement={item} />}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContainer: {
    padding: theme.spacing.md,
  },
  achievementItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  completedItem: {
    backgroundColor: theme.colors.success + '10',
    borderWidth: 1,
    borderColor: theme.colors.success + '30',
  },
  achievementIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  achievementContent: {
    flex: 1,
  },
  achievementName: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  completedText: {
    color: theme.colors.success,
  },
  achievementDescription: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.sm,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    marginRight: theme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
    minWidth: 50,
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.warning,
    marginLeft: theme.spacing.xs,
    fontWeight: '600',
  },
  completedBadge: {
    marginLeft: theme.spacing.sm,
  },
  errorContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.error + '10',
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
  },
});
