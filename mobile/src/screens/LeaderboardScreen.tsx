import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGamificationStore } from '../store/gamificationStore';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { theme } from '../theme/theme';
import { RankingEntry } from '../api/gamificationService';

type RankingType = 'global' | 'weekly' | 'monthly';
type RankingCategory = 'user' | 'team';

const RankingItem = ({ entry, category }: { entry: RankingEntry; category: RankingCategory }) => {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return { name: 'trophy', color: '#FFD700' };
    if (rank === 2) return { name: 'medal', color: '#C0C0C0' };
    if (rank === 3) return { name: 'medal', color: '#CD7F32' };
    return { name: 'ribbon', color: theme.colors.textLight };
  };

  const rankIcon = getRankIcon(entry.rank);

  return (
    <View style={styles.rankingItem}>
      <View style={styles.rankContainer}>
        <Ionicons name={rankIcon.name as any} size={24} color={rankIcon.color} />
        <Text style={styles.rankText}>#{entry.rank}</Text>
      </View>
      
      <View style={styles.entryContent}>
        <Text style={styles.entryName}>
          {category === 'team' ? entry.name : entry.username}
        </Text>
        {category === 'user' && entry.currentLevel && (
          <Text style={styles.levelText}>Level {entry.currentLevel}</Text>
        )}
        <Text style={styles.pointsText}>{entry.totalPoints} points</Text>
      </View>
      
      {category === 'team' && entry.color && (
        <View style={[styles.teamColor, { backgroundColor: entry.color }]} />
      )}
    </View>
  );
};

export const LeaderboardScreen = () => {
  const { userRankings, teamRankings, isLoadingRankings, fetchRankings, error } = useGamificationStore();
  const [selectedType, setSelectedType] = useState<RankingType>('global');
  const [selectedCategory, setSelectedCategory] = useState<RankingCategory>('user');

  useEffect(() => {
    fetchRankings(selectedType);
  }, [selectedType, fetchRankings]);

  const currentRankings = selectedCategory === 'user' ? userRankings : teamRankings;

  const TypeButton = ({ type, label }: { type: RankingType; label: string }) => (
    <TouchableOpacity
      style={[styles.typeButton, selectedType === type && styles.activeTypeButton]}
      onPress={() => setSelectedType(type)}
    >
      <Text style={[styles.typeButtonText, selectedType === type && styles.activeTypeButtonText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const CategoryButton = ({ category, label }: { category: RankingCategory; label: string }) => (
    <TouchableOpacity
      style={[styles.categoryButton, selectedCategory === category && styles.activeCategoryButton]}
      onPress={() => setSelectedCategory(category)}
    >
      <Text style={[styles.categoryButtonText, selectedCategory === category && styles.activeCategoryButtonText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={isLoadingRankings} />
      
      {/* Type Selection */}
      <View style={styles.typeContainer}>
        <TypeButton type="global" label="All Time" />
        <TypeButton type="weekly" label="Weekly" />
        <TypeButton type="monthly" label="Monthly" />
      </View>

      {/* Category Selection */}
      <View style={styles.categoryContainer}>
        <CategoryButton category="user" label="Players" />
        <CategoryButton category="team" label="Teams" />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={currentRankings}
        keyExtractor={(item) => `${selectedCategory}-${item.id}`}
        renderItem={({ item }) => <RankingItem entry={item} category={selectedCategory} />}
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
  typeContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  typeButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.xs,
    backgroundColor: theme.colors.background,
  },
  activeTypeButton: {
    backgroundColor: theme.colors.primary,
  },
  typeButtonText: {
    textAlign: 'center',
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    fontWeight: '600',
  },
  activeTypeButtonText: {
    color: theme.colors.white,
  },
  categoryContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    paddingTop: 0,
    backgroundColor: theme.colors.surface,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.xs,
    backgroundColor: theme.colors.background,
  },
  activeCategoryButton: {
    backgroundColor: theme.colors.secondary,
  },
  categoryButtonText: {
    textAlign: 'center',
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
  },
  activeCategoryButtonText: {
    color: theme.colors.white,
  },
  listContainer: {
    padding: theme.spacing.md,
  },
  rankingItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  rankContainer: {
    alignItems: 'center',
    marginRight: theme.spacing.md,
    minWidth: 60,
  },
  rankText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
    marginTop: theme.spacing.xs,
  },
  entryContent: {
    flex: 1,
  },
  entryName: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  levelText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  pointsText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textLight,
  },
  teamColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
