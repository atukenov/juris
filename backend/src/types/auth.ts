import { Request } from 'express-serve-static-core';

// Base user type
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
}

// Base AuthRequest with authenticated user
export interface AuthenticatedRequest extends Request {
  user:
    | {
        id: string;
      }
    | undefined;
}

// Registration request
export interface RegisterRequest extends Request {
  body: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  };
}

// Login request
export interface LoginRequest extends Request {
  body: {
    email: string;
    password: string;
  };
}

// Profile update request
export interface UpdateProfileRequest extends AuthenticatedRequest {
  body: {
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
}

// Password reset request
export interface PasswordResetRequest extends Request {
  body: {
    email: string;
  };
}

// Password reset confirmation request
export interface ResetConfirmRequest extends Request {
  body: {
    token: string;
    newPassword: string;
  };
}

// Response types
export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  token: string;
}

export interface MessageResponse {
  message: string;
  token?: string;
}

export interface ErrorResponse {
  error: string;
}

// Response type that can be either success or error
export type ApiResponse<T> = T | ErrorResponse;

// Combining all request types for the auth controller
export type AuthRequest =
  | RegisterRequest
  | LoginRequest
  | AuthenticatedRequest
  | UpdateProfileRequest
  | PasswordResetRequest
  | ResetConfirmRequest;
