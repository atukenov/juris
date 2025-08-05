import { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

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
    const user = await prisma.user.findUnique({
      where: { id: String(decoded.userId) },
      select: { id: true },
    });

    if (!user) {
      throw new Error();
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate.' });
  }
};
