// ===== STORAGE - INDEXEDDB WRAPPER - PARAÍSO ASTRAL =====

class Storage {
  constructor() {
    this.dbName = 'ParaisoAstralDB';
    this.version = 1;
    this.db = null;
    
    this.stores = {
      tickets: 'tickets',
      events: 'events',
      users: 'users',
      syncQueue: 'syncQueue',
      cache: 'cache'
    };
  }

  // ===== INICIALIZACIÓN =====
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Crear stores
        if (!db.objectStoreNames.contains(this.stores.tickets)) {
          const ticketStore = db.createObjectStore(this.stores.tickets, { keyPath: 'id' });
          ticketStore.createIndex('eventId', 'eventId', { unique: false });
          ticketStore.createIndex('userId', 'userId', { unique: false });
          ticketStore.createIndex('status', 'status', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(this.stores.events)) {
          const eventStore = db.createObjectStore(this.stores.events, { keyPath: 'id' });
          eventStore.createIndex('status', 'status', { unique: false });
          eventStore.createIndex('date', 'date', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(this.stores.users)) {
          const userStore = db.createObjectStore(this.stores.users, { keyPath: 'id' });
          userStore.createIndex('email', 'email', { unique: true });
        }
        
        if (!db.objectStoreNames.contains(this.stores.syncQueue)) {
          const syncStore = db.createObjectStore(this.stores.syncQueue, { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('action', 'action', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(this.stores.cache)) {
          const cacheStore = db.createObjectStore(this.stores.cache, { keyPath: 'key' });
          cacheStore.createIndex('expiry', 'expiry', { unique: false });
        }
      };
    });
  }

  // ===== UTILIDADES =====
  getStore(storeName, mode = 'readonly') {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.transaction([storeName], mode).objectStore(storeName);
  }

  // ===== TICKETS =====
  async saveTicket(ticket) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(this.stores.tickets, 'readwrite');
      const request = store.put(ticket);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getTicket(id) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(this.stores.tickets);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getTicketsByEvent(eventId) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(this.stores.tickets);
      const index = store.index('eventId');
      const request = index.getAll(eventId);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getTicketsByUser(userId) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(this.stores.tickets);
      const index = store.index('userId');
      const request = index.getAll(userId);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTicket(id) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(this.stores.tickets, 'readwrite');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ===== EVENTOS =====
  async cacheEvents(events) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(this.stores.events, 'readwrite');
      const transaction = store.transaction;
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      
      events.forEach(event => {
        store.put(event);
      });
    });
  }

  async getCachedEvents() {
    return new Promise((resolve, reject) => {
      const store = this.getStore(this.stores.events);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedEvent(id) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(this.stores.events);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ===== USUARIOS =====
  async saveUser(user) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(this.stores.users, 'readwrite');
      const request = store.put(user);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getUser(id) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(this.stores.users);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(this.stores.users);
      const index = store.index('email');
      const request = index.get(email);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ===== SINCRONIZACIÓN =====
  async addToSyncQueue(action, data) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(this.stores.syncQueue, 'readwrite');
      const item = {
        action,
        data,
        timestamp: Date.now(),
        id: Date.now() + Math.random()
      };
      
      const request = store.put(item);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue() {
    return new Promise((resolve, reject) => {
      const store = this.getStore(this.stores.syncQueue);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromSyncQueue(id) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(this.stores.syncQueue, 'readwrite');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearSyncQueue() {
    return new Promise((resolve, reject) => {
      const store = this.getStore(this.stores.syncQueue, 'readwrite');
      const request = store.clear();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ===== CACHE GENÉRICO =====
  async setCache(key, value, ttl = 3600000) { // TTL por defecto: 1 hora
    return new Promise((resolve, reject) => {
      const store = this.getStore(this.stores.cache, 'readwrite');
      const item = {
        key,
        value,
        expiry: Date.now() + ttl
      };
      
      const request = store.put(item);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getCache(key) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(this.stores.cache);
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }
        
        // Verificar si no ha expirado
        if (Date.now() > result.expiry) {
          // Eliminar cache expirado
          this.deleteCache(key);
          resolve(null);
          return;
        }
        
        resolve(result.value);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCache(key) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(this.stores.cache, 'readwrite');
      const request = store.delete(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearExpiredCache() {
    return new Promise((resolve, reject) => {
      const store = this.getStore(this.stores.cache, 'readwrite');
      const index = store.index('expiry');
      const request = index.openCursor(IDBKeyRange.upperBound(Date.now()));
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // ===== UTILIDADES DE SINCRONIZACIÓN =====
  async syncWithServer() {
    try {
      const queue = await this.getSyncQueue();
      
      for (const item of queue) {
        try {
          await this.processSyncItem(item);
          await this.removeFromSyncQueue(item.id);
        } catch (error) {
          console.error('Error procesando item de sincronización:', error);
          // No eliminar el item, se intentará más tarde
        }
      }
      
      return { success: true, processed: queue.length };
    } catch (error) {
      return { success: false, error };
    }
  }

  async processSyncItem(item) {
    const { action, data } = item;
    
    switch (action) {
      case 'createTicket':
        // Lógica para sincronizar ticket con servidor
        break;
      case 'updateProfile':
        // Lógica para sincronizar perfil con servidor
        break;
      case 'purchaseTicket':
        // Lógica para sincronizar compra con servidor
        break;
      default:
        console.warn('Acción de sincronización desconocida:', action);
    }
  }

  // ===== LIMPIEZA =====
  async clear() {
    return new Promise((resolve, reject) => {
      const stores = Object.values(this.stores);
      const transaction = this.db.transaction(stores, 'readwrite');
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      
      stores.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        store.clear();
      });
    });
  }

  // ===== ESTADÍSTICAS =====
  async getStorageStats() {
    const stats = {};
    
    for (const storeName of Object.values(this.stores)) {
      try {
        const count = await this.getCount(storeName);
        stats[storeName] = count;
      } catch (error) {
        stats[storeName] = 0;
      }
    }
    
    return stats;
  }

  async getCount(storeName) {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName);
      const request = store.count();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Crear instancia global de Storage
const storage = new Storage();

// Inicializar cuando la app cargue
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', async () => {
    try {
      await storage.init();
      console.log('IndexedDB inicializado correctamente');
    } catch (error) {
      console.error('Error inicializando IndexedDB:', error);
    }
  });
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = storage;
} else {
  window.Storage = storage;
}
