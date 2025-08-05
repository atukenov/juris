import { createAdapter } from '@socket.io/redis-adapter';
import { Server } from 'http';
import Redis from 'ioredis';
import { Server as SocketServer } from 'socket.io';
import { prisma } from '../lib/prisma';

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

      // Handle disconnection
      socket.on('disconnect', async () => {
        await this.handleDisconnect(userId, socket.id);
      });
    });
  }

  private validateToken(token: string): number | null {
    try {
      // Implement JWT validation here
      return 1; // Temporary, replace with actual JWT validation
    } catch {
      return null;
    }
  }

  private async getUserTeam(userId: string) {
    return await prisma.teamMember.findFirst({
      where: { userId, team: { isActive: true } },
    });
  }

  private async handleLocationUpdate(
    userId: number,
    teamId: string | undefined,
    sessionId: string,
    data: LocationData
  ) {
    try {
      // Update user's location in active_runners
      await prisma.$queryRaw`
        INSERT INTO active_runners (
          user_id, team_id, session_id, last_location, last_seen_at
        )
        VALUES (
          ${userId},
          ${teamId},
          ${sessionId},
          ST_SetSRID(ST_MakePoint(${data.lng}, ${data.lat}), 4326),
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (user_id, session_id)
        DO UPDATE SET
          last_location = ST_SetSRID(ST_MakePoint(${data.lng}, ${data.lat}), 4326),
          last_seen_at = CURRENT_TIMESTAMP
      `;

      if (teamId) {
        // Get visible teams
        const visibleTeams = await prisma.team_visibility.findMany({
          where: { team_id: teamId, visibility_type: 'location' },
        });

        // Emit location to teammate and visible teams
        this.io.to(`team:${teamId}`).emit('teamLocation', {
          userId,
          location: data,
          timestamp: new Date(),
        });

        visibleTeams.forEach(({ visible_to_team_id }) => {
          this.io.to(`team:${visible_to_team_id}`).emit('otherTeamLocation', {
            teamId,
            userId,
            location: data,
            timestamp: new Date(),
          });
        });
      }
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
      // Get active session for user
      const activeSession = await prisma.active_runners.findFirst({
        where: { userId },
        orderBy: { last_seen_at: 'desc' },
      });

      if (!activeSession) {
        console.error('No active session found for user:', userId);
        return;
      }

      // Update active capture status
      await prisma.active_runners.update({
        where: {
          userId_sessionId: {
            userId,
            sessionId: activeSession.session_id,
          },
        },
        data: {
          is_capturing: true,
          current_capture_path_id: data.pathId,
        },
      });

      if (teamId) {
        // Emit path update to teammates
        this.io.to(`team:${teamId}`).emit('capturePath', {
          userId,
          pathId: data.pathId,
          point: { lat: data.lat, lng: data.lng },
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error('Capture path update error:', error);
    }
  }

  private async handleDisconnect(userId: number, sessionId: string) {
    try {
      // Remove from active runners
      await prisma.active_runners.delete({
        where: { userId_sessionId: { userId, sessionId } },
      });
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
}
