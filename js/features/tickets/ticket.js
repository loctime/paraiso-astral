// ===== TICKET MODEL - PARAÍSO ASTRAL =====

class TicketModel {
  constructor() {
    this.secretKey = 'paraiso-astral-secret-key-2024'; // En producción, esto debería venir del servidor
    this.ticketTypes = ['general', 'vip', 'backstage'];
  }

  // ===== GENERACIÓN DE TICKETS =====
  generateTicketId() {
    // Generar UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  createTicket(eventId, type, buyerInfo, price) {
    if (!this.ticketTypes.includes(type)) {
      throw new Error('Tipo de ticket inválido');
    }

    const ticketId = this.generateTicketId();
    const issuedAt = new Date().toISOString();
    
    const ticket = {
      id: ticketId,
      eventId: parseInt(eventId),
      type,
      price,
      issuedAt,
      status: 'valid', // valid, used, expired
      buyerInfo: {
        name: buyerInfo.name || '',
        email: buyerInfo.email || '',
        phone: buyerInfo.phone || ''
      },
      qrPayload: this.generateQRPayload(ticketId, eventId, type, issuedAt),
      checksum: this.generateChecksum(ticketId, eventId, type, issuedAt)
    };

    return ticket;
  }

  // ===== QR PAYLOAD SEGURO =====
  generateQRPayload(ticketId, eventId, type, issuedAt) {
    const payload = {
      ticketId,
      eventId: parseInt(eventId),
      type,
      issuedAt,
      version: '1.0',
      issuer: 'paraiso-astral'
    };

    // Firmar digitalmente el payload
    const signature = this.generateSignature(payload);
    payload.signature = signature;

    // Convertir a string base64 para QR
    return btoa(JSON.stringify(payload));
  }

  generateSignature(payload) {
    // Crear string a firmar
    const stringToSign = `${payload.ticketId}${payload.eventId}${payload.type}${payload.issuedAt}`;
    
    // Generar HMAC-SHA256 (simulado con crypto API si está disponible)
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      // En un navegador moderno con Web Crypto API
      return this.generateHMACSHA256(stringToSign);
    } else {
      // Fallback para navegadores antiguos (menos seguro)
      return this.generateSimpleHash(stringToSign);
    }
  }

  async generateHMACSHA256(message) {
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(this.secretKey);
      const messageData = encoder.encode(message);
      
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signature = await crypto.subtle.sign('HMAC', key, messageData);
      return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      console.warn('Web Crypto API no disponible, usando fallback');
      return this.generateSimpleHash(message);
    }
  }

  generateSimpleHash(message) {
    // Hash simple como fallback (NO para producción)
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }

  generateChecksum(ticketId, eventId, type, issuedAt) {
    // Checksum adicional para verificación de integridad
    const data = `${ticketId}${eventId}${type}${issuedAt}`;
    return this.generateSimpleHash(data).substring(0, 8);
  }

  // ===== VALIDACIÓN DE TICKETS =====
  parseQRPayload(qrString) {
    try {
      const payload = JSON.parse(atob(qrString));
      return payload;
    } catch (error) {
      throw new Error('QR payload inválido');
    }
  }

  validateTicket(qrString, offline = false) {
    try {
      const payload = this.parseQRPayload(qrString);
      
      // Validar estructura básica
      if (!payload.ticketId || !payload.eventId || !payload.type || !payload.issuedAt) {
        return { valid: false, error: 'Estructura de ticket inválida' };
      }

      // Validar versión
      if (payload.version !== '1.0') {
        return { valid: false, error: 'Versión de ticket no soportada' };
      }

      // Validar emisor
      if (payload.issuer !== 'paraiso-astral') {
        return { valid: false, error: 'Emisor no válido' };
      }

      // Validar tipo de ticket
      if (!this.ticketTypes.includes(payload.type)) {
        return { valid: false, error: 'Tipo de ticket inválido' };
      }

      // Validar fecha de emisión
      const issuedDate = new Date(payload.issuedAt);
      const now = new Date();
      const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 año
      
      if (now - issuedDate > maxAge) {
        return { valid: false, error: 'Ticket expirado' };
      }

      // Validar firma (solo si hay conexión o si se tiene la clave)
      if (!offline && payload.signature) {
        const isValidSignature = this.validateSignature(payload);
        if (!isValidSignature) {
          return { valid: false, error: 'Firma digital inválida' };
        }
      }

      return { 
        valid: true, 
        ticketId: payload.ticketId,
        eventId: payload.eventId,
        type: payload.type,
        issuedAt: payload.issuedAt
      };

    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  validateSignature(payload) {
    try {
      // Extraer firma temporalmente
      const signature = payload.signature;
      const payloadCopy = { ...payload };
      delete payloadCopy.signature;

      // Generar firma esperada
      const expectedSignature = this.generateSignature(payloadCopy);
      
      // Comparar firmas
      return signature === expectedSignature;
    } catch (error) {
      return false;
    }
  }

  // ===== VERIFICACIÓN ONLINE/OFFLINE =====
  async verifyTicketOnline(qrString) {
    try {
      // Primero validación básica
      const basicValidation = this.validateTicket(qrString, false);
      if (!basicValidation.valid) {
        return basicValidation;
      }

      // Verificación con servidor (simulada)
      const serverValidation = await this.checkWithServer(basicValidation.ticketId);
      
      return {
        ...basicValidation,
        serverValid: serverValidation.valid,
        serverData: serverValidation.data
      };

    } catch (error) {
      return { valid: false, error: 'Error en verificación online' };
    }
  }

  verifyTicketOffline(qrString) {
    // Validación básica sin verificación de firma
    return this.validateTicket(qrString, true);
  }

  async checkWithServer(ticketId) {
    // Simulación de verificación con servidor
    // En producción, esto sería una llamada real a la API
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simular respuesta del servidor
        resolve({
          valid: true,
          data: {
            status: 'valid',
            used: false,
            validatedAt: new Date().toISOString()
          }
        });
      }, 500); // Simular latencia de red
    });
  }

  // ===== ANTI-FALSIFICACIÓN =====
  generateSecurityFeatures(ticket) {
    return {
      hologramId: this.generateHologramId(),
      watermark: this.generateWatermark(ticket.id),
      serialNumber: this.generateSerialNumber(),
      batchNumber: this.generateBatchNumber()
    };
  }

  generateHologramId() {
    return 'HG-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  generateWatermark(ticketId) {
    // Watermark invisible basado en el ID del ticket
    const hash = this.generateSimpleHash(ticketId);
    return hash.substring(0, 12);
  }

  generateSerialNumber() {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substr(2, 8).toUpperCase();
    return `PA-${year}-${random}`;
  }

  generateBatchNumber() {
    const week = this.getWeekNumber(new Date());
    const year = new Date().getFullYear();
    return `B${year}W${week.toString().padStart(2, '0')}`;
  }

  getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  // ===== UTILIDADES =====
  formatTicketInfo(ticket) {
    const event = typeof API !== 'undefined' ? API.getEventById(ticket.eventId) : null;
    
    return {
      ticketId: ticket.id,
      eventId: ticket.eventId,
      eventName: event ? event.title : 'Evento desconocido',
      eventDate: event ? event.date : '',
      eventVenue: event ? event.venue : '',
      type: ticket.type,
      typeName: this.getTypeDisplayName(ticket.type),
      price: ticket.price,
      buyerName: ticket.buyerInfo.name,
      buyerEmail: ticket.buyerInfo.email,
      issuedAt: ticket.issuedAt,
      status: ticket.status,
      qrPayload: ticket.qrPayload
    };
  }

  getTypeDisplayName(type) {
    const names = {
      general: 'General',
      vip: 'VIP',
      backstage: 'Backstage'
    };
    return names[type] || type;
  }

  // ===== EXPORTACIÓN =====
  exportTicket(ticket) {
    return {
      ...ticket,
      formatted: this.formatTicketInfo(ticket),
      security: this.generateSecurityFeatures(ticket)
    };
  }
}

// Crear instancia global del modelo de tickets
const ticketModel = new TicketModel();

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ticketModel;
} else {
  window.TicketModel = ticketModel;
}
