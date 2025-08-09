import { Request, Response } from 'express';
import { pool } from '../lib/database';

export const getTeamMessages = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const client = await pool.connect();
    try {
      const teamQuery = `
        SELECT tm.team_id FROM team_members tm
        JOIN teams t ON tm.team_id = t.id
        WHERE tm.user_id = $1 AND t.is_active = true
      `;
      const teamResult = await client.query(teamQuery, [userId]);

      if (teamResult.rows.length === 0) {
        return res.status(403).json({ error: 'You must be in a team to access chat' });
      }

      const teamId = teamResult.rows[0].team_id;

      const messagesQuery = `
        SELECT 
          cm.id, cm.message, cm.created_at,
          u.id as user_id, u.username,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'emoji', cr.emoji,
                'count', cr.reaction_count,
                'users', cr.usernames
              )
            ) FILTER (WHERE cr.emoji IS NOT NULL), 
            '[]'
          ) as reactions
        FROM chat_messages cm
        JOIN users u ON cm.user_id = u.id
        LEFT JOIN (
          SELECT 
            message_id, emoji, 
            COUNT(*) as reaction_count,
            JSON_AGG(u2.username) as usernames
          FROM chat_reactions cr2
          JOIN users u2 ON cr2.user_id = u2.id
          GROUP BY message_id, emoji
        ) cr ON cm.id = cr.message_id
        WHERE cm.team_id = $1
        GROUP BY cm.id, cm.message, cm.created_at, u.id, u.username
        ORDER BY cm.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const messagesResult = await client.query(messagesQuery, [teamId, limit, offset]);
      res.json(messagesResult.rows.reverse());
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Error fetching messages' });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { message } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    if (message.length > 500) {
      return res.status(400).json({ error: 'Message too long (max 500 characters)' });
    }

    const client = await pool.connect();
    try {
      const teamQuery = `
        SELECT tm.team_id FROM team_members tm
        JOIN teams t ON tm.team_id = t.id
        WHERE tm.user_id = $1 AND t.is_active = true
      `;
      const teamResult = await client.query(teamQuery, [userId]);

      if (teamResult.rows.length === 0) {
        return res.status(403).json({ error: 'You must be in a team to send messages' });
      }

      const teamId = teamResult.rows[0].team_id;

      const insertQuery = `
        INSERT INTO chat_messages (team_id, user_id, message, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id, message, created_at
      `;
      const insertResult = await client.query(insertQuery, [teamId, userId, message.trim()]);
      const newMessage = insertResult.rows[0];

      const userQuery = `SELECT username FROM users WHERE id = $1`;
      const userResult = await client.query(userQuery, [userId]);

      const messageData = {
        id: newMessage.id,
        message: newMessage.message,
        created_at: newMessage.created_at,
        user_id: userId,
        username: userResult.rows[0].username,
        reactions: []
      };

      res.status(201).json(messageData);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Error sending message' });
  }
};

export const addReaction = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { messageId } = req.params;
    const { emoji } = req.body;

    const validEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];
    if (!validEmojis.includes(emoji)) {
      return res.status(400).json({ error: 'Invalid emoji' });
    }

    const client = await pool.connect();
    try {
      const verifyQuery = `
        SELECT cm.team_id FROM chat_messages cm
        JOIN team_members tm ON cm.team_id = tm.team_id
        WHERE cm.id = $1 AND tm.user_id = $2
      `;
      const verifyResult = await client.query(verifyQuery, [messageId, userId]);

      if (verifyResult.rows.length === 0) {
        return res.status(403).json({ error: 'Cannot react to this message' });
      }

      const existingQuery = `
        SELECT id FROM chat_reactions 
        WHERE message_id = $1 AND user_id = $2 AND emoji = $3
      `;
      const existingResult = await client.query(existingQuery, [messageId, userId, emoji]);

      if (existingResult.rows.length > 0) {
        await client.query(`
          DELETE FROM chat_reactions 
          WHERE message_id = $1 AND user_id = $2 AND emoji = $3
        `, [messageId, userId, emoji]);
      } else {
        await client.query(`
          INSERT INTO chat_reactions (message_id, user_id, emoji)
          VALUES ($1, $2, $3)
        `, [messageId, userId, emoji]);
      }

      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ error: 'Error adding reaction' });
  }
};
