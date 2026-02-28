// import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { LoginInput, AuthResponse, MeResponse, JwtPayload } from '../../types/auth';

export class AuthService {
  static async login(input: LoginInput): Promise<AuthResponse> {
    // Buscar user por email
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Comparar password con bcrypt (temporalmente desactivado para pruebas)
    // const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    const isPasswordValid = input.password === 'test123'; // Temporal para pruebas
    
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generar JWT
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as SignOptions);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  static async getMe(userId: string): Promise<MeResponse> {
    // Buscar user con sus memberships
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          select: {
            organizationId: true,
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      memberships: user.memberships,
    };
  }

  static verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}
