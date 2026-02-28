import { Router, Request, Response } from 'express';
import { EventAccessService } from './eventAccess.service';
import { AttendeeAccessInput } from '../../types/events';
import { auth } from '../../config/firebase';

const router: Router = Router();

/**
 * POST /public/event-access/attendee
 * Grant attendee access to an event based on valid ticket
 */
router.post('/attendee', async (req: Request, res: Response) => {
  try {
    // Extract and verify Firebase ID Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    let firebaseUid: string;
    
    try {
      const decodedToken = await auth.verifyIdToken(token);
      firebaseUid = decodedToken.uid;
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired Firebase ID token'
      });
    }

    const input: AttendeeAccessInput = req.body;

    // Validate required fields
    if (!input.eventId || !input.ticketSerial) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: eventId, ticketSerial'
      });
    }

    // Validate field formats
    if (typeof input.eventId !== 'string' || input.eventId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'eventId must be a non-empty string'
      });
    }

    if (typeof input.ticketSerial !== 'string' || input.ticketSerial.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'ticketSerial must be a non-empty string'
      });
    }

    // Reject if firebaseUid is still in body (security measure)
    if (req.body.firebaseUid) {
      return res.status(400).json({
        success: false,
        message: 'firebaseUid should not be provided in request body'
      });
    }

    const result = await EventAccessService.grantAttendeeAccess(input, firebaseUid);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Error in attendee access endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /public/event-access/:eventId/:firebaseUid
 * Check event access for a user (for debugging/testing)
 */
router.get('/:eventId/:firebaseUid', async (req: Request, res: Response) => {
  try {
    const { eventId, firebaseUid } = req.params;

    if (!eventId || !firebaseUid) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: eventId, firebaseUid'
      });
    }

    const access = await EventAccessService.checkEventAccess(eventId, firebaseUid);
    
    res.status(200).json({
      success: true,
      data: access
    });

  } catch (error) {
    console.error('Error checking event access:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export { router as eventAccessRoutes };
