import { pool } from '../lib/database';

interface NotificationData {
  type: 'team_invite' | 'member_removed' | 'ownership_transfer' | 'territory_captured';
  teamId?: string;
  teamName?: string;
  territoryId?: string;
  capturedBy?: string;
}

interface PushNotification {
  title: string;
  body: string;
  data?: NotificationData;
}

class NotificationService {
  async sendTeamNotification(teamId: string, notification: PushNotification) {
    try {
      const client = await pool.connect();
      try {
        const membersQuery = `
          SELECT u.id, u.username, u.push_token
          FROM team_members tm
          JOIN users u ON tm.user_id = u.id
          WHERE tm.team_id = $1 AND u.push_token IS NOT NULL
        `;
        const membersResult = await client.query(membersQuery, [teamId]);
        
        for (const member of membersResult.rows) {
          console.log(`Sending notification to ${member.username}:`, notification);
          
          await client.query(`
            INSERT INTO notification_logs (user_id, notification_type, title, body, data)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            member.id,
            notification.data?.type || 'general',
            notification.title,
            notification.body,
            JSON.stringify(notification.data || {})
          ]);
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error sending team notification:', error);
    }
  }

  async sendUserNotification(userId: string, notification: PushNotification) {
    try {
      const client = await pool.connect();
      try {
        const userQuery = `SELECT push_token FROM users WHERE id = $1`;
        const userResult = await client.query(userQuery, [userId]);
        
        if (userResult.rows.length > 0 && userResult.rows[0].push_token) {
          console.log(`Sending notification to user ${userId}:`, notification);
          
          await client.query(`
            INSERT INTO notification_logs (user_id, notification_type, title, body, data)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            userId,
            notification.data?.type || 'general',
            notification.title,
            notification.body,
            JSON.stringify(notification.data || {})
          ]);
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error sending user notification:', error);
    }
  }
}

export const notificationService = new NotificationService();
