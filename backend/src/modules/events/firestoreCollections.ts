import { firestore } from '../../config/firebase';

/**
 * Firestore Collections Structure for Event Spaces
 * 
 * This file defines the structure and provides helper functions
 * for managing Firestore collections used in Event Spaces.
 */

export interface EventChatMessage {
  id: string;
  eventId: string;
  firebaseUid: string;
  displayName?: string;
  message: string;
  timestamp: string;
  type: 'text' | 'system' | 'image';
  replyTo?: string; // Message ID being replied to
  reactions?: {
    [emoji: string]: {
      count: number;
      users: string[]; // Firebase UIDs
    };
  };
  editedAt?: string;
  deletedAt?: string;
}

export interface EventMediaItem {
  id: string;
  eventId: string;
  firebaseUid: string;
  displayName?: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  thumbnailUrl?: string;
  caption?: string;
  tags: string[];
  uploadedAt: string;
  downloadCount: number;
  likes: {
    count: number;
    users: string[]; // Firebase UIDs
  };
  status: 'active' | 'processing' | 'deleted';
}

/**
 * Get reference to event chat messages collection
 */
export const getEventChatRef = (eventId: string) => {
  return firestore.collection('eventChats').doc(eventId).collection('messages');
};

/**
 * Get reference to event premium chat messages collection
 */
export const getEventPremiumChatRef = (eventId: string) => {
  return firestore.collection('eventChatsPremium').doc(eventId).collection('messages');
};

/**
 * Get reference to event media collection
 */
export const getEventMediaRef = (eventId: string) => {
  return firestore.collection('eventMedia').doc(eventId).collection('items');
};

/**
 * Get reference to event premium media collection
 */
export const getEventPremiumMediaRef = (eventId: string) => {
  return firestore.collection('eventMediaPremium').doc(eventId).collection('items');
};

/**
 * Create initial event collections structure
 */
export const initializeEventCollections = async (eventId: string): Promise<void> => {
  try {
    // Create placeholder documents to ensure collections exist
    const batch = firestore.batch();

    // Initialize chat collections
    const chatRef = getEventChatRef(eventId).doc('init');
    batch.set(chatRef, {
      initialized: true,
      createdAt: new Date().toISOString(),
      collection: 'eventChats'
    });

    const premiumChatRef = getEventPremiumChatRef(eventId).doc('init');
    batch.set(premiumChatRef, {
      initialized: true,
      createdAt: new Date().toISOString(),
      collection: 'eventChatsPremium'
    });

    // Initialize media collections
    const mediaRef = getEventMediaRef(eventId).doc('init');
    batch.set(mediaRef, {
      initialized: true,
      createdAt: new Date().toISOString(),
      collection: 'eventMedia'
    });

    const premiumMediaRef = getEventPremiumMediaRef(eventId).doc('init');
    batch.set(premiumMediaRef, {
      initialized: true,
      createdAt: new Date().toISOString(),
      collection: 'eventMediaPremium'
    });

    await batch.commit();
    console.log(`✅ Initialized Firestore collections for event: ${eventId}`);

  } catch (error) {
    console.error('❌ Error initializing event collections:', error);
    throw error;
  }
};

/**
 * Add message to event chat
 */
export const addEventChatMessage = async (
  eventId: string, 
  message: Omit<EventChatMessage, 'id' | 'timestamp'>,
  isPremium: boolean = false
): Promise<string> => {
  try {
    const collectionRef = isPremium ? getEventPremiumChatRef(eventId) : getEventChatRef(eventId);
    const messageRef = collectionRef.doc();
    
    const messageData: EventChatMessage = {
      ...message,
      id: messageRef.id,
      timestamp: new Date().toISOString()
    };

    await messageRef.set(messageData);
    return messageRef.id;

  } catch (error) {
    console.error('Error adding chat message:', error);
    throw error;
  }
};

/**
 * Add media item to event media
 */
export const addEventMediaItem = async (
  eventId: string,
  media: Omit<EventMediaItem, 'id' | 'uploadedAt' | 'downloadCount' | 'likes'>,
  isPremium: boolean = false
): Promise<string> => {
  try {
    const collectionRef = isPremium ? getEventPremiumMediaRef(eventId) : getEventMediaRef(eventId);
    const mediaRef = collectionRef.doc();
    
    const mediaData: EventMediaItem = {
      ...media,
      id: mediaRef.id,
      uploadedAt: new Date().toISOString(),
      downloadCount: 0,
      likes: {
        count: 0,
        users: []
      }
    };

    await mediaRef.set(mediaData);
    return mediaRef.id;

  } catch (error) {
    console.error('Error adding media item:', error);
    throw error;
  }
};
