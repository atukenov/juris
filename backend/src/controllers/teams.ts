import { Request, Response } from 'express';
import { pool } from '../lib/database';

// Predefined team colors
export const TEAM_COLORS = [
  '#FF6B35', // Orange
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA726', // Amber
  '#66BB6A', // Green
  '#EF5350', // Red
  '#AB47BC', // Purple
  '#26A69A', // Cyan
  '#FFCA28', // Yellow
  '#8D6E63', // Brown
  '#78909C', // Blue Grey
  '#FF7043', // Deep Orange
];

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
      // Check if user already owns a team
      const existingOwnedTeamQuery = `
        SELECT id, name FROM teams 
        WHERE owner_id = $1 AND is_active = true
      `;
      const existingOwnedTeamResult = await client.query(
        existingOwnedTeamQuery,
        [ownerId]
      );

      if (existingOwnedTeamResult.rows.length > 0) {
        return res.status(400).json({
          error:
            'You can only own one team at a time. Leave your current team first.',
        });
      }

      // Check if user is already a member of any team
      const existingMembershipQuery = `
        SELECT tm.team_id, t.name 
        FROM team_members tm
        JOIN teams t ON tm.team_id = t.id
        WHERE tm.user_id = $1 AND t.is_active = true
      `;
      const existingMembershipResult = await client.query(
        existingMembershipQuery,
        [ownerId]
      );

      if (existingMembershipResult.rows.length > 0) {
        const existingTeam = existingMembershipResult.rows[0];
        return res.status(400).json({
          error: `You are already a member of team "${existingTeam.name}". Leave your current team first.`,
        });
      }

      // Validate color
      if (color && !TEAM_COLORS.includes(color)) {
        return res.status(400).json({
          error: 'Invalid color. Must be one of the predefined colors.',
        });
      }

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

    // Validate color if provided
    if (color && !TEAM_COLORS.includes(color)) {
      return res.status(400).json({
        error: 'Invalid color. Must be one of the predefined colors.',
      });
    }

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

      // Check if user is already a member of any team
      const existingMembershipQuery = `
        SELECT tm.team_id, t.name 
        FROM team_members tm
        JOIN teams t ON tm.team_id = t.id
        WHERE tm.user_id = $1 AND t.is_active = true
      `;
      const existingMembershipResult = await client.query(
        existingMembershipQuery,
        [userId]
      );

      if (existingMembershipResult.rows.length > 0) {
        const existingTeam = existingMembershipResult.rows[0];
        return res.status(400).json({
          error: `You are already a member of team "${existingTeam.name}". Leave your current team first.`,
        });
      }

      // Check if user is already a member of this specific team
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

// Leave team
export const leaveTeam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const client = await pool.connect();
    try {
      // Start transaction
      await client.query('BEGIN');

      // Check if user is a member of the team
      const memberQuery = `
        SELECT id, role FROM team_members 
        WHERE team_id = $1 AND user_id = $2
      `;
      const memberResult = await client.query(memberQuery, [id, userId]);

      if (memberResult.rows.length === 0) {
        return res
          .status(404)
          .json({ error: 'You are not a member of this team' });
      }

      const membership = memberResult.rows[0];

      // If user is owner, they need to transfer ownership first
      if (membership.role === 'owner') {
        const membersCountQuery = `
          SELECT COUNT(*) as count FROM team_members 
          WHERE team_id = $1 AND role != 'owner'
        `;
        const countResult = await client.query(membersCountQuery, [id]);

        if (parseInt(countResult.rows[0].count) > 0) {
          return res.status(400).json({
            error:
              'You must transfer team ownership before leaving. Use the transfer ownership endpoint first.',
          });
        }

        // If owner is the only member, delete the team
        const deleteTeamQuery = `
          UPDATE teams 
          SET is_active = false, updated_at = NOW()
          WHERE id = $1
        `;
        await client.query(deleteTeamQuery, [id]);
      }

      // Remove user from team
      const leaveQuery = `
        DELETE FROM team_members 
        WHERE team_id = $1 AND user_id = $2
      `;
      await client.query(leaveQuery, [id, userId]);

      await client.query('COMMIT');

      res.json({ message: 'Successfully left team' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Leave team error:', error);
    res.status(500).json({ error: 'Error leaving team' });
  }
};

// Transfer team ownership
export const transferOwnership = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newOwnerId } = req.body;
    const currentOwnerId = req.user?.id;

    if (!currentOwnerId || !newOwnerId) {
      return res
        .status(400)
        .json({ error: 'Current owner and new owner IDs required' });
    }

    const client = await pool.connect();
    try {
      // Start transaction
      await client.query('BEGIN');

      // Verify current user is the owner
      const teamQuery = `
        SELECT id, name, owner_id FROM teams 
        WHERE id = $1 AND is_active = true
      `;
      const teamResult = await client.query(teamQuery, [id]);

      if (teamResult.rows.length === 0) {
        return res.status(404).json({ error: 'Team not found' });
      }

      const team = teamResult.rows[0];
      if (team.owner_id !== parseInt(currentOwnerId)) {
        return res
          .status(403)
          .json({ error: 'Only team owner can transfer ownership' });
      }

      // Verify new owner is a member
      const memberQuery = `
        SELECT id FROM team_members 
        WHERE team_id = $1 AND user_id = $2
      `;
      const memberResult = await client.query(memberQuery, [id, newOwnerId]);

      if (memberResult.rows.length === 0) {
        return res
          .status(400)
          .json({ error: 'New owner must be a team member' });
      }

      // Check if new owner already owns a team
      const newOwnerTeamQuery = `
        SELECT id FROM teams 
        WHERE owner_id = $1 AND is_active = true AND id != $2
      `;
      const newOwnerTeamResult = await client.query(newOwnerTeamQuery, [
        newOwnerId,
        id,
      ]);

      if (newOwnerTeamResult.rows.length > 0) {
        return res.status(400).json({
          error:
            'New owner already owns another team. They must leave their current team first.',
        });
      }

      // Create ownership transfer request
      const transferRequestQuery = `
        INSERT INTO team_ownership_transfers (
          team_id, 
          current_owner_id, 
          new_owner_id, 
          status, 
          created_at
        )
        VALUES ($1, $2, $3, 'pending', NOW())
        RETURNING id
      `;
      const transferResult = await client.query(transferRequestQuery, [
        id,
        currentOwnerId,
        newOwnerId,
      ]);

      await client.query('COMMIT');

      res.status(201).json({
        message:
          'Ownership transfer request sent. The new owner must accept it.',
        transferId: transferResult.rows[0].id,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Transfer ownership error:', error);
    res.status(500).json({ error: 'Error transferring ownership' });
  }
};

// Accept ownership transfer
export const acceptOwnership = async (req: Request, res: Response) => {
  try {
    const { transferId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const client = await pool.connect();
    try {
      // Start transaction
      await client.query('BEGIN');

      // Get transfer request
      const transferQuery = `
        SELECT 
          tot.id,
          tot.team_id,
          tot.current_owner_id,
          tot.new_owner_id,
          tot.status,
          t.name as team_name
        FROM team_ownership_transfers tot
        JOIN teams t ON tot.team_id = t.id
        WHERE tot.id = $1 AND tot.status = 'pending'
      `;
      const transferResult = await client.query(transferQuery, [transferId]);

      if (transferResult.rows.length === 0) {
        return res
          .status(404)
          .json({ error: 'Transfer request not found or already processed' });
      }

      const transfer = transferResult.rows[0];

      if (transfer.new_owner_id !== parseInt(userId)) {
        return res
          .status(403)
          .json({ error: 'You are not the designated new owner' });
      }

      // Check if new owner already owns a team
      const existingTeamQuery = `
        SELECT id FROM teams 
        WHERE owner_id = $1 AND is_active = true AND id != $2
      `;
      const existingTeamResult = await client.query(existingTeamQuery, [
        userId,
        transfer.team_id,
      ]);

      if (existingTeamResult.rows.length > 0) {
        return res.status(400).json({
          error: 'You already own another team. Leave your current team first.',
        });
      }

      // Update team ownership
      const updateTeamQuery = `
        UPDATE teams 
        SET owner_id = $1, updated_at = NOW()
        WHERE id = $2
      `;
      await client.query(updateTeamQuery, [userId, transfer.team_id]);

      // Update team member roles
      const updateOldOwnerQuery = `
        UPDATE team_members 
        SET role = 'member'
        WHERE team_id = $1 AND user_id = $2
      `;
      await client.query(updateOldOwnerQuery, [
        transfer.team_id,
        transfer.current_owner_id,
      ]);

      const updateNewOwnerQuery = `
        UPDATE team_members 
        SET role = 'owner'
        WHERE team_id = $1 AND user_id = $2
      `;
      await client.query(updateNewOwnerQuery, [transfer.team_id, userId]);

      // Update transfer status
      const updateTransferQuery = `
        UPDATE team_ownership_transfers 
        SET status = 'accepted', updated_at = NOW()
        WHERE id = $1
      `;
      await client.query(updateTransferQuery, [transferId]);

      await client.query('COMMIT');

      res.json({
        message: `You are now the owner of team "${transfer.team_name}"`,
        teamId: transfer.team_id,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Accept ownership error:', error);
    res.status(500).json({ error: 'Error accepting ownership' });
  }
};

// Reject ownership transfer
export const rejectOwnership = async (req: Request, res: Response) => {
  try {
    const { transferId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const client = await pool.connect();
    try {
      // Get transfer request
      const transferQuery = `
        SELECT id, new_owner_id, status
        FROM team_ownership_transfers 
        WHERE id = $1 AND status = 'pending'
      `;
      const transferResult = await client.query(transferQuery, [transferId]);

      if (transferResult.rows.length === 0) {
        return res
          .status(404)
          .json({ error: 'Transfer request not found or already processed' });
      }

      const transfer = transferResult.rows[0];

      if (transfer.new_owner_id !== parseInt(userId)) {
        return res
          .status(403)
          .json({ error: 'You are not the designated new owner' });
      }

      // Update transfer status
      const updateTransferQuery = `
        UPDATE team_ownership_transfers 
        SET status = 'rejected', updated_at = NOW()
        WHERE id = $1
      `;
      await client.query(updateTransferQuery, [transferId]);

      res.json({ message: 'Ownership transfer rejected' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Reject ownership error:', error);
    res.status(500).json({ error: 'Error rejecting ownership' });
  }
};

// Get pending ownership transfers for user
export const getPendingTransfers = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const client = await pool.connect();
    try {
      const transfersQuery = `
        SELECT 
          tot.id,
          tot.team_id,
          tot.created_at,
          t.name as team_name,
          u.username as current_owner_username
        FROM team_ownership_transfers tot
        JOIN teams t ON tot.team_id = t.id
        JOIN users u ON tot.current_owner_id = u.id
        WHERE tot.new_owner_id = $1 AND tot.status = 'pending'
        ORDER BY tot.created_at DESC
      `;
      const transfersResult = await client.query(transfersQuery, [userId]);

      res.json(
        transfersResult.rows.map((row) => ({
          id: row.id,
          teamId: row.team_id,
          teamName: row.team_name,
          currentOwnerUsername: row.current_owner_username,
          createdAt: row.created_at,
        }))
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get pending transfers error:', error);
    res.status(500).json({ error: 'Error fetching pending transfers' });
  }
};

// Get available team colors
export const getAvailableColors = async (req: Request, res: Response) => {
  try {
    res.json({ colors: TEAM_COLORS });
  } catch (error) {
    console.error('Get available colors error:', error);
    res.status(500).json({ error: 'Error fetching available colors' });
  }
};

// Delete team (only owner can delete)
export const deleteTeam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const client = await pool.connect();
    try {
      // Start transaction
      await client.query('BEGIN');

      // Check if team exists and user is owner
      const teamQuery = `
        SELECT id, name, owner_id FROM teams 
        WHERE id = $1 AND is_active = true
      `;
      const teamResult = await client.query(teamQuery, [id]);

      if (teamResult.rows.length === 0) {
        return res.status(404).json({ error: 'Team not found' });
      }

      const team = teamResult.rows[0];
      if (team.owner_id !== parseInt(userId)) {
        return res.status(403).json({ 
          error: 'Only team owner can delete the team' 
        });
      }

      // Delete all team members
      const deleteMembersQuery = `
        DELETE FROM team_members WHERE team_id = $1
      `;
      await client.query(deleteMembersQuery, [id]);

      // Mark team as inactive (soft delete)
      const deleteTeamQuery = `
        UPDATE teams 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
      `;
      await client.query(deleteTeamQuery, [id]);

      await client.query('COMMIT');

      res.json({ 
        message: `Team "${team.name}" has been deleted successfully` 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Error deleting team' });
  }
};
