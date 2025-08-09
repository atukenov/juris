import { createAdapter } from '@socket.io/redis-adapter';
import { Server } from 'http';
import Redis from 'ioredis';
import { Server as SocketServer } from 'socket.io';
import { pool } from '../lib/database';
import jwt from 'jsonwebtoken';

interface LocationData {
  lat: number;
  lng: number;
  accuracy: number;
}

interface CapturePathData {
  pathId: number;
  lat: number;
  lng: number;
}

interface TerritoryCapture {
  points: number;
  capturedBy: {
    userId: number;
    username: string;
  };
}

interface TeamUpdate {
  score?: number;
  rank?: number;
  territories?: number[];
}

export class RealTimeService {
  private io: SocketServer;
  private pubClient: Redis;
  private subClient: Redis;

  constructor(httpServer: Server) {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
      },
    });

    // Redis setup for scaling
    this.pubClient = new Redis(
      process.env.REDIS_URL || 'redis://localhost:6379'
    );
    this.subClient = this.pubClient.duplicate();
    this.io.adapter(createAdapter(this.pubClient, this.subClient));

    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', async (socket) => {
      const userId = this.validateToken(socket.handshake.auth.token);
      if (!userId) {
        socket.disconnect();
        return;
      }

      // Join user's team room
      const userTeam = await this.getUserTeam(String(userId));
      if (userTeam) {
        socket.join(`team:${userTeam.teamId}`);
      }

      // Handle location updates
      socket.on('updateLocation', async (data) => {
        await this.handleLocationUpdate(
          userId,
          userTeam?.teamId,
          socket.id,
          data
        );
      });

      // Handle capture path updates
      socket.on('capturePath', async (data) => {
        await this.handleCapturePathUpdate(userId, userTeam?.teamId, data);
      });

      // Handle chat message
      socket.on('sendMessage', async (data) => {
        await this.handleChatMessage(userId, userTeam?.teamId, data);
      });

      // Handle typing indicator
      socket.on('typing', async (data) => {
        await this.handleTyping(
          userId,
          userTeam?.teamId,
          data.isTyping,
          socket
        );
      });

      // Handle emoji reaction
      socket.on('addReaction', async (data) => {
        await this.handleReaction(userId, userTeam?.teamId, data);
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        await this.handleDisconnect(userId, socket.id);
      });
    });
  }

  private validateToken(token: string): number | null {
    try {
      if (!token) return null;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      return decoded.userId || decoded.id;
    } catch {
      return null;
    }
  }

  private async getUserTeam(userId: string) {
    try {
      const client = await pool.connect();
      try {
        const query = `
          SELECT tm.team_id as "teamId", t.name as "teamName"
          FROM team_members tm
          JOIN teams t ON tm.team_id = t.id
          WHERE tm.user_id = $1 AND t.is_active = true
          LIMIT 1
        `;
        const result = await client.query(query, [userId]);
        return result.rows.length > 0 ? result.rows[0] : null;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error getting user team:', error);
      return null;
    }
  }

  private async handleLocationUpdate(
    userId: number,
    teamId: string | undefined,
    sessionId: string,
    data: LocationData
  ) {
    try {
      if (!teamId) return;

      // For now, just emit location to teammates
      this.io.to(`team:${teamId}`).emit('teamLocation', {
        userId,
        location: data,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Location update error:', error);
    }
  }

  private async handleCapturePathUpdate(
    userId: number,
    teamId: string | undefined,
    data: CapturePathData
  ) {
    try {
      if (!teamId) return;

      // For now, just emit path update to teammates
      this.io.to(`team:${teamId}`).emit('capturePath', {
        userId,
        pathId: data.pathId,
        point: { lat: data.lat, lng: data.lng },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Capture path update error:', error);
    }
  }

  private async handleDisconnect(userId: number, sessionId: string) {
    try {
      const client = await pool.connect();
      try {
        await client.query(
          'DELETE FROM chat_typing WHERE user_id = $1',
          [userId]
        );
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Disconnect handling error:', error);
    }
  }

  // Public methods for external use
  public broadcastTerritoryCapture(
    territoryId: number,
    teamId: number,
    captureData: TerritoryCapture
  ): void {
    this.io.emit('territoryCapture', {
      territoryId,
      teamId,
      ...captureData,
      timestamp: new Date(),
    });
  }

  public broadcastTeamUpdate(teamId: number, updateData: TeamUpdate): void {
    this.io.to(`team:${teamId}`).emit('teamUpdate', {
      ...updateData,
      timestamp: new Date(),
    });
  }

  private async handleChatMessage(
    userId: number,
    teamId: string | undefined,
    data: { message: string }
  ) {
    try {
      console.log('handling chat message');
      if (!teamId) return;

      if (
        !data.message ||
        data.message.trim().length === 0 ||
        data.message.length > 500
      ) {
        return;
      }

      const client = await pool.connect();
      try {
        const insertQuery = `
          INSERT INTO chat_messages (team_id, user_id, message, created_at)
          VALUES ($1, $2, $3, NOW())
          RETURNING id, message, created_at
        `;
        const result = await client.query(insertQuery, [
          teamId,
          userId,
          data.message.trim(),
        ]);
        const message = result.rows[0];

        const userQuery = `SELECT username FROM users WHERE id = $1`;
        const userResult = await client.query(userQuery, [userId]);

        const messageData = {
          id: message.id,
          message: message.message,
          created_at: message.created_at,
          user_id: userId,
          username: userResult.rows[0].username,
          reactions: [],
        };

        this.io.to(`team:${teamId}`).emit('newMessage', messageData);
        
        await this.broadcastUnreadCountUpdate(teamId, userId);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Chat message error:', error);
    }
  }

  private async handleTyping(
    userId: number,
    teamId: string | undefined,
    isTyping: boolean,
    socket: any
  ) {
    try {
      if (!teamId) return;

      const client = await pool.connect();
      try {
        if (isTyping) {
          await client.query(
            `
            INSERT INTO chat_typing (team_id, user_id, started_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (team_id, user_id) DO UPDATE SET started_at = NOW()
          `,
            [teamId, userId]
          );
        } else {
          await client.query(
            `
            DELETE FROM chat_typing WHERE team_id = $1 AND user_id = $2
          `,
            [teamId, userId]
          );
        }

        const typersQuery = `
          SELECT u.username FROM chat_typing ct
          JOIN users u ON ct.user_id = u.id
          WHERE ct.team_id = $1 AND ct.user_id != $2
          AND ct.started_at > NOW() - INTERVAL '10 seconds'
        `;
        const typersResult = await client.query(typersQuery, [teamId, userId]);

        socket.to(`team:${teamId}`).emit('typingUpdate', {
          typers: typersResult.rows.map((row) => row.username),
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Typing indicator error:', error);
    }
  }

  private async handleReaction(
    userId: number,
    teamId: string | undefined,
    data: { messageId: number; emoji: string }
  ) {
    try {
      if (!teamId) return;

      const validEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];
      if (!validEmojis.includes(data.emoji)) return;

      const client = await pool.connect();
      try {
        const verifyQuery = `
          SELECT id FROM chat_messages WHERE id = $1 AND team_id = $2
        `;
        const verifyResult = await client.query(verifyQuery, [
          data.messageId,
          teamId,
        ]);
        if (verifyResult.rows.length === 0) return;

        const existingQuery = `
          SELECT id FROM chat_reactions 
          WHERE message_id = $1 AND user_id = $2 AND emoji = $3
        `;
        const existingResult = await client.query(existingQuery, [
          data.messageId,
          userId,
          data.emoji,
        ]);

        if (existingResult.rows.length > 0) {
          await client.query(
            `
            DELETE FROM chat_reactions 
            WHERE message_id = $1 AND user_id = $2 AND emoji = $3
          `,
            [data.messageId, userId, data.emoji]
          );
        } else {
          await client.query(
            `
            INSERT INTO chat_reactions (message_id, user_id, emoji)
            VALUES ($1, $2, $3)
          `,
            [data.messageId, userId, data.emoji]
          );
        }

        const reactionsQuery = `
          SELECT emoji, COUNT(*) as count, JSON_AGG(u.username) as usernames
          FROM chat_reactions cr
          JOIN users u ON cr.user_id = u.id
          WHERE cr.message_id = $1
          GROUP BY emoji
        `;
        const reactionsResult = await client.query(reactionsQuery, [
          data.messageId,
        ]);

        this.io.to(`team:${teamId}`).emit('reactionUpdate', {
          messageId: data.messageId,
          reactions: reactionsResult.rows,
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Reaction error:', error);
    }
  }

  private async broadcastUnreadCountUpdate(teamId: string, senderUserId: number) {
    try {
      const client = await pool.connect();
      try {
        const membersQuery = `
          SELECT tm.user_id FROM team_members tm
          JOIN teams t ON tm.team_id = t.id
          WHERE tm.team_id = $1 AND tm.user_id != $2 AND t.is_active = true
        `;
        const membersResult = await client.query(membersQuery, [teamId, senderUserId]);
        
        for (const member of membersResult.rows) {
          const countQuery = `
            SELECT COUNT(*) as unread_count
            FROM chat_messages cm
            LEFT JOIN chat_read_status crs ON crs.team_id = cm.team_id AND crs.user_id = $1
            WHERE cm.team_id = $2 
            AND cm.user_id != $1
            AND (crs.last_read_message_id IS NULL OR cm.id > crs.last_read_message_id)
          `;
          const countResult = await client.query(countQuery, [member.user_id, teamId]);
          const unreadCount = parseInt(countResult.rows[0].unread_count);
          
          this.io.to(`team:${teamId}`).emit('unreadCountUpdate', {
            userId: member.user_id,
            unreadCount
          });
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Unread count update error:', error);
    }
  }
}
