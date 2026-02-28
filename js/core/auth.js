// ===== AUTH - AUTENTICACIÓN Y ROLES - PARAÍSO ASTRAL =====

class Auth {
  constructor() {
    this.currentUser = null;
    this.sessionTimeout = null;
    this.roles = {
      admin: ['admin', 'events:write', 'rrpp:write', 'stats:read'],
      rrpp: ['rrpp:read', 'tickets:write', 'sales:read'],
      user: ['events:read', 'tickets:read', 'profile:read']
    };
    
    this.permissions = {
      'admin': 'Acceso completo al panel administrativo',
      'events:write': 'Crear y editar eventos',
      'rrpp:write': 'Gestionar equipo RRPP',
      'stats:read': 'Ver estadísticas y reportes',
      'rrpp:read': 'Ver información RRPP',
      'tickets:write': 'Procesar ventas de tickets',
      'sales:read': 'Ver reportes de ventas',
      'events:read': 'Ver eventos',
      'tickets:read': 'Comprar tickets',
      'profile:read': 'Ver perfil propio'
    };

    this.init();
  }

  // ===== INICIALIZACIÓN =====
  init() {
    this.loadSession();
    this.setupSessionTimeout();
  }

  // ===== GESTIÓN DE SESIÓN =====
  login(credentials) {
    const { email, password } = credentials;
    
    // Simular autenticación (en producción sería una API real)
    const user = this.authenticateUser(email, password);
    
    if (user) {
      this.currentUser = user;
      this.startSession();
      this.saveSession();
      
      // Actualizar store
      if (typeof Store !== 'undefined') {
        Store.login(user);
      }
      
      return { success: true, user };
    }
    
    return { success: false, error: 'Credenciales inválidas' };
  }

  logout() {
    this.currentUser = null;
    this.clearSession();
    this.clearSessionTimeout();
    
    // Actualizar store
    if (typeof Store !== 'undefined') {
      Store.logout();
    }
    
    // Redirigir al inicio
    if (typeof Router !== 'undefined') {
      Router.push('/');
    }
  }

  // ===== AUTENTICACIÓN =====
  authenticateUser(email, password) {
    // Usuarios de demostración
    const users = [
      {
        id: 1,
        name: "Admin",
        email: "admin@paraiso-astral.com",
        password: "admin123", // En producción sería hash
        role: "admin",
        permissions: this.roles.admin,
        avatar: "👑"
      },
      {
        id: 2,
        name: "Lucas Silva",
        email: "lucas@paraiso-astral.com",
        password: "rrpp123",
        role: "rrpp",
        permissions: this.roles.rrpp,
        avatar: "🎫"
      },
      {
        id: 3,
        name: "Usuario Demo",
        email: "user@paraiso-astral.com",
        password: "user123",
        role: "user",
        permissions: this.roles.user,
        avatar: "🌟"
      }
    ];

    return users.find(u => u.email === email && u.password === password);
  }

  // ===== SESIÓN PERSISTENTE =====
  startSession() {
    const sessionStart = Date.now();
    const sessionDuration = 24 * 60 * 60 * 1000; // 24 horas
    
    this.sessionTimeout = setTimeout(() => {
      this.logout();
      toast('⏰ Sesión expirada. Por favor inicia sesión nuevamente.');
    }, sessionDuration);
    
    // Guardar tiempo de inicio
    localStorage.setItem('session_start', sessionStart.toString());
  }

  clearSessionTimeout() {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }
  }

  setupSessionTimeout() {
    const sessionStart = localStorage.getItem('session_start');
    if (sessionStart) {
      const start = parseInt(sessionStart);
      const elapsed = Date.now() - start;
      const sessionDuration = 24 * 60 * 60 * 1000; // 24 horas
      
      if (elapsed < sessionDuration) {
        // Sesión aún válida
        const remaining = sessionDuration - elapsed;
        this.sessionTimeout = setTimeout(() => {
          this.logout();
          toast('⏰ Sesión expirada. Por favor inicia sesión nuevamente.');
        }, remaining);
      } else {
        // Sesión expirada
        this.logout();
      }
    }
  }

  saveSession() {
    if (this.currentUser) {
      const sessionData = {
        user: {
          id: this.currentUser.id,
          name: this.currentUser.name,
          email: this.currentUser.email,
          role: this.currentUser.role,
          permissions: this.currentUser.permissions,
          avatar: this.currentUser.avatar
        },
        timestamp: Date.now()
      };
      localStorage.setItem('auth_session', JSON.stringify(sessionData));
    }
  }

  loadSession() {
    try {
      const sessionData = localStorage.getItem('auth_session');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        this.currentUser = parsed.user;
        
        // Actualizar store si está disponible
        if (typeof Store !== 'undefined') {
          Store.login(this.currentUser);
        }
      }
    } catch (e) {
      console.warn('Error al cargar sesión:', e);
      this.clearSession();
    }
  }

  clearSession() {
    localStorage.removeItem('auth_session');
    localStorage.removeItem('session_start');
  }

  // ===== VERIFICACIÓN DE ESTADO =====
  isLoggedIn() {
    return this.currentUser !== null;
  }

  isAdmin() {
    return this.currentUser?.role === 'admin';
  }

  isRRPP() {
    return this.currentUser?.role === 'rrpp';
  }

  getCurrentUser() {
    return this.currentUser;
  }

  // ===== PERMISOS =====
  hasPermission(permission) {
    if (!this.currentUser) return false;
    return this.currentUser.permissions.includes(permission);
  }

  hasRole(role) {
    return this.currentUser?.role === role;
  }

  hasAnyPermission(permissions) {
    if (!this.currentUser) return false;
    return permissions.some(permission => this.currentUser.permissions.includes(permission));
  }

  getPermissions() {
    return this.currentUser?.permissions || [];
  }

  getPermissionDescription(permission) {
    return this.permissions[permission] || 'Permiso desconocido';
  }

  // ===== GUARDS =====
  requireAuth() {
    if (!this.isLoggedIn()) {
      toast('🔐 Debes iniciar sesión para acceder');
      if (typeof Router !== 'undefined') {
        Router.push('/');
      }
      return false;
    }
    return true;
  }

  requireRole(role) {
    if (!this.isLoggedIn()) {
      toast('🔐 Debes iniciar sesión para acceder');
      if (typeof Router !== 'undefined') {
        Router.push('/');
      }
      return false;
    }
    
    if (!this.hasRole(role)) {
      toast('⚠️ No tienes los permisos necesarios');
      return false;
    }
    
    return true;
  }

  requirePermission(permission) {
    if (!this.isLoggedIn()) {
      toast('🔐 Debes iniciar sesión para acceder');
      if (typeof Router !== 'undefined') {
        Router.push('/');
      }
      return false;
    }
    
    if (!this.hasPermission(permission)) {
      toast('⚠️ No tienes los permisos necesarios');
      return false;
    }
    
    return true;
  }

  // ===== UTILIDADES =====
  getUserDisplayName() {
    if (!this.currentUser) return '';
    return this.currentUser.name;
  }

  getUserAvatar() {
    if (!this.currentUser) return '👤';
    return this.currentUser.avatar || '👤';
  }

  getUserRole() {
    if (!this.currentUser) return '';
    return this.currentUser.role;
  }

  getRoleDisplayName(role) {
    const roleNames = {
      admin: 'Administrador',
      rrpp: 'RRPP',
      user: 'Usuario'
    };
    return roleNames[role] || role;
  }

  // ===== INTERFAZ =====
  createLoginModal() {
    return `
      <div class="modal-overlay" id="modal-login">
        <div class="bottom-sheet">
          <div class="sheet-handle"></div>
          <div class="sheet-title">🔐 Iniciar Sesión</div>
          
          <form id="login-form" style="display:flex;flex-direction:column;gap:1rem">
            <div class="form-group">
              <label>Email</label>
              <input type="email" class="input" id="login-email" placeholder="tu@email.com" required>
            </div>
            
            <div class="form-group">
              <label>Contraseña</label>
              <input type="password" class="input" id="login-password" placeholder="••••••••" required>
            </div>
            
            <button type="submit" class="btn btn-primary btn-full">
              Iniciar Sesión
            </button>
          </form>
          
          <div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--border)">
            <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem">Usuarios de demo:</div>
            <div style="font-size:0.75rem;line-height:1.4">
              <div>👑 Admin: admin@paraiso-astral.com / admin123</div>
              <div>🎫 RRPP: lucas@paraiso-astral.com / rrpp123</div>
              <div>🌟 User: user@paraiso-astral.com / user123</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  setupLoginForm() {
    const form = document.getElementById('login-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        const result = this.login({ email, password });
        
        if (result.success) {
          toast(`✅ ¡Bienvenido ${result.user.name}!`);
          closeModal('modal-login');
        } else {
          toast('❌ Email o contraseña incorrectos');
        }
      });
    }
  }
}

// Crear instancia global de Auth
const auth = new Auth();

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = auth;
} else {
  window.Auth = auth;
}
