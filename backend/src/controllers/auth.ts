import * as bcrypt from 'bcryptjs';
import { Request, RequestHandler, Response } from 'express';
import { sign, verify } from 'jsonwebtoken';
import { pool } from '../lib/database';
import {
  ApiResponse,
  AuthenticatedRequest,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from '../types/auth';

type JWTPayload = {
  userId: string;
};

const JWT_EXPIRES_IN = '24h';
const TOKEN_EXPIRY = '1h';

const createAuthToken = (
  userId: string,
  secret: string | undefined
): string => {
  if (!secret) throw new Error('JWT_SECRET is not set');
  return sign({ userId }, secret, { expiresIn: JWT_EXPIRES_IN });
};

const createResetToken = (
  userId: string,
  secret: string | undefined
): string => {
  if (!secret) throw new Error('JWT_SECRET is not set');
  return sign({ userId }, secret, { expiresIn: TOKEN_EXPIRY });
};

const verifyToken = (token: string, secret: string | undefined): JWTPayload => {
  if (!secret) throw new Error('JWT_SECRET is not set');
  return verify(token, secret) as JWTPayload;
};

export const register = async (
  req: RegisterRequest,
  res: Response<ApiResponse<AuthResponse>>
) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const client = await pool.connect();
    try {
      const existingUserQuery = `
        SELECT id FROM users
        WHERE email = $1 OR username = $2
      `;
      const existingUser = await client.query(existingUserQuery, [
        email,
        username,
      ]);

      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          error: 'User with this email or username already exists',
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Create user
      const createUserQuery = `
        INSERT INTO users (username, email, password_hash, first_name, last_name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id, username, email, first_name, last_name
      `;
      const userResult = await client.query(createUserQuery, [
        username,
        email,
        passwordHash,
        firstName || null,
        lastName || null,
      ]);

      const user = userResult.rows[0];

      // Generate JWT
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET is not set');
      }

      const token = createAuthToken(user.id, jwtSecret);

      res.status(201).json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
        },
        token,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Error creating user' });
  }
};

export const login = async (
  req: LoginRequest,
  res: Response<ApiResponse<AuthResponse>>
) => {
  try {
    const { emailOrUsername, password } = req.body;

    const client = await pool.connect();
    try {
      // Find user by email or username
      const userQuery = `
        SELECT id, username, email, password_hash, first_name, last_name
        FROM users
        WHERE email = $1 OR username = $1
      `;
      const userResult = await client.query(userQuery, [emailOrUsername]);
      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = userResult.rows[0];

      // Check password
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET is not set');
      }

      const token = createAuthToken(user.id, jwtSecret);

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
        },
        token,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error logging in' });
  }
};

export const getProfile: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { user } = req as AuthenticatedRequest;

    if (!user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const client = await pool.connect();
    try {
      const userQuery = `
      SELECT id, username, email, first_name, last_name
      FROM users
      WHERE id = $1
    `;
      const userResult = await client.query(userQuery, [user.id]);

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userRow = userResult.rows[0];

      const teamQuery = `
        SELECT t.id, t.name, t.color, tm.role
        FROM team_members tm
        JOIN teams t ON tm.team_id = t.id
        WHERE tm.user_id = $1 AND t.is_active = true
      `;
      const teamResult = await client.query(teamQuery, [user.id]);
      const currentTeam =
        teamResult.rows.length > 0
          ? {
              id: teamResult.rows[0].id,
              name: teamResult.rows[0].name,
              color: teamResult.rows[0].color,
              role: teamResult.rows[0].role,
            }
          : null;
      return res.json({
        id: userRow.id,
        username: userRow.username,
        email: userRow.email,
        firstName: userRow.first_name,
        lastName: userRow.last_name,
        currentTeam,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Error fetching profile' });
  }
};

// TODO: Implement remaining functions (updateProfile, requestPasswordReset, resetPassword)
// For now, simplified versions that return not implemented
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { username, firstName, lastName, email, pushToken } = req.body;

    if (!user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const client = await pool.connect();
    try {
      const updateQuery = `
        UPDATE users
        SET username = COALESCE($1, username),
            first_name = COALESCE($2, first_name),
            last_name = COALESCE($3, last_name),
            email = COALESCE($4, email),
            push_token = COALESCE($5, push_token),
            updated_at = NOW()
        WHERE id = $6
        RETURNING id, username, email, first_name, last_name
      `;
      const result = await client.query(updateQuery, [
        username,
        firstName,
        lastName,
        email,
        pushToken,
        user.id,
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updatedUser = result.rows[0];
      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Error updating profile' });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const client = await pool.connect();
    try {
      // Check if user exists
      const userQuery = `SELECT id FROM users WHERE email = $1`;
      const userResult = await client.query(userQuery, [email]);

      // Always return success to prevent email enumeration
      res.json({
        message:
          'If an account with that email exists, a password reset link has been sent.',
      });

      // Only proceed if user actually exists
      if (userResult.rows.length === 0) {
        return;
      }

      // TODO: In production, send actual email with reset token
      console.log(`Password reset requested for email: ${email}`);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Error processing password reset request' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters long' });
    }

    try {
      const jwtSecret = process.env.JWT_SECRET;
      const decoded = verifyToken(token, jwtSecret) as JWTPayload;

      const client = await pool.connect();
      try {
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        // Update user password
        const updateQuery = `
          UPDATE users
          SET password_hash = $1, updated_at = NOW()
          WHERE id = $2
          RETURNING id
        `;
        const result = await client.query(updateQuery, [
          passwordHash,
          decoded.userId,
        ]);

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Password reset successfully' });
      } finally {
        client.release();
      }
    } catch (tokenError) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Error resetting password' });
  }
};
