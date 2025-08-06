import { Request, Response } from 'express';
import { pool } from '../lib/database';

// Create a new team
export const createTeam = async (req: Request, res: Response) => {
  try {
    const { name, description, color } = req.body;
    const ownerId = req.user?.id;

    if (!ownerId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const client = await pool.connect();
    try {
      // Start transaction
      await client.query('BEGIN');

      // Create team
      const teamQuery = `
        INSERT INTO teams (name, description, color, owner_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id, name, description, color, owner_id, created_at, updated_at
      `;
      const teamResult = await client.query(teamQuery, [
        name,
        description || null,
        color || null,
        ownerId,
      ]);
      const team = teamResult.rows[0];

      // Add owner as team member
      const memberQuery = `
        INSERT INTO team_members (team_id, user_id, role, joined_at)
        VALUES ($1, $2, 'owner', NOW())
      `;
      await client.query(memberQuery, [team.id, ownerId]);

      // Get owner info
      const ownerQuery = `
        SELECT id, username FROM users WHERE id = $1
      `;
      const ownerResult = await client.query(ownerQuery, [ownerId]);
      const owner = ownerResult.rows[0];

      await client.query('COMMIT');

      res.status(201).json({
        id: team.id,
        name: team.name,
        description: team.description,
        color: team.color,
        ownerId: team.owner_id,
        owner: owner,
        createdAt: team.created_at,
        updatedAt: team.updated_at,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Error creating team' });
  }
};

// Get all teams
export const getTeams = async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    try {
      const teamsQuery = `
        SELECT 
          t.id, t.name, t.description, t.color, t.owner_id, t.created_at, t.updated_at,
          u.id as owner_id_user, u.username as owner_username,
          COUNT(tm.user_id) as member_count
        FROM teams t
        LEFT JOIN users u ON t.owner_id = u.id
        LEFT JOIN team_members tm ON t.id = tm.team_id
        WHERE t.is_active = true
        GROUP BY t.id, u.id, u.username
        ORDER BY t.created_at DESC
      `;
      const teamsResult = await client.query(teamsQuery);

      const teams = teamsResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        color: row.color,
        ownerId: row.owner_id,
        owner: {
          id: row.owner_id_user,
          username: row.owner_username,
        },
        memberCount: parseInt(row.member_count),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      res.json(teams);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Error fetching teams' });
  }
};

// Get team by ID
export const getTeamById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();

    try {
      // Get team with owner info
      const teamQuery = `
        SELECT 
          t.id, t.name, t.description, t.color, t.owner_id, t.created_at, t.updated_at,
          u.id as owner_id_user, u.username as owner_username
        FROM teams t
        LEFT JOIN users u ON t.owner_id = u.id
        WHERE t.id = $1 AND t.is_active = true
      `;
      const teamResult = await client.query(teamQuery, [id]);

      if (teamResult.rows.length === 0) {
        return res.status(404).json({ error: 'Team not found' });
      }

      const teamRow = teamResult.rows[0];

      // Get team members
      const membersQuery = `
        SELECT 
          tm.user_id, tm.role, tm.joined_at,
          u.username
        FROM team_members tm
        LEFT JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = $1
        ORDER BY tm.joined_at ASC
      `;
      const membersResult = await client.query(membersQuery, [id]);

      const team = {
        id: teamRow.id,
        name: teamRow.name,
        description: teamRow.description,
        color: teamRow.color,
        ownerId: teamRow.owner_id,
        owner: {
          id: teamRow.owner_id_user,
          username: teamRow.owner_username,
        },
        members: membersResult.rows.map((member) => ({
          userId: member.user_id,
          role: member.role,
          joinedAt: member.joined_at,
          user: {
            id: member.user_id,
            username: member.username,
          },
        })),
        createdAt: teamRow.created_at,
        updatedAt: teamRow.updated_at,
      };

      res.json(team);
    } finally {
      client.release();
    }
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

    const client = await pool.connect();
    try {
      // Check if team exists and user is owner
      const teamQuery = `
        SELECT id, owner_id FROM teams WHERE id = $1 AND is_active = true
      `;
      const teamResult = await client.query(teamQuery, [id]);

      if (teamResult.rows.length === 0) {
        return res.status(404).json({ error: 'Team not found' });
      }

      const team = teamResult.rows[0];
      if (team.owner_id !== parseInt(userId!)) {
        return res
          .status(403)
          .json({ error: 'Only team owner can update team' });
      }

      // Update team
      const updateQuery = `
        UPDATE teams 
        SET name = COALESCE($1, name), 
            description = COALESCE($2, description), 
            color = COALESCE($3, color),
            updated_at = NOW()
        WHERE id = $4
        RETURNING id, name, description, color, owner_id, created_at, updated_at
      `;
      const updateResult = await client.query(updateQuery, [
        name,
        description,
        color,
        id,
      ]);
      const updatedTeam = updateResult.rows[0];

      // Get owner info
      const ownerQuery = `
        SELECT id, username FROM users WHERE id = $1
      `;
      const ownerResult = await client.query(ownerQuery, [
        updatedTeam.owner_id,
      ]);
      const owner = ownerResult.rows[0];

      res.json({
        id: updatedTeam.id,
        name: updatedTeam.name,
        description: updatedTeam.description,
        color: updatedTeam.color,
        ownerId: updatedTeam.owner_id,
        owner: owner,
        createdAt: updatedTeam.created_at,
        updatedAt: updatedTeam.updated_at,
      });
    } finally {
      client.release();
    }
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

    const client = await pool.connect();
    try {
      // Check if team exists
      const teamQuery = `
        SELECT id, name FROM teams WHERE id = $1 AND is_active = true
      `;
      const teamResult = await client.query(teamQuery, [id]);

      if (teamResult.rows.length === 0) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Check if user is already a member
      const memberQuery = `
        SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2
      `;
      const memberResult = await client.query(memberQuery, [id, userId]);

      if (memberResult.rows.length > 0) {
        return res.status(400).json({ error: 'Already a member of this team' });
      }

      // Add user to team
      const joinQuery = `
        INSERT INTO team_members (team_id, user_id, role, joined_at)
        VALUES ($1, $2, 'member', NOW())
        RETURNING team_id, user_id, role, joined_at
      `;
      const joinResult = await client.query(joinQuery, [id, userId]);
      const membership = joinResult.rows[0];

      // Get user info
      const userQuery = `
        SELECT id, username FROM users WHERE id = $1
      `;
      const userResult = await client.query(userQuery, [userId]);
      const user = userResult.rows[0];

      const team = teamResult.rows[0];

      res.status(201).json({
        teamId: membership.team_id,
        userId: membership.user_id,
        role: membership.role,
        joinedAt: membership.joined_at,
        team: team,
        user: user,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Join team error:', error);
    res.status(500).json({ error: 'Error joining team' });
  }
};
