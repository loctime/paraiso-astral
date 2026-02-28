// ===== PUSH SUBSCRIPTION - PARAÍSO ASTRAL =====

class PushSubscription {
  constructor() {
    this.subscription = null;
    this.isSupported = this.checkSupport();
    this.vapidPublicKey = null; // Se configurará desde el servidor
    this.permissionStatus = 'default';
    
    this.config = {
      events: 'Recordatorios de eventos',
      tickets: 'Confirmaciones de compra', 
      news: 'Novedades y noticias',
      marketing: 'Promociones especiales',
      system: 'Actualizaciones del sistema'
    };
  }

  // ===== VERIFICACIÓN DE SOPORTE =====
  checkSupport() {
    return 'serviceWorker' in navigator && 
           'PushManager' in window && 
           'Notification' in window &&
           'showNotification' in ServiceWorkerRegistration.prototype;
  }

  // ===== ESTADO DE PERMISOS =====
  async getPermissionStatus() {
    if (!this.isSupported) {
      return 'unsupported';
    }

    this.permissionStatus = Notification.permission;
    return this.permissionStatus;
  }

  // ===== SOLICITAR PERMISO CONTEXTUAL =====
  async requestPermission(context = 'events') {
    if (!this.isSupported) {
      throw new Error('Push notifications no soportadas');
    }

    const currentPermission = await this.getPermissionStatus();
    if (currentPermission === 'granted') {
      return true;
    }

    if (currentPermission === 'denied') {
      throw new Error('Permiso denegado. Debes habilitar las notificaciones en la configuración del navegador.');
    }

    // Mostrar diálogo contextual explicando por qué se necesitan las notificaciones
    const granted = await this.showPermissionDialog(context);
    
    if (granted) {
      this.permissionStatus = 'granted';
      return true;
    } else {
      this.permissionStatus = 'denied';
      return false;
    }
  }

  showPermissionDialog(context) {
    return new Promise((resolve) => {
      const modal = this.createPermissionModal(context);
      document.body.appendChild(modal);

      // Auto-focus en el botón de permitir
      setTimeout(() => {
        const allowBtn = document.getElementById('push-allow-btn');
        if (allowBtn) allowBtn.focus();
      }, 100);

      // Manejar respuesta
      window.handlePushPermission = async (granted) => {
        document.body.removeChild(modal);
        delete window.handlePushPermission;
        delete window.handlePushDeny;

        if (granted) {
          try {
            const permission = await Notification.requestPermission();
            resolve(permission === 'granted');
          } catch (error) {
            console.error('Error solicitando permiso:', error);
            resolve(false);
          }
        } else {
          resolve(false);
        }
      };

      window.handlePushDeny = () => {
        handlePushPermission(false);
      };
    });
  }

  createPermissionModal(context) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.innerHTML = `
      <div class="bottom-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-title">🔔 Notificaciones Push</div>
        <div style="padding: 1rem 0;">
          <div style="margin-bottom: 1rem;">
            <p style="color: var(--text); line-height: 1.4;">
              Para recibir ${this.config[context] || 'notificaciones'} de Paraíso Astral, 
              necesitamos tu permiso para enviarte notificaciones push.
            </p>
          </div>
          
          <div style="background: var(--bg-glass); border-radius: var(--radius); padding: 0.75rem; margin-bottom: 1rem;">
            <h4 style="font-size: 0.85rem; margin-bottom: 0.5rem; color: var(--primary);">¿Qué recibirás:</h4>
            <ul style="font-size: 0.8rem; color: var(--text-muted); margin: 0; padding-left: 1.2rem;">
              <li>${this.config[context] || 'Notificaciones relevantes'}</li>
              <li>Recordatorios importantes</li>
              <li>Actualizaciones de estado</li>
            </ul>
          </div>
          
          <div style="display: flex; gap: 0.5rem;">
            <button id="push-allow-btn" class="btn btn-primary" style="flex: 1" onclick="handlePushPermission(true)">
              Permitir
            </button>
            <button class="btn btn-ghost" style="flex: 1" onclick="handlePushDeny()">
              Ahora no
            </button>
          </div>
        </div>
      </div>
    `;

    return modal;
  }

  // ===== SUSCRIPCIÓN =====
  async subscribe() {
    if (!this.isSupported) {
      throw new Error('Push notifications no soportadas');
    }

    const permission = await this.getPermissionStatus();
    if (permission !== 'granted') {
      throw new Error('Permiso no concedido');
    }

    try {
      // Obtener service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Configurar VAPID (en producción esto vendría del servidor)
      if (!this.vapidPublicKey) {
        // Clave de demostración - EN PRODUCCIÓN USAR CLAVE REAL DEL SERVIDOR
        this.vapidPublicKey = 'BLjFZ1K8mXqL9vYm9wQ4rT7uP2sW5eR8yA3bC6dE9fG2hI5jK8lM0nO3pQ6rS9tV2wX5z';
      }

      // Suscribirse
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      this.subscription = subscription;

      // Guardar suscripción
      await this.saveSubscription(subscription);

      // Enviar al servidor
      await this.sendSubscriptionToServer(subscription);

      return subscription;

    } catch (error) {
      console.error('Error en suscripción:', error);
      throw new Error('Error al suscribirse: ' + error.message);
    }
  }

  // ===== GESTIÓN DE SUSCRIPCIÓN =====
  async saveSubscription(subscription) {
    try {
      if (typeof Storage !== 'undefined') {
        await Storage.setCache('push_subscription', subscription);
      }
      
      // También guardar en localStorage como fallback
      localStorage.setItem('push_subscription', JSON.stringify(subscription));
    } catch (error) {
      console.warn('Error guardando suscripción:', error);
    }
  }

  async loadSubscription() {
    try {
      // Intentar cargar desde Storage primero
      if (typeof Storage !== 'undefined') {
        const subscription = await Storage.getCache('push_subscription');
        if (subscription) {
          this.subscription = subscription;
          return subscription;
        }
      }

      // Fallback a localStorage
      const stored = localStorage.getItem('push_subscription');
      if (stored) {
        const subscription = JSON.parse(stored);
        this.subscription = subscription;
        return subscription;
      }

      return null;
    } catch (error) {
      console.warn('Error cargando suscripción:', error);
      return null;
    }
  }

  async unsubscribe() {
    if (!this.subscription) {
      return true;
    }

    try {
      await this.subscription.unsubscribe();
      this.subscription = null;

      // Limpiar almacenamiento
      if (typeof Storage !== 'undefined') {
        await Storage.deleteCache('push_subscription');
      }
      localStorage.removeItem('push_subscription');

      // Notificar al servidor
      await this.sendUnsubscriptionToServer();

      return true;
    } catch (error) {
      console.error('Error cancelando suscripción:', error);
      return false;
    }
  }

  // ===== COMUNICACIÓN CON SERVIDOR =====
  async sendSubscriptionToServer(subscription) {
    // En producción, esto sería una llamada real a tu API
    console.log('Enviando suscripción al servidor:', subscription);
    
    // Simulación de envío
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: 'Suscripción registrada' });
      }, 1000);
    });
  }

  async sendUnsubscriptionToServer() {
    // En producción, esto sería una llamada real a tu API
    console.log('Cancelando suscripción en el servidor');
    
    // Simulación
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: 'Suscripción cancelada' });
      }, 500);
    });
  }

  // ===== UTILIDADES =====
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // ===== ESTADO =====
  isSubscribed() {
    return this.subscription !== null;
  }

  getSubscriptionInfo() {
    if (!this.subscription) {
      return null;
    }

    return {
      endpoint: this.subscription.endpoint,
      keys: this.subscription.toJSON().keys,
      expirationTime: this.subscription.expirationTime
    };
  }

  // ===== PRUEBAS =====
  async testNotification() {
    if (!this.isSubscribed()) {
      throw new Error('No estás suscrito a notificaciones');
    }

    if (this.permissionStatus !== 'granted') {
      throw new Error('Permiso no concedido');
    }

    // Enviar notificación de prueba
    return new Promise((resolve, reject) => {
      try {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification('🌌 Paraíso Astral', {
            body: 'Esta es una notificación de prueba',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: 'test-notification',
            requireInteraction: false,
            actions: [
              {
                action: 'open',
                title: 'Abrir App'
              },
              {
                action: 'dismiss',
                title: 'Cerrar'
              }
            ]
          }).then(() => {
            resolve({ success: true });
          }).catch(error => {
            reject(error);
          });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // ===== CONFIGURACIÓN =====
  async updateVapidPublicKey(publicKey) {
    this.vapidPublicKey = publicKey;
    
    // Si ya hay una suscripción, actualizarla
    if (this.isSubscribed()) {
      await this.unsubscribe();
      return await this.subscribe();
    }
    
    return null;
  }

  // ===== INICIALIZACIÓN =====
  async init() {
    if (!this.isSupported) {
      console.warn('Push notifications no soportadas');
      return false;
    }

    // Cargar suscripción existente
    await this.loadSubscription();

    // Verificar si la suscripción sigue válida
    if (this.subscription) {
      const isValid = await this.validateSubscription();
      if (!isValid) {
        console.log('Suscripción inválida, creando nueva...');
        await this.subscribe();
      }
    }

    return true;
  }

  async validateSubscription() {
    if (!this.subscription) {
      return false;
    }

    try {
      // Verificar si la suscripción está activa
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      return existingSubscription !== null;
    } catch (error) {
      console.warn('Error validando suscripción:', error);
      return false;
    }
  }
}

// Crear instancia global
const pushSubscription = new PushSubscription();

// Inicializar cuando la app cargue
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', async () => {
    try {
      await pushSubscription.init();
      console.log('Push subscription inicializado');
    } catch (error) {
      console.warn('Error inicializando push subscription:', error);
    }
  });
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = pushSubscription;
} else {
  window.PushSubscription = pushSubscription;
}
