import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { sign, verify } from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
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
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User with this email or username already exists',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        firstName,
        lastName,
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not set');
    }

    const token = createAuthToken(user.id, jwtSecret);

    res.status(201).json({
      user,
      token,
    });
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

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
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
        firstName: user.firstName,
        lastName: user.lastName,
      },
      token,
    });
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

    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Error fetching profile' });
  }
};

export const updateProfile = async (
  req: UpdateProfileRequest,
  res: Response<ApiResponse<Omit<User, 'passwordHash'>>>
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { username, email, firstName, lastName } = req.body;

    // Check if email/username is already taken by another user
    if (email || username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            email ? { email } : undefined,
            username ? { username } : undefined,
          ].filter(Boolean),
          NOT: { id: String(userId) },
        },
      });

      if (existingUser) {
        return res.status(400).json({
          error: 'Username or email is already taken',
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: String(userId) },
      data: {
        username,
        email,
        firstName,
        lastName,
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Error updating profile' });
  }
};

export const requestPasswordReset = async (
  req: PasswordResetRequest,
  res: Response<ApiResponse<MessageResponse>>
) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return 200 even if user not found for security
      return res.json({
        message: 'If an account exists, a reset link will be sent',
      });
    }

    // Generate reset token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not set');
    }
    const resetToken = createResetToken(user.id, jwtSecret + user.passwordHash);

    // Store reset token and expiry
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry: new Date(Date.now() + 3600000), // 1 hour
      },
    });

    // TODO: Send email with reset link
    // For now, just return the token
    res.json({
      message: 'If an account exists, a reset link will be sent',
      token: resetToken,
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Error processing password reset request' });
  }
};

export const resetPassword = async (
  req: ResetConfirmRequest,
  res: Response<ApiResponse<MessageResponse>>
) => {
  try {
    const { token, newPassword } = req.body;

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Verify token
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET is not set');
      }
      verifyToken(token, jwtSecret + user.passwordHash);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ message: 'Password successfully reset' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Error resetting password' });
  }
};
