export enum MembershipRole {
  OWNER,
  ADMIN,
  ORGANIZER,
  SCANNER,
  RRPP_MANAGER,
}

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
    role: MembershipRole;
  }>;
}

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}
