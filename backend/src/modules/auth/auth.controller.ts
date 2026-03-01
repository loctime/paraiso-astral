import { Request, Response } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireActiveUser } from '../../middlewares/requireActiveUser';
import { prisma } from '../../config/prisma';

/**
 * GET /me
 * Get current user profile
 * Protected with requireAuth and requireActiveUser
 */
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // User is already attached by requireAuth middleware
    const firebaseUser = req.user;
    
    if (!firebaseUser || !firebaseUser.firebaseUid) {
      res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Authentication required'
      });
      return;
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: {
        firebaseUid: firebaseUser.firebaseUid
      }
    });

    if (!user) {
      res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: 'User not found in database'
      });
      return;
    }

    // Return user data
    res.json({
      status: 'success',
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl
      }
    });

  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({
      status: 'error',
      statusCode: 500,
      message: 'Internal server error'
    });
  }
};
