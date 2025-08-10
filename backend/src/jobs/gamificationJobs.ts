import { ChallengeService } from '../services/ChallengeService';
import { GamificationService } from '../services/GamificationService';

export class GamificationJobs {
  static async runDailyJobs(): Promise<void> {
    try {
      console.log('Running daily gamification jobs...');
      
      await ChallengeService.cleanupExpiredChallenges();
      
      await ChallengeService.generateDailyChallenges();
      
      await GamificationService.updateRankings();
      
      console.log('Daily gamification jobs completed');
    } catch (error) {
      console.error('Error running daily gamification jobs:', error);
    }
  }

  static async runWeeklyJobs(): Promise<void> {
    try {
      console.log('Running weekly gamification jobs...');
      
      await ChallengeService.generateWeeklyChallenges();
      
      console.log('Weekly gamification jobs completed');
    } catch (error) {
      console.error('Error running weekly gamification jobs:', error);
    }
  }

  static startScheduler(): void {
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        this.runDailyJobs();
        
        if (now.getDay() === 0) {
          this.runWeeklyJobs();
        }
      }
    }, 60000); // Check every minute
    
    console.log('Gamification job scheduler started');
  }
}
