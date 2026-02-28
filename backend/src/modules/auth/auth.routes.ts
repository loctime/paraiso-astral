import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { LoginInput, AuthResponse, MeResponse } from '../../types/auth';

const router = Router() as Router;

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input: LoginInput = req.body;
    
    // Validación básica
    if (!input.email || !input.password) {
      res.status(400).json({
        error: 'Email and password are required',
      });
      return;
    }

    const result: AuthResponse = await AuthService.login(input);
    
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid credentials') {
      res.status(401).json({
        error: 'Invalid credentials',
      });
      return;
    }
    
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
      });
      return;
    }

    const result: MeResponse = await AuthService.getMe(req.user.id);
    
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export { router as authRoutes };
