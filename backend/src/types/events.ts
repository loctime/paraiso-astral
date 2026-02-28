export enum EventMemberStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

export enum EventMemberRole {
  MEMBER = 'member',
  MODERATOR = 'moderator',
  ADMIN = 'admin'
}

export enum EventAccessLevel {
  ATTENDEE = 'attendee',
  PREMIUM = 'premium'
}

export enum AccessSourceType {
  TICKET = 'ticket',
  MANUAL = 'manual',
  SUBSCRIPTION = 'subscription'
}

export interface EventAccessSource {
  type: AccessSourceType;
  ticketId?: string;
  grantedAt: string;
  grantedBy?: string; // Firebase UID of admin who granted access
  expiresAt?: string;
}

export interface EventAccess {
  attendee: boolean;
  premium: boolean;
}

export interface EventAccessSources {
  attendee: EventAccessSource;
  premium?: EventAccessSource;
}

export interface EventMember {
  status: EventMemberStatus;
  roles: EventMemberRole[];
  access: EventAccess;
  sources: EventAccessSources;
  createdAt: string;
  updatedAt: string;
}

export interface AttendeeAccessInput {
  eventId: string;
  ticketSerial: string;
}

export interface PremiumAccessInput {
  eventId: string;
  firebaseUid: string;
  grantedBy: string; // Admin UID
  reason?: string;
  expiresAt?: string;
}

export interface EventAccessResponse {
  success: boolean;
  message: string;
  member?: EventMember;
}
