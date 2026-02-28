import { firestore } from '../../config/firebase';
import { prisma } from '../../config/prisma';
import { 
  AttendeeAccessInput, 
  EventAccessResponse, 
  EventMember, 
  EventMemberStatus, 
  EventMemberRole,
  EventAccessSource,
  AccessSourceType
} from '../../types/events';

export class EventAccessService {
  /**
   * Grant attendee access to an event based on valid ticket
   */
  static async grantAttendeeAccess(input: AttendeeAccessInput, firebaseUid: string): Promise<EventAccessResponse> {
    try {
      // 1. Validate ticket exists and belongs to the event
      const ticket = await prisma.ticket.findFirst({
        where: {
          serial: input.ticketSerial,
          eventId: input.eventId,
          status: 'VALID'
        },
        include: {
          event: true,
          order: true
        }
      });

      if (!ticket) {
        return {
          success: false,
          message: 'Invalid or expired ticket'
        };
      }

      // 2. Create or update event member document in Firestore
      const eventMemberRef = firestore
        .collection('events')
        .doc(input.eventId)
        .collection('members')
        .doc(firebaseUid);
      
      const now = new Date().toISOString();
      const accessSource: EventAccessSource = {
        type: AccessSourceType.TICKET,
        ticketId: ticket.id,
        grantedAt: now
      };

      const eventMemberData: Partial<EventMember> = {
        status: EventMemberStatus.ACTIVE,
        roles: [EventMemberRole.MEMBER],
        access: {
          attendee: true,
          premium: false
        },
        sources: {
          attendee: accessSource
        },
        updatedAt: now
      };

      // Use merge to preserve existing data (like premium access)
      await eventMemberRef.set(eventMemberData, { merge: true });

      // 3. Get the complete member document
      const memberDoc = await eventMemberRef.get();
      const member = memberDoc.data() as EventMember;

      // 4. Mark ticket as used (optional - depends on business logic)
      // await prisma.ticket.update({
      //   where: { id: ticket.id },
      //   data: { 
      //     status: 'USED',
      //     usedAt: new Date(),
      //     usedById: input.firebaseUid
      //   }
      // });

      return {
        success: true,
        message: 'Attendee access granted successfully',
        member: {
          ...member,
          createdAt: member.createdAt || now,
          updatedAt: now
        }
      };

    } catch (error) {
      console.error('Error granting attendee access:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  /**
   * Get event member by Firebase UID
   */
  static async getEventMember(eventId: string, firebaseUid: string): Promise<EventMember | null> {
    try {
      const memberDoc = await firestore
        .collection('events')
        .doc(eventId)
        .collection('members')
        .doc(firebaseUid)
        .get();

      return memberDoc.exists ? memberDoc.data() as EventMember : null;
    } catch (error) {
      console.error('Error getting event member:', error);
      return null;
    }
  }

  /**
   * Check if user has access to event spaces
   */
  static async checkEventAccess(eventId: string, firebaseUid: string): Promise<{
    hasAttendeeAccess: boolean;
    hasPremiumAccess: boolean;
    member?: EventMember;
  }> {
    const member = await this.getEventMember(eventId, firebaseUid);
    
    if (!member || member.status !== EventMemberStatus.ACTIVE) {
      return {
        hasAttendeeAccess: false,
        hasPremiumAccess: false
      };
    }

    return {
      hasAttendeeAccess: member.access.attendee,
      hasPremiumAccess: member.access.premium,
      member
    };
  }
}
