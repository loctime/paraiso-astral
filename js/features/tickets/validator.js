// ===== TICKET VALIDATOR - PARAÍSO ASTRAL =====

class TicketValidator {
  constructor() {
    this.validationHistory = new Map();
    this.offlineCache = new Map();
    this.maxCacheSize = 1000;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
  }

  // ===== VALIDACIÓN PRINCIPAL =====
  async validateTicket(qrString, options = {}) {
    const {
      forceOnline = false,
      allowOffline = true,
      checkBlacklist = true,
      checkDuplicates = true
    } = options;

    try {
      // 1. Validación básica del QR
      const basicValidation = this.validateQRStructure(qrString);
      if (!basicValidation.valid) {
        return this.createValidationResult(false, 'QR inválido', basicValidation.error);
      }

      // 2. Verificar cache de validación
      const cacheKey = this.generateCacheKey(qrString);
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult && !forceOnline) {
        return cachedResult;
      }

      // 3. Validación offline primero
      const offlineValidation = await this.validateOffline(qrString);
      if (!offlineValidation.valid) {
        return this.createValidationResult(false, 'Validación offline falló', offlineValidation.error);
      }

      // 4. Verificaciones adicionales
      if (checkBlacklist && await this.isBlacklisted(offlineValidation.ticketId)) {
        return this.createValidationResult(false, 'Ticket en lista negra');
      }

      if (checkDuplicates && await this.isDuplicate(offlineValidation.ticketId)) {
        return this.createValidationResult(false, 'Ticket duplicado');
      }

      // 5. Validación online si es requerida o está disponible
      let onlineValidation = null;
      if (forceOnline || (navigator.onLine && !allowOffline)) {
        onlineValidation = await this.validateOnline(qrString);
        
        if (!onlineValidation.valid) {
          return this.createValidationResult(false, 'Validación online falló', onlineValidation.error);
        }
      }

      // 6. Crear resultado final
      const result = this.createValidationResult(
        true, 
        'Ticket válido',
        null,
        offlineValidation,
        onlineValidation
      );

      // 7. Guardar en cache e historial
      this.saveToCache(cacheKey, result);
      this.saveToHistory(offlineValidation.ticketId, result);

      return result;

    } catch (error) {
      return this.createValidationResult(false, 'Error en validación', error.message);
    }
  }

  // ===== VALIDACIÓN OFFLINE =====
  async validateOffline(qrString) {
    if (typeof TicketModel === 'undefined') {
      return { valid: false, error: 'Modelo de tickets no disponible' };
    }

    return TicketModel.verifyTicketOffline(qrString);
  }

  // ===== VALIDACIÓN ONLINE =====
  async validateOnline(qrString) {
    if (!navigator.onLine) {
      return { valid: false, error: 'Sin conexión a internet' };
    }

    if (typeof TicketModel === 'undefined') {
      return { valid: false, error: 'Modelo de tickets no disponible' };
    }

    try {
      const result = await TicketModel.verifyTicketOnline(qrString);
      
      // Verificar estado del ticket en el servidor
      if (result.serverValid && result.serverData) {
        if (result.serverData.status === 'used') {
          return { valid: false, error: 'Ticket ya utilizado' };
        }
        
        if (result.serverData.status === 'expired') {
          return { valid: false, error: 'Ticket expirado' };
        }
        
        if (result.serverData.status === 'cancelled') {
          return { valid: false, error: 'Ticket cancelado' };
        }
      }

      return result;

    } catch (error) {
      return { valid: false, error: 'Error en validación online: ' + error.message };
    }
  }

  // ===== VERIFICACIONES ADICIONALES =====
  async isBlacklisted(ticketId) {
    // Verificar en lista negra local
    const blacklist = await this.getBlacklist();
    return blacklist.includes(ticketId);
  }

  async isDuplicate(ticketId) {
    // Verificar si el ticket ya fue validado recientemente
    const history = this.validationHistory.get(ticketId);
    if (!history) return false;

    const lastValidation = history[history.length - 1];
    const timeDiff = Date.now() - lastValidation.timestamp;
    const duplicateThreshold = 60 * 1000; // 1 minuto

    return timeDiff < duplicateThreshold && lastValidation.valid;
  }

  async getBlacklist() {
    // Obtener lista negra del almacenamiento local
    try {
      if (typeof Storage !== 'undefined') {
        const blacklist = await Storage.getCache('ticket_blacklist');
        return blacklist || [];
      }
    } catch (error) {
      console.warn('Error obteniendo lista negra:', error);
    }
    
    return [];
  }

  async addToBlacklist(ticketId, reason) {
    try {
      if (typeof Storage !== 'undefined') {
        const blacklist = await this.getBlacklist();
        if (!blacklist.includes(ticketId)) {
          blacklist.push(ticketId);
          await Storage.setCache('ticket_blacklist', blacklist, 24 * 60 * 60 * 1000); // 24 horas
        }
      }
    } catch (error) {
      console.warn('Error agregando a lista negra:', error);
    }
  }

  // ===== CACHE =====
  generateCacheKey(qrString) {
    // Generar hash del QR para usar como clave de cache
    let hash = 0;
    for (let i = 0; i < qrString.length; i++) {
      const char = qrString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  getFromCache(key) {
    const cached = this.offlineCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTimeout) {
      this.offlineCache.delete(key);
      return null;
    }

    return cached.result;
  }

  saveToCache(key, result) {
    // Limitar tamaño del cache
    if (this.offlineCache.size >= this.maxCacheSize) {
      const firstKey = this.offlineCache.keys().next().value;
      this.offlineCache.delete(firstKey);
    }

    this.offlineCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.offlineCache.clear();
  }

  // ===== HISTORIAL =====
  saveToHistory(ticketId, result) {
    if (!this.validationHistory.has(ticketId)) {
      this.validationHistory.set(ticketId, []);
    }

    const history = this.validationHistory.get(ticketId);
    history.push({
      timestamp: Date.now(),
      valid: result.valid,
      method: result.onlineValidation ? 'online' : 'offline',
      error: result.error
    });

    // Limitar historial a 10 entradas por ticket
    if (history.length > 10) {
      history.shift();
    }
  }

  getValidationHistory(ticketId) {
    return this.validationHistory.get(ticketId) || [];
  }

  // ===== UTILIDADES =====
  validateQRStructure(qrString) {
    if (!qrString || typeof qrString !== 'string') {
      return { valid: false, error: 'QR string inválido' };
    }

    try {
      // Intentar parsear el payload base64
      const payload = JSON.parse(atob(qrString));
      
      // Validar estructura mínima
      const requiredFields = ['ticketId', 'eventId', 'type', 'issuedAt'];
      for (const field of requiredFields) {
        if (!payload[field]) {
          return { valid: false, error: `Campo requerido faltante: ${field}` };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Estructura de QR inválida' };
    }
  }

  createValidationResult(valid, message = '', error = null, offlineValidation = null, onlineValidation = null) {
    return {
      valid,
      message,
      error,
      timestamp: Date.now(),
      offlineValidation,
      onlineValidation,
      method: onlineValidation ? 'online' : 'offline',
      ticketId: offlineValidation?.ticketId || onlineValidation?.ticketId,
      eventId: offlineValidation?.eventId || onlineValidation?.eventId,
      type: offlineValidation?.type || onlineValidation?.type
    };
  }

  // ===== ESTADÍSTICAS =====
  getValidationStats() {
    let totalValidations = 0;
    let successfulValidations = 0;
    let onlineValidations = 0;
    let offlineValidations = 0;

    for (const history of this.validationHistory.values()) {
      history.forEach(validation => {
        totalValidations++;
        if (validation.valid) {
          successfulValidations++;
        }
        if (validation.method === 'online') {
          onlineValidations++;
        } else {
          offlineValidations++;
        }
      });
    }

    return {
      total: totalValidations,
      successful: successfulValidations,
      successRate: totalValidations > 0 ? (successfulValidations / totalValidations * 100).toFixed(2) + '%' : '0%',
      online: onlineValidations,
      offline: offlineValidations,
      cacheSize: this.offlineCache.size
    };
  }

  // ===== MODO ESCANEO =====
  async startScanMode(options = {}) {
    const {
      continuous = false,
      onScan = null,
      onError = null,
      timeout = 30000
    } = options;

    return new Promise((resolve, reject) => {
      const scanTimeout = setTimeout(() => {
        reject(new Error('Timeout de escaneo'));
      }, timeout);

      const handleScan = async (qrString) => {
        try {
          clearTimeout(scanTimeout);
          
          const result = await this.validateTicket(qrString, {
            forceOnline: !navigator.onLine
          });

          if (onScan) onScan(result);
          
          if (continuous) {
            // Continuar escaneando
            this.startScanMode(options);
          } else {
            resolve(result);
          }
        } catch (error) {
          if (onError) onError(error);
          reject(error);
        }
      };

      // Iniciar escaneo (depende de la implementación del escáner QR)
      this.initQRScanner(handleScan);
    });
  }

  initQRScanner(callback) {
    // Esta función debe ser implementada según el escáner QR utilizado
    // Por ahora, simulamos con un input manual
    
    const modal = this.createScanModal(callback);
    document.body.appendChild(modal);
    
    // Auto-eliminar después del escaneo
    setTimeout(() => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    }, 60000); // 1 minuto máximo
  }

  createScanModal(callback) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.innerHTML = `
      <div class="bottom-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-title">📷 Escanear Ticket</div>
        <div style="padding: 1rem 0;">
          <input type="text" 
                 id="qr-input" 
                 class="input" 
                 placeholder="Ingresa el código QR del ticket"
                 style="font-family: monospace; font-size: 0.8rem;">
          <button class="btn btn-primary btn-full" style="margin-top: 1rem" onclick="validateQRInput()">
            Validar Ticket
          </button>
          <button class="btn btn-ghost btn-full" style="margin-top: 0.5rem" onclick="closeScanModal()">
            Cancelar
          </button>
        </div>
      </div>
    `;

    // Agregar funciones globales temporales
    window.validateQRInput = () => {
      const input = document.getElementById('qr-input');
      if (input && input.value.trim()) {
        callback(input.value.trim());
        closeScanModal();
      }
    };

    window.closeScanModal = () => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
      delete window.validateQRInput;
      delete window.closeScanModal;
    };

    // Focus en el input
    setTimeout(() => {
      const input = document.getElementById('qr-input');
      if (input) {
        input.focus();
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            validateQRInput();
          }
        });
      }
    }, 100);

    return modal;
  }
}

// Crear instancia global del validador
const ticketValidator = new TicketValidator();

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ticketValidator;
} else {
  window.TicketValidator = ticketValidator;
}
