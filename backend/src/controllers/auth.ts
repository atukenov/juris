import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { sign, verify } from 'jsonwebtoken';
import { pool } from '../lib/database';
import {
  ApiResponse,
  AuthenticatedRequest,
  AuthResponse,
  LoginRequest,
  MessageResponse,
  PasswordResetRequest,
  RegisterRequest,
  ResetConfirmRequest,
  UpdateProfileRequest,
  User,
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
    const { email, password } = req.body;

    const client = await pool.connect();
    try {
      // Find user
      const userQuery = `
        SELECT id, username, email, password_hash, first_name, last_name
        FROM users 
        WHERE email = $1
      `;
      const userResult = await client.query(userQuery, [email]);

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

export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<Omit<User, 'passwordHash'>>>
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const client = await pool.connect();
    try {
      const userQuery = `
        SELECT id, username, email, first_name, last_name
        FROM users 
        WHERE id = $1
      `;
      const userResult = await client.query(userQuery, [userId]);

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
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
export const updateProfile = async (
  req: UpdateProfileRequest,
  res: Response<ApiResponse<Omit<User, 'passwordHash'>>>
) => {
  res.status(501).json({ error: 'Not implemented yet' });
};

export const requestPasswordReset = async (
  req: PasswordResetRequest,
  res: Response<ApiResponse<MessageResponse>>
) => {
  res.status(501).json({ error: 'Not implemented yet' });
};

export const resetPassword = async (
  req: ResetConfirmRequest,
  res: Response<ApiResponse<MessageResponse>>
) => {
  res.status(501).json({ error: 'Not implemented yet' });
};
