import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Create a new team
export const createTeam = async (req: Request, res: Response) => {
  try {
    const { name, description, color } = req.body;
    const ownerId = req.user?.id;

    if (!ownerId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const team = await prisma.team.create({
      data: {
        name,
        description,
        color,
        ownerId,
        members: {
          create: {
            userId: ownerId,
            role: 'owner',
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json(team);
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Error creating team' });
  }
};

// Get all teams
export const getTeams = async (req: Request, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      where: {
        isActive: true,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    res.json(teams);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Error fetching teams' });
  }
};

// Get team by ID
export const getTeamById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const team = await prisma.team.findUnique({
      where: {
        id: parseInt(id),
        isActive: true,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json(team);
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Error fetching team' });
  }
};

// Update team
export const updateTeam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, color } = req.body;
    const userId = req.user?.id;

    const team = await prisma.team.findUnique({
      where: { id: parseInt(id) },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (team.ownerId !== userId) {
      return res.status(403).json({ error: 'Only team owner can update team' });
    }

    const updatedTeam = await prisma.team.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        color,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    res.json(updatedTeam);
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ error: 'Error updating team' });
  }
};

// Join team
export const joinTeam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        teamId: parseInt(id),
        userId,
      },
    });

    if (existingMember) {
      return res.status(400).json({ error: 'Already a member of this team' });
    }

    const membership = await prisma.teamMember.create({
      data: {
        teamId: parseInt(id),
        userId,
        role: 'member',
      },
      include: {
        team: true,
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    res.status(201).json(membership);
  } catch (error) {
    console.error('Join team error:', error);
    res.status(500).json({ error: 'Error joining team' });
  }
};
