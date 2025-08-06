import { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { pool } from '../lib/database';

interface JwtPayload {
  userId: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new Error();
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not set');
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    const client = await pool.connect();
    try {
      const userQuery = 'SELECT id FROM users WHERE id = $1';
      const userResult = await client.query(userQuery, [decoded.userId]);

      if (userResult.rows.length === 0) {
        throw new Error();
      }

      req.user = { id: userResult.rows[0].id };
      next();
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate.' });
  }
};
