# Event Spaces Security Documentation

## Overview

Event Spaces is a dual-level access system that provides **attendee** and **premium** access to event-specific digital spaces. The system uses Firestore for community features and PostgreSQL for authority and ticket validation.

## Architecture

### Data Storage Split
- **PostgreSQL**: Authority data (tickets, events, organizations, users)
- **Firestore**: Community data (event members, chats, media, real-time features)

### Access Levels

#### 1. Attendee Access
- **Source**: Valid ticket serial number
- **Validation**: PostgreSQL ticket table (status = VALID)
- **Grant**: Automatic via `/public/event-access/attendee` endpoint
- **Duration**: Ticket lifetime (no expiration unless ticket is voided)

#### 2. Premium Access
- **Source**: Manual/admin grant
- **Validation**: Firestore eventMembers document
- **Grant**: Manual via admin interface (future endpoint)
- **Duration**: Configurable expiration date

## Data Models

### Event Members (Firestore)

**Collection**: `eventMembers`
**Document ID**: `{eventId}_{firebaseUid}`

```typescript
interface EventMember {
  status: 'active' | 'inactive' | 'suspended';
  roles: ['member' | 'moderator' | 'admin'];
  access: {
    attendee: boolean;
    premium: boolean;
  };
  sources: {
    attendee: {
      type: 'ticket' | 'manual' | 'subscription';
      ticketId?: string;
      grantedAt: string;
      grantedBy?: string;
      expiresAt?: string;
    };
    premium?: {
      type: 'manual' | 'subscription';
      grantedAt: string;
      grantedBy: string;
      expiresAt?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}
```

### Collections Structure

#### Chat Collections
- `eventChats/{eventId}/messages` - Attendee chat messages
- `eventChatsPremium/{eventId}/messages` - Premium chat messages

#### Media Collections  
- `eventMedia/{eventId}/items` - Attendee media files
- `eventMediaPremium/{eventId}/items` - Premium media files

## Security Rules

### Access Control Logic

#### 1. Attendee Access Validation
```
IF user.access.attendee = true AND user.status = 'active'
THEN allow access to:
  - eventChats/{eventId}/messages (read/write own)
  - eventMedia/{eventId}/items (read)
```

#### 2. Premium Access Validation
```
IF user.access.premium = true AND user.status = 'active'
THEN allow access to:
  - eventChatsPremium/{eventId}/messages (read/write)
  - eventMediaPremium/{eventId}/items (read/write)
  - eventMedia/{eventId}/items (read/write)
```

#### 3. Cross-Level Access
- Premium users can access both attendee and premium spaces
- Attendee users cannot access premium spaces

### Data Ownership Rules

#### Chat Messages
- Users can only edit/delete their own messages
- Moderators can delete any message in their event
- Admins have full control

#### Media Items
- Users can only edit/delete their own uploads
- Premium users can upload to premium collections
- Download tracking per user

## API Endpoints

### Public Endpoints

#### POST /public/event-access/attendee
**Purpose**: Grant attendee access based on valid ticket

**Input**:
```json
{
  "eventId": "string",
  "firebaseUid": "string", 
  "ticketSerial": "string"
}
```

**Validation Flow**:
1. Validate ticket exists in PostgreSQL
2. Verify ticket belongs to specified event
3. Check ticket status = VALID
4. Create/update eventMembers document in Firestore
5. Set access.attendee = true
6. Record source.attendee.type = ticket

**Response**:
```json
{
  "success": true,
  "message": "Attendee access granted successfully",
  "member": { /* EventMember object */ }
}
```

#### GET /public/event-access/{eventId}/{firebaseUid}
**Purpose**: Check current access status (debugging/testing)

### Future Premium Endpoint

#### POST /public/event-access/premium
**Purpose**: Grant premium access (admin only)

**Input**:
```json
{
  "eventId": "string",
  "firebaseUid": "string",
  "grantedBy": "string", // Admin Firebase UID
  "reason": "string", // Optional
  "expiresAt": "string" // Optional ISO date
}
```

## Security Considerations

### 1. Ticket Validation
- Tickets are validated against PostgreSQL source of truth
- Ticket serial numbers are unique and non-guessable
- Ticket status changes (USED, VOID) immediately affect access

### 2. Firebase UID Validation
- Firebase UIDs are obtained from Firebase Auth tokens
- No password-based authentication for event access
- UID format validation prevents injection attacks

### 3. Access Source Tracking
- All access grants are logged with source, timestamp, and grantor
- Audit trail for compliance and debugging
- Expiration timestamps prevent permanent access

### 4. Rate Limiting
- Implement rate limiting on access endpoints
- Prevent brute force ticket serial guessing
- Limit per-IP and per-user requests

### 5. Data Isolation
- Event data is isolated by eventId in collection structure
- Cross-event data leakage prevented by design
- User can only access data for events they're members of

## Payment Integration (Future)

### Stripe Integration Points
- Premium access purchase flow
- Subscription management
- Webhook handlers for payment events

### Payment-Based Access
```typescript
interface PaymentSource {
  type: 'stripe_payment' | 'stripe_subscription';
  stripePaymentIntentId?: string;
  stripeSubscriptionId?: string;
  grantedAt: string;
  expiresAt?: string;
}
```

### Access Revocation
- Failed subscription payments revoke premium access
- Refunds may trigger access review
- Admin override for payment system failures

## Monitoring and Auditing

### Access Logs
- All access grants/revocations logged
- Include IP address, user agent, timestamp
- Store in separate audit collection

### Security Events
- Multiple failed access attempts
- Suspicious ticket serial patterns
- Cross-event access attempts

### Metrics
- Active users per event
- Access level distribution
- Chat/media usage by access level

## Implementation Status

### ✅ Completed
- Event members data model
- Attendee access endpoint
- Firestore collection structure
- Basic security rules documentation

### 🚧 In Progress  
- Premium access endpoint (admin only)
- Firestore security rules implementation
- Rate limiting configuration

### 📋 Planned
- Stripe payment integration
- Advanced audit logging
- Real-time access monitoring
- Mobile app SDK integration

## Testing Strategy

### Unit Tests
- Ticket validation logic
- Access source tracking
- Firestore document operations

### Integration Tests  
- End-to-end access flow
- PostgreSQL-Firestore sync
- Error handling scenarios

### Security Tests
- Invalid ticket serials
- Cross-event access attempts
- Rate limiting effectiveness
- Data isolation verification

## Deployment Considerations

### Environment Variables
```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Database Configuration  
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### Firestore Indexes
Required indexes for optimal query performance:
- eventMembers by eventId + status
- eventChats by eventId + timestamp  
- eventMedia by eventId + uploadedAt

### Backup Strategy
- PostgreSQL: Regular database dumps
- Firestore: Native backup/export
- Cross-system consistency verification

---

**Last Updated**: 2026-02-28  
**Version**: 1.0.0  
**Status**: Implementation in Progress
