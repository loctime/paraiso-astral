// Note: MembershipRole is now imported from @prisma/client
// This file is kept for backwards compatibility but can be removed in future

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface MeResponse {
  id: string;
  email: string;
  name: string;
  memberships: Array<{
    organizationId: string;
    role: string; // Using string instead of MembershipRole enum
  }>;
}

// Note: JwtPayload is no longer needed with Firebase authentication
export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}
